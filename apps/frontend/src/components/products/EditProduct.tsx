import {
    useImperativeHandle,
    useState,
    useEffect,
    useCallback,
    type FC,
    type Ref,
} from "react";
import { Plus, Settings, Trash2 } from "lucide-react";
import { EditModal } from "../EditModal";
import { InlineInput } from "../InlineInput";
import { ConfigOptionsEditor } from "./ConfigOptionEditor";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { CONTROL_INPUT, ERROR_PANEL, FIELD_LABEL } from "@/lib/styles";
import type {
    Variant,
    ProductConfig,
    VariantConfigAttribute,
} from "@my-inventory-app/shared";
import {
    getProductById,
    createProduct,
    updateProduct,
} from "@/services/productService";
import {
    getVariantsByProductId,
    createVariant,
    updateVariant,
    deleteVariant,
} from "@/services/variantService";
import { getTotalStockByVariantId } from "@/services/inventoryLevelService";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { LoadingModal } from "../LoadingModal";

const UOM_MAX_LENGTH = 7;

export interface EditProductHandle {
    submit: () => Promise<void>;
}

export interface LocalVariantDraft {
    id?: number;
    sku?: string;
    salesPrice?: number;
    configs: VariantConfigAttribute[];
    stockQuantity?: number;
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
    const isCreating = id == null || id <= 0;

    // Loading state: true only when fetching existing product in Edit Mode
    const [isLoading, setIsLoading] = useState<boolean>(!isCreating);
    const [modalOpen, setModalOpen] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [formError, setFormError] = useState<string | null>(null);

    // Core product form state
    const [productName, setProductName] = useState<string>("");
    const [productUom, setProductUom] = useState<string>("pcs");
    const [isBatchTracked, setIsBatchTracked] = useState<boolean>(false);
    const [productConfigs, setProductConfigs] = useState<ProductConfig[]>([]);

    // Modal draft state
    const [draftConfigs, setDraftConfigs] = useState<ProductConfig[]>([]);

    // Initialize with a blank draft row if creating
    const [variantList, setVariantList] = useState<LocalVariantDraft[]>(() => {
        if (isCreating || id == null) {
            return [{ configs: [], sku: "", salesPrice: 0 }];
        }
        return [];
    });

