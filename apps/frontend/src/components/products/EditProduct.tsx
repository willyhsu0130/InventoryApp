import { useImperativeHandle, useState, useMemo, type FC, type Ref } from "react";
import { Plus, Settings, Trash2 } from "lucide-react";
import { useProductCatalog, useVariant, useInventoryCatalog } from "@/hooks/useContexts";
import { EditModal } from "../EditModal";
import { InlineInput } from "../InlineInput";
import { ConfigOptionsEditor } from "./ConfigOptionEditor";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { CONTROL_INPUT, ERROR_PANEL, FIELD_LABEL } from "@/lib/styles";
import {
    createEmptyProductDraft,
    isUnsavedProduct,
    type KatanaProductConfig,
    type KatanaProductDraft,
    type VariantConfigAttribute,
    type ProductVariant,
    type CreateVariantInput,
    type UpdateVariantInput,
} from "@my-inventory-app/shared";

import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { productService } from "@/services/productService";

const UOM_MAX_LENGTH = 7;

export interface EditProductHandle {
    submit: () => Promise<void>;
}

export interface LocalVariantDraft {
    id?: number;
    sku?: string | null;
    sales_price?: number | null;
    purchase_price?: number | null;
    config_attributes: VariantConfigAttribute[];
}

export interface EditProductProps {
    id?: number | null;
    onSavingChange?: (isSaving: boolean) => void;
    onCreated?: (productId: number) => void;
    ref?: Ref<EditProductHandle>;
}

