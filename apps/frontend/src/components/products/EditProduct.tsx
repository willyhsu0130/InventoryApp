import { useImperativeHandle, useState } from "react";
import { Plus, Settings, Trash2 } from "lucide-react";
import { useInventoryCatalog, useProductCatalog } from "@/hooks/useContexts";
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
    syncDraftVariantsToConfigs,
    type KatanaProductConfig,
    type KatanaProductDraft,
    type KatanaProductDraftVariant,
    type KatanaVariantConfigAttribute,
} from "@/models/katana/productVariant";

import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

/** Max length Katana enforces on `uom` and `purchase_uom`. */
const UOM_MAX_LENGTH = 7;

export interface EditProductHandle {
    submit: () => Promise<void>;
}

interface EditProductProps {
    id: number;
    onSavingChange?: (isSaving: boolean) => void;
    /** Called with the new product id once a draft has been created. */
    onCreated?: (productId: number) => void;
    ref?: React.Ref<EditProductHandle>;
}

export const EditProduct = ({ id, onSavingChange, onCreated, ref }: EditProductProps) => {
    const isCreating = isUnsavedProduct(id);

    const [modalOpen, setModalOpen] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState(false);
    const [draftConfigs, setDraftConfigs] = useState<KatanaProductConfig[]>([]);
    const [formError, setFormError] = useState<string | null>(null);

    // Contexts
    const {
        products,
        editProduct,
        editVariant,
        createVariant,
        createProduct,
        refetchProducts,
        deleteVariant,
    } = useProductCatalog();

    const product = products.get(id);
    const [formProduct, setproduct] = useState<KatanaProductDraft>(
        () => products.get(id) ?? createEmptyProductDraft()
    );
    const { inventory } = useInventoryCatalog();

    /**
     * Persist variant changes:
     * - If unsaved draft row (id === undefined): calls POST /variants when first modified.
     * - If existing saved row (id !== undefined): calls PATCH /variants/{id}.
     */
    const commitVariantChange = async (
        variantIndex: number,
        patch: Partial<KatanaProductDraftVariant>
    ) => {
        let updatedVariant: KatanaProductDraftVariant | null = null;
        let previousVariant: KatanaProductDraftVariant | null = null;

        setproduct((prev) => {
            previousVariant = prev.variants[variantIndex] ?? null;
            if (!previousVariant) return prev;

            updatedVariant = { ...previousVariant, ...patch };
            const nextVariants = [...prev.variants];
            nextVariants[variantIndex] = updatedVariant;

            return { ...prev, variants: nextVariants };
        });

        if (isCreating || !updatedVariant) return;

        const currentTarget = updatedVariant as KatanaProductDraftVariant;

        // Check if configs are all selected before calling POST /variants
        const hasUnfilledConfigs = currentTarget.config_attributes.some(
            (attr) => !attr.config_value || attr.config_value.trim() === ""
        );

        // If it's a new row without an ID and options are still unselected, keep it local only
        if (currentTarget.id === undefined && hasUnfilledConfigs) {
            return;
        }

        onSavingChange?.(true);
        try {
            if (currentTarget.id === undefined) {
                // 1. All required dropdowns picked -> POST /variants
                const created = await createVariant(currentTarget, id);

                setproduct((prev) => {
                    const nextVariants = [...prev.variants];
                    nextVariants[variantIndex] = {
                        ...currentTarget,
                        id: created.id,
                    };
                    return { ...prev, variants: nextVariants };
                });
            } else {
                // 2. Existing Katana variant -> PATCH /variants/{id}
                await editVariant({
                    ...currentTarget,
                    id: currentTarget.id,
                    product_id: id,
                });
            }

            await refetchProducts();
        } catch (error) {
            if (previousVariant) {
                setproduct((prev) => {
                    const nextVariants = [...prev.variants];
                    nextVariants[variantIndex] = previousVariant!;
                    return { ...prev, variants: nextVariants };
                });
            }
            setFormError(error instanceof Error ? error.message : "儲存款式失敗。");
        } finally {
            onSavingChange?.(false);
        }
    };

    const handleFieldChange = (
        field: keyof KatanaProductDraft,
        value: string | boolean
    ) => {
        setFormError(null);
        setproduct((prev) => ({ ...prev, [field]: value }));
    };

    const commitProductPatch = async (patch: Partial<KatanaProductDraft> = {}) => {
        let nextProduct: KatanaProductDraft;

        setproduct((prev) => {
            nextProduct = { ...prev, ...patch };
            return nextProduct;
        });

        if (isCreating || !product) return;

        const hasChanges =
            nextProduct!.name !== product.name ||
            nextProduct!.uom !== product.uom ||
            nextProduct!.batch_tracked !== product.batch_tracked ||
            nextProduct!.serial_tracked !== product.serial_tracked;

        if (!hasChanges) return;

        onSavingChange?.(true);
        try {
            await editProduct(nextProduct!);
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
        if (draft.variants.length === 0) return "請至少設定一個款式。";
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
            const created = await createProduct(formProduct);
            await refetchProducts();
            onCreated?.(created.id);
        } catch (err) {
            console.error("Failed to create product:", err);
            setFormError(err instanceof Error ? err.message : "建立產品失敗。");
        } finally {
            setIsSaving(false);
            onSavingChange?.(false);
        }
    };

    useImperativeHandle(ref, () => ({ submit: handleCreate }));

    const handleSaveModal = async () => {
        if (!hasConfigChanges(formProduct.configs, draftConfigs)) {
            setModalOpen(false);
            return;
        }

        const syncedVariants = syncDraftVariantsToConfigs(draftConfigs, formProduct.variants);

        if (isCreating) {
            setproduct((prev) => ({
                ...prev,
                configs: draftConfigs,
                variants: syncedVariants,
            }));
            setModalOpen(false);
            return;
        }

        setIsSaving(true);
        try {
            const updatedProduct = {
                ...formProduct,
                configs: draftConfigs,
                variants: syncedVariants,
            };

            setproduct(updatedProduct);
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

    const hasConfigChanges = (
        original: KatanaProductConfig[],
        draft: KatanaProductConfig[]
    ): boolean => {
        return JSON.stringify(original) !== JSON.stringify(draft);
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            handleOpenModal();
        }
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
        variantIndex: number,
        configName: string,
        newValue: string
    ) => {
        const targetVariant = formProduct.variants[variantIndex];
        if (!targetVariant) return;

        const currentAttributes = targetVariant.config_attributes ?? [];
        const existingIndex = currentAttributes.findIndex(
            (attr) => attr.config_name === configName
        );

        let updatedAttributes: KatanaVariantConfigAttribute[];

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

        commitVariantChange(variantIndex, {
            config_attributes: updatedAttributes,
        });
    };

    /**
     * Appends a local draft variant row.
     * Doesn't POST to Katana until the user actually fills in values.
     */
    const handleAddVariant = () => {
        const defaultAttributes: KatanaVariantConfigAttribute[] = formProduct.configs.map(
            (config) => ({
                config_name: config.name,
                config_value: "",
            })
        );

        const newVariantDraft: KatanaProductDraftVariant = {
            sku: "",
            sales_price: 0,
            config_attributes: defaultAttributes,
        };

        setproduct((prev) => ({
            ...prev,
            variants: [...prev.variants, newVariantDraft],
        }));
    };

    const handleDeleteVariant = async (variantIndex: number, variantId?: number) => {
        if (formProduct.variants.length <= 1) {
            setFormError("產品至少需要設定一個款式。");
            return;
        }

        const remainingVariants = formProduct.variants.filter((_, idx) => idx !== variantIndex);
        setproduct((prev) => ({ ...prev, variants: remainingVariants }));

        // Only call delete API if it was already persisted to Katana
        if (!isCreating && variantId !== undefined) {
            onSavingChange?.(true);
            try {
                await deleteVariant(variantId);
                await refetchProducts();
            } catch (err) {
                setproduct((prev) => ({ ...prev, variants: formProduct.variants }));
                setFormError(err instanceof Error ? err.message : "刪除款式失敗。");
            } finally {
                onSavingChange?.(false);
            }
        }
    };

    const variants = formProduct.variants;
    // Check if there is already an unsaved draft row being edited
    const hasUnsavedVariant = !isCreating && variants.some((v) => v.id === undefined);

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

            {/* Top Details Form */}
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

            {/* Variant Configuration Controls */}
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
                            onChange={handleCheckboxChange}
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
                            <th className="py-3 px-4 text-right w-10"><Settings className="w-4 h-4 ml-auto" /></th>
                        </tr>
                    </thead>
                    <tbody className="font-mono text-xs">
                        {variants.map((variant, v_index) => (
                            <tr key={variant.id ?? `draft-${v_index}`} className="border-b border-border/60">
                                {formProduct.configs.length > 0 ? (
                                    formProduct.configs.map((config, index) => {
                                        const productConfigsName = config.name;
                                        const value = variant?.config_attributes?.find(
                                            (attribute) => attribute.config_name === productConfigsName
                                        )?.config_value;

                                        return (
                                            <td className="py-2.5 px-4 font-sans font-medium text-foreground" key={index}>
                                                <Select
                                                    value={value ? value : undefined}
                                                    onValueChange={(selectedVal) =>
                                                        selectedVal && handleVariantConfigChange(v_index, config.name, selectedVal)
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
                                        onCommit={(newSku) => commitVariantChange(v_index, { sku: newSku })}
                                    />
                                </td>

                                <td className="py-2.5 px-4 text-right">
                                    <InlineInput
                                        type="number"
                                        value={variant.sales_price ?? 0}
                                        formatter={(val) => `$${val.toFixed(2)}`}
                                        onCommit={(newPrice) =>
                                            commitVariantChange(v_index, { sales_price: newPrice })
                                        }
                                    />
                                </td>

                                {!isCreating && (
                                    <td className="py-2.5 px-4 text-right">
                                        <input
                                            className="w-full text-right bg-transparent text-foreground focus:outline-none"
                                            id={variant.id + "_quantity_in_stock"}
                                            type="number"
                                            value={
                                                variant.id != null &&
                                                    inventory.get(variant.id)?.quantity_in_stock != null
                                                    ? Number(
                                                        inventory.get(variant.id)?.quantity_in_stock
                                                    ).toFixed(0)
                                                    : 0
                                            }
                                            readOnly
                                        />
                                    </td>
                                )}
                                <td className="py-2.5 px-4 text-right">
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteVariant(v_index, variant.id)}
                                        className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                                        title="刪除款式"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
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