    // Data Fetching for Edit Mode ONLY
    useEffect(() => {
        if (isCreating || id == null) {
            return;
        }

        let isMounted = true;

        Promise.all([
            getProductById(id),
            getVariantsByProductId(id),
        ])
            .then(async ([productData, variantsData]) => {
                if (!isMounted) return;

                // Load stock levels in parallel for existing variants
                const rowsWithStock: LocalVariantDraft[] = await Promise.all(
                    variantsData.map(async (v: Variant) => {
                        const stock = await getTotalStockByVariantId(v.id).catch(() => 0);
                        return {
                            id: v.id,
                            sku: v.sku ?? "",
                            salesPrice: v.salesPrice ?? 0,
                            configs: v.configs ?? [],
                            stockQuantity: stock,
                        };
                    })
                );

                if (isMounted) {
                    setProductName(productData.name);
                    setProductUom(productData.uom ?? "pcs");
                    setIsBatchTracked(productData.batchTracked);
                    setProductConfigs(productData.configs ?? []);
                    setVariantList(rowsWithStock);
                    setIsLoading(false);
                }
            })
            .catch((err) => {
                if (isMounted) {
                    setFormError(err instanceof Error ? err.message : "無法載入產品資料。");
                    setIsLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [id, isCreating]);

    // Save Top-Level Product Changes (Edit Mode Auto-save)
    const commitProductHeader = useCallback(
        async (name: string, uom: string, batchTracked: boolean) => {
            if (isCreating || id == null) return;
            if (!name.trim()) {
                setFormError("請輸入產品名稱。");
                return;
            }

            onSavingChange?.(true);
            try {
                await updateProduct(id, {
                    name: name.trim(),
                    uom: uom.trim(),
                    batchTracked,
                });
                setFormError(null);
            } catch (err) {
                setFormError(err instanceof Error ? err.message : "自動更新產品失敗。");
            } finally {
                onSavingChange?.(false);
            }
        },
        [id, isCreating, onSavingChange]
    );

    // Variant Mutation Handlers
    const commitVariantChange = async (
        targetVariant: LocalVariantDraft,
        targetIndex: number,
        patch: Partial<LocalVariantDraft>
    ) => {
        const updated: LocalVariantDraft = { ...targetVariant, ...patch };

        if (isCreating) {
            setVariantList((prev) => {
                const next = [...prev];
                next[targetIndex] = updated;
                return next;
            });
            return;
        }

        if (targetVariant.id === undefined) {
            const hasUnfilledConfigs = updated.configs.some(
                (cfg) => !cfg.value || cfg.value.trim() === ""
            );

            if (hasUnfilledConfigs) {
                setVariantList((prev) => {
                    const next = [...prev];
                    next[targetIndex] = updated;
                    return next;
                });
                return;
            }

            if (id == null) return;

            onSavingChange?.(true);
            try {
                const created = await createVariant({
                    productId: id,
                    sku: updated.sku?.trim() ? updated.sku.trim() : null,
                    salesPrice: updated.salesPrice ?? 0,
                    configs: updated.configs,
                });

                setVariantList((prev) =>
                    prev.map((item, idx) =>
                        idx === targetIndex
                            ? {
                                id: created.id,
                                sku: created.sku ?? "",
                                salesPrice: created.salesPrice ?? 0,
                                configs: created.configs ?? [],
                                stockQuantity: 0,
                            }
                            : item
                    )
                );
                setFormError(null);
            } catch (err) {
                setFormError(err instanceof Error ? err.message : "新增款式失敗。");
            } finally {
                onSavingChange?.(false);
            }
        } else {
            setVariantList((prev) =>
                prev.map((v) => (v.id === targetVariant.id ? updated : v))
            );

            onSavingChange?.(true);
            try {
                await updateVariant(targetVariant.id, {
                    sku: updated.sku,
                    salesPrice: updated.salesPrice,
                    configs: updated.configs,
                });
                setFormError(null);
            } catch (err) {
                setFormError(err instanceof Error ? err.message : "更新款式失敗。");
            } finally {
                onSavingChange?.(false);
            }
        }
    };

    const handleAddVariant = () => {
        const defaultConfigs: VariantConfigAttribute[] = productConfigs.map((cfg) => ({
            name: cfg.name,
            value: cfg.values[0] ?? "",
        }));

        setVariantList((prev) => [
            ...prev,
            { sku: "", salesPrice: 0, configs: defaultConfigs },
        ]);
    };

    const handleDeleteVariant = async (
        variant: LocalVariantDraft,
        targetIndex: number
    ) => {
        if (variantList.length <= 1) {
            setFormError("產品至少需要設定一個款式。");
            return;
        }

        if (variant.id === undefined) {
            setVariantList((prev) => prev.filter((_, idx) => idx !== targetIndex));
            return;
        }

        onSavingChange?.(true);
        try {
            await deleteVariant(variant.id);
            setVariantList((prev) => prev.filter((v) => v.id !== variant.id));
            setFormError(null);
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "刪除款式失敗。");
        } finally {
            onSavingChange?.(false);
        }
    };

    const handleVariantConfigChange = (
        variant: LocalVariantDraft,
        targetIndex: number,
        configName: string,
        newValue: string
    ) => {
        const current = variant.configs ?? [];
        const existingIdx = current.findIndex((c) => c.name === configName);

        let updatedConfigs: VariantConfigAttribute[];
        if (existingIdx >= 0) {
            updatedConfigs = [...current];
            updatedConfigs[existingIdx] = { name: configName, value: newValue };
        } else {
            updatedConfigs = [...current, { name: configName, value: newValue }];
        }

        commitVariantChange(variant, targetIndex, { configs: updatedConfigs });
    };

    const handleCreate = async () => {
        if (!isCreating) return;

        if (!productName.trim()) {
            setFormError("請輸入產品名稱。");
            return;
        }
        if (productUom.trim().length > UOM_MAX_LENGTH) {
            setFormError(`單位 (UOM) 不可超過 ${UOM_MAX_LENGTH} 個字元。`);
            return;
        }
        if (variantList.length === 0) {
            setFormError("請至少設定一個款式。");
            return;
        }

        setFormError(null);
        setIsSaving(true);
        onSavingChange?.(true);

        try {
            const createdProduct = await createProduct({
                name: productName.trim(),
                uom: productUom.trim(),
                batchTracked: isBatchTracked,
                configs: productConfigs,
            });

            onCreated?.(createdProduct.id);
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "建立產品失敗。");
        } finally {
            setIsSaving(false);
            onSavingChange?.(false);
        }
    };

    useImperativeHandle(ref, () => ({ submit: handleCreate }));

    const handleOpenModal = () => {
        setDraftConfigs([...productConfigs]);
        setModalOpen(true);
    };

    const handleSaveModal = async () => {
        if (isCreating) {
            setProductConfigs(draftConfigs);
            setModalOpen(false);
            return;
        }

        if (id == null) return;

        setIsSaving(true);
        try {
            await updateProduct(id, { configs: draftConfigs });
            setProductConfigs(draftConfigs);
            setModalOpen(false);
            setFormError(null);
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "更新規格失敗。");
        } finally {
            setIsSaving(false);
        }
    };

    const hasUnsavedVariant = !isCreating && variantList.some((v) => v.id === undefined);

    // Render loading spinner while fetching product data in Edit Mode
    if (isLoading) {
        return (
            <LoadingModal />
        );
    }

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
                        value={productName}
                        onChange={(e) => {
                            setFormError(null);
                            setProductName(e.target.value);
                        }}
                        onBlur={() => commitProductHeader(productName, productUom, isBatchTracked)}
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
                        value={productUom}
                        onChange={(e) => {
                            setFormError(null);
                            setProductUom(e.target.value);
                        }}
                        onBlur={() => commitProductHeader(productName, productUom, isBatchTracked)}
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
                        value={isBatchTracked ? "batch" : "none"}
                        onValueChange={(val) => {
                            const isBatch = val === "batch";
                            setIsBatchTracked(isBatch);
                            commitProductHeader(productName, productUom, isBatch);
                        }}
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
                {productConfigs.length > 0 ? (
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
                            {productConfigs.length > 0 ? (
                                productConfigs.map((config) => (
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
                        {variantList.map((variant, index) => {
                            return (
                                <tr key={variant.id ?? `draft-${index}`} className="border-b border-border/60">
                                    {productConfigs.length > 0 ? (
                                        productConfigs.map((config) => {
                                            const value = variant.configs?.find(
                                                (attr) => attr.name === config.name
                                            )?.value;

                                            return (
                                                <td className="py-2.5 px-4 font-sans font-medium text-foreground" key={config.name}>
                                                    <Select
                                                        value={value || undefined}
                                                        onValueChange={(selectedVal) =>
                                                            selectedVal &&
                                                            handleVariantConfigChange(variant, index, config.name, selectedVal)
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
                                            onCommit={(newSku) =>
                                                commitVariantChange(variant, index, { sku: newSku })
                                            }
                                        />
                                    </td>

                                    <td className="py-2.5 px-4 text-right">
                                        <InlineInput
                                            type="number"
                                            value={variant.salesPrice ?? 0}
                                            formatter={(val) => `$${val.toFixed(2)}`}
                                            onCommit={(newPrice) =>
                                                commitVariantChange(variant, index, { salesPrice: newPrice })
                                            }
                                        />
                                    </td>

                                    {!isCreating && (
                                        <td className="py-2.5 px-4 text-right">
                                            <span className="font-mono text-emerald-400">
                                                {(variant.stockQuantity ?? 0).toLocaleString()}
                                            </span>
                                        </td>
                                    )}

                                    <td className="py-2.5 px-4 text-right">
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteVariant(variant, index)}
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