export const EditProduct: FC<EditProductProps> = ({
    id,
    onSavingChange,
    onCreated,
    ref,
}) => {
    const isCreating = id == null || isUnsavedProduct(id);
    const [modalOpen, setModalOpen] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [draftConfigs, setDraftConfigs] = useState<KatanaProductConfig[]>([]);
    const [formError, setFormError] = useState<string | null>(null);

    // Domain Contexts
    const { products, editProduct, refetchProducts } = useProductCatalog();
    const { variants: allVariants, createVariant, editVariant, deleteVariant, refetchVariants } = useVariant();
    const { inventoryItems } = useInventoryCatalog();

    const product = id != null ? products.get(id) : undefined;

    // Form State
    const [formProduct, setFormProduct] = useState<KatanaProductDraft>(() => {
        if (product) {
            return {
                id: product.id,
                name: product.name,
                uom: product.uom ?? "pcs",
                category_name: product.category_name,
                default_supplier_id: product.default_supplier_id,
                additional_info: product.additional_info,
                purchase_uom: product.purchase_uom,
                purchase_uom_conversion_rate: product.purchase_uom_conversion_rate,
                is_sellable: product.is_sellable,
                is_purchasable: product.is_purchasable,
                is_producible: product.is_producible,
                is_auto_assembly: product.is_auto_assembly,
                batch_tracked: product.batch_tracked,
                serial_tracked: product.serial_tracked,
                operations_in_sequence: product.operations_in_sequence,
                configs: product.configs ?? [],
            };
        }
        return createEmptyProductDraft();
    });

    // 1. Freeze initial variant ID sequence on component mount
    const [initialVariantOrder, setInitialVariantOrder] = useState<number[]>(() => {
        if (isCreating || id == null) return [];
        return Array.from(allVariants.values())
            .filter((v: ProductVariant) => v.product_id === id)
            .map((v) => v.id);
    });

    // In-flight edits for existing variants (keyed by variant id)
    const [localEdits, setLocalEdits] = useState<Map<number, Partial<LocalVariantDraft>>>(() => new Map());

    // Local draft rows for new products or pending unsaved variant additions
    const [newDraftVariants, setNewDraftVariants] = useState<LocalVariantDraft[]>(() => {
        if (isCreating) {
            return [{ config_attributes: [] }];
        }
        return [];
    });

    // 2. Active list preserves the initial frozen ordering
    const activeVariants = useMemo<LocalVariantDraft[]>(() => {
        if (isCreating || id == null) {
            return newDraftVariants;
        }

        const savedRows: LocalVariantDraft[] = Array.from(allVariants.values())
            .filter((v: ProductVariant) => v.product_id === id)
            .map((v) => {
                const patch = localEdits.get(v.id) ?? {};
                return {
                    id: v.id,
                    sku: patch.sku !== undefined ? patch.sku : (v.sku ?? ""),
                    sales_price: patch.sales_price !== undefined ? patch.sales_price : (v.sales_price ?? 0),
                    purchase_price: patch.purchase_price !== undefined ? patch.purchase_price : (v.purchase_price ?? 0),
                    config_attributes: patch.config_attributes !== undefined
                        ? patch.config_attributes
                        : (Array.isArray(v.config_attributes) ? v.config_attributes : []),
                };
            })
            // Sort by the initial frozen order; any newly added saved variants sit at the end
            .sort((a, b) => {
                const idxA = a.id ? initialVariantOrder.indexOf(a.id) : -1;
                const idxB = b.id ? initialVariantOrder.indexOf(b.id) : -1;
                if (idxA === -1 && idxB === -1) return 0;
                if (idxA === -1) return 1;
                if (idxB === -1) return -1;
                return idxA - idxB;
            });

        return [...savedRows, ...newDraftVariants];
    }, [allVariants, id, initialVariantOrder, isCreating, localEdits, newDraftVariants]);

    // Variant change handler
    const commitVariantChange = async (
        targetVariant: LocalVariantDraft,
        draftIndex: number,
        patch: Partial<LocalVariantDraft>
    ) => {
        const updated: LocalVariantDraft = { ...targetVariant, ...patch };

        // 1. Create Mode: update draft state in place
        if (isCreating) {
            setNewDraftVariants((prev) => {
                const next = [...prev];
                next[draftIndex] = updated;
                return next;
            });
            return;
        }

        // 2. Edit Mode: Unsaved new draft row
        if (targetVariant.id === undefined) {
            const hasUnfilledConfigs = updated.config_attributes.some(
                (attr) => !attr.config_value || attr.config_value.trim() === ""
            );

            if (hasUnfilledConfigs) {
                setNewDraftVariants((prev) => {
                    const next = [...prev];
                    next[draftIndex] = updated;
                    return next;
                });
                return;
            }

            if (id == null) return;

            onSavingChange?.(true);
            try {
                const input: CreateVariantInput = {
                    product_id: id,
                    sku: updated.sku?.trim() ? updated.sku.trim() : null,
                    sales_price: updated.sales_price ?? 0,
                    purchase_price: updated.purchase_price ?? 0,
                    config_attributes: updated.config_attributes,
                };
                const created = await createVariant(input);
                if (created?.id) {
                    // Append new variant to the frozen ordering so it stays in place
                    setInitialVariantOrder((prev) => [...prev, created.id]);
                }
                setNewDraftVariants((prev) => prev.filter((_, idx) => idx !== draftIndex));
                await refetchVariants();
            } catch (error) {
                setFormError(error instanceof Error ? error.message : "儲存款式失敗。");
            } finally {
                onSavingChange?.(false);
            }
        } else {
            // 3. Edit Mode: Existing row update
            setLocalEdits((prev) => {
                const next = new Map(prev);
                next.set(targetVariant.id!, {
                    ...next.get(targetVariant.id!),
                    ...patch,
                });
                return next;
            });

            onSavingChange?.(true);
            try {
                const updateInput: UpdateVariantInput = {
                    sku: updated.sku ?? undefined,
                    sales_price: updated.sales_price ?? undefined,
                    purchase_price: updated.purchase_price ?? undefined,
                    config_attributes: updated.config_attributes,
                };
                await editVariant(targetVariant.id, updateInput);
                await refetchVariants();
            } catch (error) {
                setFormError(error instanceof Error ? error.message : "儲存款式失敗。");
            } finally {
                onSavingChange?.(false);
            }
        }
    };

    const handleFieldChange = (
        field: keyof KatanaProductDraft,
        value: string | boolean
    ) => {
        setFormError(null);
        setFormProduct((prev) => ({ ...prev, [field]: value }));
    };

    const commitProductPatch = async (patch: Partial<KatanaProductDraft> = {}) => {
        const nextProduct: KatanaProductDraft = {
            ...formProduct,
            ...patch,
        };

        setFormProduct(nextProduct);

        if (isCreating || !product) return;

        const hasChanges =
            nextProduct.name !== product.name ||
            nextProduct.uom !== product.uom ||
            nextProduct.batch_tracked !== product.batch_tracked ||
            nextProduct.serial_tracked !== product.serial_tracked;

        if (!hasChanges) return;

        onSavingChange?.(true);
        try {
            await editProduct(nextProduct);
            await refetchProducts();
        } catch (err) {
            console.error("Failed auto-save:", err);
            setFormError(err instanceof Error ? err.message : "自動儲存產品失敗。");
        } finally {
            onSavingChange?.(false);
        }
    };

    const handleCommit = () => commitProductPatch();

    const validateDraft = (draft: KatanaProductDraft): string | null => {
        if (!draft.name.trim()) return "請輸入產品名稱。";
        if (draft.uom.trim().length > UOM_MAX_LENGTH) {
            return `單位 (UOM) 不可超過 ${UOM_MAX_LENGTH} 個字元。`;
        }
        if (activeVariants.length === 0) return "請至少設定一個款式。";
        return null;
    };

    const handleCreate = async () => {
        if (!isCreating) return;

        const validationError = validateDraft(formProduct);
        if (validationError) {
            setFormError(validationError);
            return;
        }

        setFormError(null);
        setIsSaving(true);
        onSavingChange?.(true);

        try {
            const result = await productService.createProductWithVariants(
                formProduct,
                activeVariants
            );

            await Promise.all([refetchProducts(), refetchVariants()]);
            onCreated?.(result.id);
        } catch (err) {
            console.error("Failed to create product:", err);
            const msg = err instanceof Error ? err.message : "建立產品失敗。";

            if (msg.includes("products_name_unique_idx")) {
                setFormError("產品名稱已存在，請使用不同的名稱。");
            } else if (msg.includes("product_variants_sku_key")) {
                setFormError("SKU 已存在，請確認各款式 SKU 未重複。");
            } else {
                setFormError(msg);
            }
        } finally {
            setIsSaving(false);
            onSavingChange?.(false);
        }
    };

    useImperativeHandle(ref, () => ({ submit: handleCreate }));

    const handleSaveModal = async () => {
        if (JSON.stringify(formProduct.configs) === JSON.stringify(draftConfigs)) {
            setModalOpen(false);
            return;
        }

        if (isCreating) {
            setFormProduct((prev) => ({ ...prev, configs: draftConfigs }));
            setModalOpen(false);
            return;
        }

        setIsSaving(true);
        try {
            const updatedProduct = { ...formProduct, configs: draftConfigs };
            setFormProduct(updatedProduct);
            await editProduct(updatedProduct);
            await refetchProducts();
            setModalOpen(false);
        } catch (err) {
            console.error("Failed to save configs", err);
            setFormError("更新規格失敗。");
        } finally {
            setIsSaving(false);
        }
    };

    const handleOpenModal = () => {
        setDraftConfigs([...formProduct.configs]);
        setModalOpen(true);
    };

    const handleTrackingModeChange = (val: string) => {
        const isBatch = val === "batch";
        setFormError(null);
        commitProductPatch({
            batch_tracked: isBatch,
            serial_tracked: isBatch ? formProduct.serial_tracked : false,
        });
    };

    const handleVariantConfigChange = (
        variant: LocalVariantDraft,
        draftIndex: number,
        configName: string,
        newValue: string
    ) => {
        const currentAttributes = variant.config_attributes ?? [];
        const existingIndex = currentAttributes.findIndex(
            (attr) => attr.config_name === configName
        );

        let updatedAttributes: VariantConfigAttribute[];

        if (existingIndex >= 0) {
            updatedAttributes = [...currentAttributes];
            updatedAttributes[existingIndex] = {
                config_name: configName,
                config_value: newValue,
            };
        } else {
            updatedAttributes = [
                ...currentAttributes,
                { config_name: configName, config_value: newValue },
            ];
        }

        commitVariantChange(variant, draftIndex, {
            config_attributes: updatedAttributes,
        });
    };

    const handleAddVariant = () => {
        const defaultAttributes: VariantConfigAttribute[] = formProduct.configs.map(
            (config) => ({
                config_name: config.name,
                config_value: "",
            })
        );

        const newVariantDraft: LocalVariantDraft = {
            sku: "",
            sales_price: 0,
            config_attributes: defaultAttributes,
        };

        setNewDraftVariants((prev) => [...prev, newVariantDraft]);
    };

    const handleDeleteVariant = async (variant: LocalVariantDraft, draftIndex: number) => {
        if (activeVariants.length <= 1) {
            setFormError("產品至少需要設定一個款式。");
            return;
        }

        if (variant.id === undefined) {
            setNewDraftVariants((prev) => prev.filter((_, idx) => idx !== draftIndex));
            return;
        }

        setInitialVariantOrder((prev) => prev.filter((item) => item !== variant.id));
        setLocalEdits((prev) => {
            const next = new Map(prev);
            next.delete(variant.id!);
            return next;
        });

        onSavingChange?.(true);
        try {
            await deleteVariant(variant.id);
            await refetchVariants();
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "刪除款式失敗。");
        } finally {
            onSavingChange?.(false);
        }
    };

    const hasUnsavedVariant = !isCreating && newDraftVariants.length > 0;

    return (
        <div className="flex flex-col gap-y-5">
            <EditModal
                title="編輯產品款式"
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSaveModal}
                isSaving={isSaving}
            >
                <ConfigOptionsEditor
                    configs={draftConfigs}
                    onChange={setDraftConfigs}
                />
            </EditModal>

            {formError && <div className={ERROR_PANEL}>{formError}</div>}

            {/* Top Product Details Form */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-y-1 md:col-span-2">
                    <label className={FIELD_LABEL}>產品名稱</label>
                    <input
                        type="text"
                        value={formProduct.name}
                        onChange={(e) => handleFieldChange("name", e.target.value)}
                        onBlur={handleCommit}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        }}
                        placeholder="例: 精品咖啡豆"
                        className={CONTROL_INPUT}
                    />
                </div>

                <div className="flex flex-col gap-y-1">
                    <label className={FIELD_LABEL}>單位 (UOM)</label>
                    <input
                        type="text"
                        maxLength={UOM_MAX_LENGTH}
                        value={formProduct.uom ?? ""}
                        onChange={(e) => handleFieldChange("uom", e.target.value)}
                        onBlur={handleCommit}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        }}
                        placeholder="例如: pcs, box"
                        className={CONTROL_INPUT}
                    />
                </div>

                <div className="flex flex-col gap-y-1 md:col-span-3">
                    <label className={FIELD_LABEL}>庫存追蹤模式</label>
                    <RadioGroup
                        className="flex flex-row space-x-6 pt-1"
                        value={formProduct.batch_tracked ? "batch" : "none"}
                        onValueChange={handleTrackingModeChange}
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem id="h1" value="none" />
                            <Label htmlFor="h1" className="text-sm font-normal text-foreground cursor-pointer">
                                不需要分類
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem id="h2" value="batch" />
                            <Label htmlFor="h2" className="text-sm font-normal text-foreground cursor-pointer">
                                以批次 / 日期分類
                            </Label>
                        </div>
                    </RadioGroup>
                </div>
            </div>

            {/* Configuration Controls */}
            <div className="pt-2">
                {formProduct.configs.length > 0 ? (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleOpenModal}
                        className="w-full sm:w-auto"
                    >
                        調整產品規格
                    </Button>
                ) : (
                    <div className="flex items-center gap-x-3 text-sm text-muted-foreground">
                        <input
                            id="hasVariantsCheckbox"
                            checked={modalOpen}
                            onChange={(e) => e.target.checked && handleOpenModal()}
                            className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                            type="checkbox"
                        />
                        <label htmlFor="hasVariantsCheckbox" className="cursor-pointer text-foreground">
                            這個產品有不只一種款式嗎？（點擊設定款式規格）
                        </label>
                    </div>
                )}
            </div>

            {/* Variants Table */}
            <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-left text-sm text-foreground">
                    <thead className="bg-muted text-muted-foreground font-medium text-xs uppercase tracking-wider border-b border-border">
                        <tr>
                            {formProduct.configs.length > 0 ? (
                                formProduct.configs.map((config) => (
                                    <th key={config.name} className="py-3 px-4">
                                        {config.name}
                                    </th>
                                ))
                            ) : (
                                <th className="py-3 px-4">款式</th>
                            )}
                            <th className="py-3 px-4">SKU</th>
                            <th className="py-3 px-4 text-right">銷售價格 ($)</th>
                            {!isCreating && <th className="py-3 px-4 text-right">庫存量</th>}
                            <th className="py-3 px-4 text-right w-10">
                                <Settings className="w-4 h-4 ml-auto" />
                            </th>
                        </tr>
                    </thead>
                    <tbody className="font-mono text-xs">
                        {activeVariants.map((variant, index) => {
                            const draftIndex = variant.id === undefined
                                ? (isCreating ? index : index - (activeVariants.length - newDraftVariants.length))
                                : -1;

                            const currentStock =
                                variant.id != null
                                    ? inventoryItems.get(variant.id)?.quantity_in_stock ?? 0
                                    : 0;

                            return (
                                <tr key={variant.id ?? `draft-${index}`} className="border-b border-border/60">
                                    {formProduct.configs.length > 0 ? (
                                        formProduct.configs.map((config) => {
                                            const value = variant.config_attributes?.find(
                                                (attr) => attr.config_name === config.name
                                            )?.config_value;

                                            return (
                                                <td className="py-2.5 px-4 font-sans font-medium text-foreground" key={config.name}>
                                                    <Select
                                                        value={value || undefined}
                                                        onValueChange={(selectedVal) =>
                                                            selectedVal &&
                                                            handleVariantConfigChange(variant, draftIndex, config.name, selectedVal)
                                                        }
                                                    >
                                                        <SelectTrigger className="w-full h-8 text-xs bg-background">
                                                            <SelectValue placeholder={`選擇${config.name}...`} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectGroup>
                                                                {config.values.map((val) => (
                                                                    <SelectItem key={val} value={val} className="text-xs">
                                                                        {val}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectGroup>
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                            );
                                        })
                                    ) : (
                                        <td className="py-2.5 px-4 font-sans text-muted-foreground">預設款式</td>
                                    )}

                                    <td className="py-2.5 px-4">
                                        <InlineInput
                                            type="text"
                                            value={variant.sku ?? ""}
                                            className="w-full cursor-text rounded border border-input bg-background px-2 py-1 text-left text-foreground transition-colors hover:bg-muted focus:border-ring focus:outline-none"
                                            onCommit={(newSku) => commitVariantChange(variant, draftIndex, { sku: newSku })}
                                        />
                                    </td>

                                    <td className="py-2.5 px-4 text-right">
                                        <InlineInput
                                            type="number"
                                            value={variant.sales_price ?? 0}
                                            formatter={(val) => `$${val.toFixed(2)}`}
                                            onCommit={(newPrice) =>
                                                commitVariantChange(variant, draftIndex, { sales_price: newPrice })
                                            }
                                        />
                                    </td>

                                    {!isCreating && (
                                        <td className="py-2.5 px-4 text-right">
                                            <span className="font-mono text-emerald-400">
                                                {currentStock.toLocaleString()}
                                            </span>
                                        </td>
                                    )}

                                    <td className="py-2.5 px-4 text-right">
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteVariant(variant, draftIndex)}
                                            className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                                            title="刪除款式"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <Button
                    type="button"
                    variant="ghost"
                    onClick={handleAddVariant}
                    disabled={hasUnsavedVariant}
                    className="w-full justify-center rounded-t-none text-xs text-muted-foreground hover:bg-muted hover:text-foreground border-t border-border disabled:opacity-50"
                >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    {hasUnsavedVariant ? "請先完成目前款式的設定" : "新增款式選項"}
                </Button>
            </div>
        </div>
    );
};