
import { useImperativeHandle, useState } from "react";
import { useInventoryCatalog, useProductCatalog } from "../../hooks/useContexts";
import { EditModal } from "../EditModal";
import { InlineInput } from "../InlineInput";
import { ConfigOptionsEditor } from "./ConfigOptionEditor";
import {
    createEmptyProductDraft,
    isUnsavedProduct,
    syncDraftVariantsToConfigs,
    type KatanaProductConfig,
    type KatanaProductDraft,
    type KatanaProductDraftVariant,
} from "../../models/katana";

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

    const [modalOpen, setModalOpen] = useState<boolean>(false)
    const [isSaving, setIsSaving] = useState(false);
    const [draftConfigs, setDraftConfigs] = useState<KatanaProductConfig[]>([]);
    const [formError, setFormError] = useState<string | null>(null);

    // Grab Contexts
    const { products, editProduct, editVariant, createProduct, refetchProducts } = useProductCatalog()
    const product = products.get(id);
    const [formProduct, setproduct] = useState<KatanaProductDraft>(
        () => products.get(id) ?? createEmptyProductDraft()
    );
    const { inventory } = useInventoryCatalog()

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

        await editVariant({ ...updatedVariant, id: variantId });
    };

    // Product stuff
    const handleFieldChange = (field: keyof KatanaProductDraft, value: string) => {
        setFormError(null);
        setproduct((prev) => ({ ...prev, [field]: value }));
    };

    const handleCommit = async () => {
        // Drafts have nothing to PATCH — they are saved by the modal's save button.
        if (isCreating || !product) return;

        // Check if top-level fields actually changed before firing API call
        const hasChanges =
            formProduct.name !== product.name ||
            formProduct.uom !== product.uom;
        // Add other fields here: || formProduct.sku !== product.sku, etc.

        if (!hasChanges) return;
        onSavingChange?.(true);
        try {
            await editProduct(formProduct);
            await refetchProducts();
        } catch (err) {
            console.error("Failed auto-save:", err);
        } finally {
            onSavingChange?.(false);
        }
    };

    /** Validates against the constraints POST /products enforces. */
    const validateDraft = (draft: KatanaProductDraft): string | null => {
        if (!draft.name.trim()) return "請輸入產品名稱。";
        if (draft.uom.trim().length > UOM_MAX_LENGTH) {
            return `單位 (UOM) 不可超過 ${UOM_MAX_LENGTH} 個字元。`;
        }
        // POST /products requires variants with minItems: 1.
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

    // Lets the modal footer's save button drive the create flow.
    useImperativeHandle(ref, () => ({ submit: handleCreate }));

    // Modal Stuff
    const handleSaveModal = async () => {
        if (!hasConfigChanges(formProduct.configs, draftConfigs)) {
            setModalOpen(false);
            return;
        }

        // A draft's variant rows are derived locally from its configs; Katana only
        // generates them server-side once the product is POSTed.
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

            // 1. Optimistically update local view first
            setproduct(updatedProduct);

            // 2. Send update to Katana API
            await editProduct(updatedProduct);

            // 3. Refresh variants from Katana
            await refetchProducts();

            // 4. Close modal
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

    // Checkbox stuff
    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            // User checked "This product has multiple variants" -> open modal to configure options
            handleOpenModal();
        }
    };

    const variants = formProduct.variants

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

            {formError && (
                <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-lg text-red-200 text-sm font-sans">
                    {formError}
                </div>
            )}

            {/* Edit Products*/}
            <div className="h-2/3 gap-y-3">
                <div className="grid grid-cols-2 gap-4">
                    {/* Field 1: Name */}
                    <div className="flex flex-col gap-y-1 col-span-2">
                        <label className="text-xs text-slate-400 font-sans">產品名稱</label>
                        <input
                            type="text"
                            value={formProduct.name}
                            onChange={(e) => handleFieldChange("name", e.target.value)}
                            onBlur={handleCommit}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                            }}
                            placeholder="名稱"
                            className="text-xl bg-transparent border-b border-slate-700 focus:border-slate-500 focus:outline-none px-1 py-0.5 text-slate-100 font-bold"
                        />
                    </div>

                    {/* Field 2: Unit of Measure (UOM) */}
                    <div className="flex flex-col gap-y-1">
                        <label className="text-xs text-slate-400 font-sans">單位 (UOM)</label>
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
                            className="bg-transparent border-b border-slate-700 focus:border-slate-500 focus:outline-none px-1 py-0.5 text-slate-100 font-mono text-sm"
                        />
                    </div>

                    {/* You can add any additional product field following this exact same pattern */}
                </div>
            </div>
            {/* Edit Variants*/}
            <div className="h-1/3">
                <div className="mb-5">
                    {
                        // Check if config length > 0
                        formProduct.configs.length > 0 ?
                            <button onClick={handleOpenModal} className="bg-black p-3 rounded-xl">
                                調整產品規格
                            </button>
                            :
                            <div>
                                <p>這個產品有不只一種款式嗎?</p>
                                <div className="flex gap-x-3">
                                    <input
                                        checked={modalOpen}
                                        onChange={handleCheckboxChange}
                                        className="rounded-2xl hover:bg-amber-50 b-5"
                                        type="checkbox" />
                                    <p>設定款式</p>
                                </div>
                            </div>
                    }
                </div>

                <table className="w-full">
                    <thead className="bg-slate-900/80 text-xs font-semibold text-slate-400 border-b border-slate-800">
                        <tr>
                            {formProduct.configs.length > 0 ?

                                formProduct.configs.map((config) => (
                                    <th key={config.name} className="py-2.5 px-3">{config.name}</th>
                                ))

                                :

                                <th>款式</th>

                            }
                            <th className="py-2.5 px-3">SKU</th>
                            <th className="py-2.5 px-3">銷售價格</th>
                            {/* A draft has no stock yet — the column only means something once saved. */}
                            {!isCreating && <th className="py-2.5 px-3">庫存量</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {variants.map((variant, v_index) => (
                            /* Table row */
                            <tr key={variant.id ?? v_index}>
                                {/* Table col */}
                                {
                                    formProduct.configs.length > 0 ?
                                        formProduct.configs.map((config, index) => {
                                            // Find matching values for this config
                                            const productConfigsName = config.name
                                            const value = variant?.config_attributes?.find((attribute) => attribute.config_name === productConfigsName)?.config_value

                                            return (
                                                <td
                                                    className="text-left p-2"
                                                    key={index}>{value}
                                                </td>
                                            )
                                        })
                                        :
                                        <td className="py-2.5 px-3">N/A</td>
                                }
                                <td className="p-2">
                                    <InlineInput
                                        type="text"
                                        value={variant.sku ?? ""}
                                        onCommit={(newSku) => commitVariantChange(v_index, { sku: newSku })}
                                    />
                                </td>

                                <td className="p-2">
                                    <InlineInput
                                        type="number"
                                        value={variant.sales_price ?? 0}
                                        formatter={(val) => `$${val.toFixed(2)}`}
                                        onCommit={(newPrice) => commitVariantChange(v_index, { sales_price: newPrice })}
                                    />
                                </td>

                                {!isCreating && (
                                    <td className="p-2">
                                        <input
                                            className="w-full text-right"
                                            id={variant.id + "_quantity_in_stock"}
                                            type="number"

                                            value={variant.id != null && inventory.get(variant.id)?.quantity_in_stock != null
                                                ? Number(inventory.get(variant.id)?.quantity_in_stock).toFixed(0) // 0 decimals for stock
                                                : 0}
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
    )


}
