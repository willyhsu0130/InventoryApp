
import { useInventoryCatalog, useProductCatalog } from "../../hooks/useContexts";
import { EditModal } from "../EditModal";
import { useEffect, useState } from "react";
import { useDebounce } from "../../lib/debouncer";
import { InlineInput } from "../InlineInput";
import { ConfigOptionsEditor } from "./ConfigOptionEditor";


interface EditProductProps {
    id: number;
    // onChange?: (updatedProduct: KatanaProduct) => void;
}

export const EditProduct = ({ id }: EditProductProps) => {
    const [modalOpen, setModalOpen] = useState<boolean>(false)
    const [isSaving, setIsSaving] = useState(false);
    // const { setErrorMessage } = useError()

    const { products, editProduct, editVariant } = useProductCatalog()
    const { inventory } = useInventoryCatalog()
    console.log(inventory)
    const product = products.get(id);

    const [formProduct, setproduct] = useState(product);

    const debouncedFormProduct = useDebounce(formProduct, 500);

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

    // Whenever debounced state updates, fire editProduct
    useEffect(() => {
        if (debouncedFormProduct) {
            console.log("Syncing changes to context/API:", debouncedFormProduct);
            editProduct(debouncedFormProduct);
        }
    }, [debouncedFormProduct, editProduct]);
    const handleClose = () => {
        setModalOpen(false)
    };

    const handleSave = () => {

    }
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
                onClose={handleClose}
                onSave={handleSave}
                isSaving={isSaving}
            >

                <ConfigOptionsEditor
                    configs={formProduct.configs}
                    onChange={(updatedConfigs) => {
                        setproduct((prev) => (prev ? { ...prev, configs: updatedConfigs } : prev));
                    }}
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
                            <button onClick={() => setModalOpen((prev) => !prev)} className="bg-black p-3 rounded-xl">
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
                        <div>
                            <p>這個產品有不只一種款式嗎?</p>
                        </div>
                    }
                </div>

            </div>
        </div>
    )


}