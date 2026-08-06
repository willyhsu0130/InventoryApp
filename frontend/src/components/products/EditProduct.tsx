
import { useInventoryCatalog, useProductCatalog } from "../../hooks/useContexts";
import { EditModal } from "../EditModal";
import { useEffect, useState } from "react";
// import { useDebounce } from "../../lib/debouncer";
import { InlineInput } from "../InlineInput";
import { ConfigOptionsEditor } from "./ConfigOptionEditor";
import type { KatanaProductConfig } from "../../models/katana";


interface EditProductProps {
    id: number;
    // onChange?: (updatedProduct: KatanaProduct) => void;
}

export const EditProduct = ({ id }: EditProductProps) => {
    const [modalOpen, setModalOpen] = useState<boolean>(false)
    const [isSaving, setIsSaving] = useState(false);
    const [draftConfigs, setDraftConfigs] = useState<KatanaProductConfig[]>([]);

    const handleOpenModal = () => {
        if (formProduct) {
            setDraftConfigs([...formProduct.configs]);
        }
        setModalOpen(true);
    };

    // Grab Contexts    
    const { products, editProduct, editVariant, refetchProducts } = useProductCatalog()
    const { inventory } = useInventoryCatalog()

    const product = products.get(id);

    const handlePriceChange = async (variantIndex: number, newPrice: number) => {
        if (!formProduct) return;

        const targetVariant = formProduct.variants[variantIndex];
        if (!targetVariant) return;

        // 1. Optimistic UI update for immediate user feedback
        const updatedVariant = { ...targetVariant, sales_price: newPrice };

        setproduct((prev) => {
            if (!prev) return prev;
            const updatedVariants = [...prev.variants];
            updatedVariants[variantIndex] = updatedVariant;
            return { ...prev, variants: updatedVariants };
        });

        // 2. Direct PATCH /variants/{id} via editVariant
        await editVariant(updatedVariant);

    };

    const [formProduct, setproduct] = useState(product);

    // const debouncedFormProduct = useDebounce(formProduct, 500);



    // Whenever debounced state updates, fire editProduct
    // useEffect(() => {
    //     if (debouncedFormProduct) {
    //         console.log("Syncing changes to context/API:", debouncedFormProduct);
    //         editProduct(debouncedFormProduct);
    //     }
    // }, [debouncedFormProduct, editProduct]);

    // Re-sync local form state when context finishes refetching

    const handleSaveModal = async () => {
        if (!formProduct) return;

        if (!hasConfigChanges(formProduct.configs, draftConfigs)) {
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


    if (!formProduct) {
        return (
            <div className="py-8 text-center text-slate-400 text-sm font-sans">
                載入產品資料中...
            </div>
        );
    }
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

            {/* Edit Products*/}
            <div className="h-2/3">

                <input
                    type="text"
                    value={formProduct.name}
                    // onChange={(e) => handleProductChange("name", e.target.value)}
                    placeholder="名稱"
                    className="text-2xl"
                />

            </div>
            {/* Edit Variants*/}
            <div className="h-1/3">
                {/* Check if config length > 0  */}
                <div>
                    {formProduct.configs.length > 0 ?
                        <div>
                            <button onClick={handleOpenModal} className="bg-black p-3 rounded-xl">
                                調整產品規格
                            </button>
                            <table className="w-full">
                                <thead className="bg-slate-900/80 text-xs font-semibold text-slate-400 border-b border-slate-800">
                                    <tr>
                                        {formProduct.configs.map((config) => (
                                            <th className="py-2.5 px-3">{config.name}</th>
                                        ))}
                                        <th className="py-2.5 px-3">銷售價格</th>
                                        <th className="py-2.5 px-3">庫存量</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {variants.map((variant, v_index) => (
                                        /* Table row */
                                        <tr key={v_index}>
                                            {/* Table col */}
                                            {formProduct.configs.map((config, index) => {
                                                // Find matching values for this config
                                                const productConfigsName = config.name
                                                const value = variant?.config_attributes?.find((attribute) => attribute.config_name === productConfigsName)?.config_value
                                                console.log(value)
                                                return (
                                                    <td
                                                        className="text-left p-2"
                                                        key={index}>{value}
                                                    </td>
                                                )
                                            })}

                                            <td className="p-2">
                                                <InlineInput
                                                    type="number"
                                                    value={variant.sales_price ?? 0}
                                                    formatter={(val) => `$${val.toFixed(2)}`}
                                                    onCommit={(newPrice) => handlePriceChange(v_index, newPrice)}
                                                />
                                            </td>

                                            <td className="p-2">
                                                <input
                                                    className="w-full text-right"
                                                    id={variant.id + "_quantity_in_stock"}
                                                    type="number"

                                                    value={inventory.get(variant.id)?.quantity_in_stock != null
                                                        ? Number(inventory.get(variant.id)?.quantity_in_stock).toFixed(0) // 0 decimals for stock
                                                        : 0}
                                                    readOnly
                                                />
                                            </td>

                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                        </div>
                        :
                        <div >
                            <p>這個產品有不只一種款式嗎?</p>
                            <div className="flex gap-x-3">
                                <input
                                    onChange={handleCheckboxChange}
                                    className="rounded-2xl hover:bg-amber-50 b-5"
                                    type="checkbox" />
                                <p>設定款式</p>
                            </div>
                        </div>
                    }
                </div>

            </div>
        </div>
    )


}