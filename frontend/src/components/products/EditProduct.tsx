import { useImperativeHandle, useState } from "react";
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
} from "@/models/katana/productVariant";

/** Max length Katana enforces on `uom` and `purchase_uom`. */
const UOM_MAX_LENGTH = 7;

export interface EditProductHandle {
    /** Persists an unsaved draft. No-op once the product exists (edits autosave). */
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
    // -1 means "not in Katana yet": nothing can be PATCHed, so every change stays
    // local until the single POST in handleCreate.
    const isCreating = isUnsavedProduct(id);

    const [modalOpen, setModalOpen] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState(false);
    const [draftConfigs, setDraftConfigs] = useState<KatanaProductConfig[]>([]);
    const [formError, setFormError] = useState<string | null>(null);

    // Contexts
    const { products, editProduct, editVariant, createProduct, refetchProducts } = useProductCatalog();
    const product = products.get(id);
    const [formProduct, setproduct] = useState<KatanaProductDraft>(
        () => products.get(id) ?? createEmptyProductDraft()
    );
    const { inventory } = useInventoryCatalog();

    /**
     * Apply a change to one variant row, then persist it if that row already
     * exists in Katana. Unsaved rows have no id to PATCH against.
     */
    const commitVariantChange = async (
        variantIndex: number,
        patch: Partial<KatanaProductDraftVariant>
    ) => {
        const targetVariant = formProduct.variants[variantIndex];
        if (!targetVariant) return;

        // 1. Optimistic UI update for immediate user feedback
        const updatedVariant = { ...targetVariant, ...patch };

        setproduct((prev) => {
            const updatedVariants = [...prev.variants];
            updatedVariants[variantIndex] = updatedVariant;
            return { ...prev, variants: updatedVariants };
        });

        // 2. Direct PATCH /variants/{id} via editVariant
        const variantId = updatedVariant.id;
        if (isCreating || variantId === undefined) return;

        try {
            await editVariant({ ...updatedVariant, id: variantId });
        } catch (error) {
            // Restore the previous value when the provider rejects the update.
            setproduct((prev) => {
                const variants = [...prev.variants];
                variants[variantIndex] = targetVariant;
                return { ...prev, variants };
            });
            setFormError(error instanceof Error ? error.message : "更新產品款式失敗。");
        }
    };

    // Product stuff — accepts string (text inputs) or boolean (radio/checkbox flags)
    const handleFieldChange = (
        field: keyof KatanaProductDraft,
        value: string | boolean
    ) => {
        setFormError(null);
        setproduct((prev) => ({ ...prev, [field]: value }));
    };

    /**
     * Single source of truth for "does this product need a PATCH."
     */
    const commitProductPatch = async (patch: Partial<KatanaProductDraft> = {}) => {
        // 1. Always update local form state first
        const updated = { ...formProduct, ...patch };
        if (Object.keys(patch).length > 0) {
            setproduct(updated);
        }

        // 2. Drafts don't send API requests yet; they wait for the submit handle
        if (isCreating || !product) return;

        // 3. Check if top-level fields actually changed before firing API call
        const hasChanges =
            updated.name !== product.name ||
            updated.uom !== product.uom ||
            updated.batch_tracked !== product.batch_tracked ||
            updated.serial_tracked !== product.serial_tracked;

        if (!hasChanges) return;

        onSavingChange?.(true);
        try {
            await editProduct(updated);
            await refetchProducts();
        } catch (err) {
            console.error("Failed auto-save:", err);
        } finally {
            onSavingChange?.(false);
        }
    };

    // Kept for text inputs' onBlur — re-diffs current formProduct.
    const handleCommit = () => commitProductPatch();

    /** Validates against the constraints POST /products enforces. */
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

    // Modal Handlers
    const handleSaveModal = async () => {
        if (!hasConfigChanges(formProduct.configs, draftConfigs)) {
            setModalOpen(false);
            return;
        }

        if (isCreating) {
            setproduct((prev) => ({
                ...prev,
                configs: draftConfigs,
                variants: syncDraftVariantsToConfigs(draftConfigs, prev.variants),
            }));
            setModalOpen(false);
            return;
        }

        setIsSaving(true);

        try {
            const updatedProduct = { ...formProduct, configs: draftConfigs };

            setproduct(updatedProduct);
            await editProduct(updatedProduct);
            await refetchProducts();

            setModalOpen(false);
        } catch (err) {
            console.error("Failed to save configs", err);
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

    const variants = formProduct.variants;

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
                {/* Field 1: Name */}
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

                {/* Field 2: Unit of Measure (UOM) */}
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

                {/* Field 3: Tracking mode radio group */}
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
                        </tr>
                    </thead>
                    <tbody className="font-mono text-xs">
                        {variants.map((variant, v_index) => (
                            <tr key={variant.id ?? v_index} className="border-b border-border/60">
                                {formProduct.configs.length > 0 ? (
                                    formProduct.configs.map((config, index) => {
                                        const productConfigsName = config.name;
                                        const value = variant?.config_attributes?.find(
                                            (attribute) => attribute.config_name === productConfigsName
                                        )?.config_value;

                                        return (
                                            <td className="py-2.5 px-4 font-sans font-medium text-foreground" key={index}>
                                                {value}
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
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};