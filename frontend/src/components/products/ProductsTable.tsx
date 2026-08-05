// src/components/products/ProductsTable.tsx
import { useState } from "react";
import { DataTable, type Column } from "../DataTable";
import { EditModal } from "../EditModal";

import { useProductCatalog } from "../../hooks/useContexts";
import type { DisplayProductRow } from "../../pages/Products";
import { EditProduct } from "./EditProduct";

interface ProductsTableProps {
    items: DisplayProductRow[]
}

export const ProductsTable = ({ items }: ProductsTableProps) => {
    const [selectedItem, setSelectedItem] = useState<DisplayProductRow | null>(null);

    const [isSaving, setIsSaving] = useState(false);
    const { editProduct, products } = useProductCatalog()

    const handleRowClick = (item: DisplayProductRow) => {
        setSelectedItem(item);
    };

    const handleClose = () => {
        setSelectedItem(null);
    };

    const handleSave = async () => {
        if (!selectedItem) return;
        console.log("handle saving")
        setIsSaving(true);

        // Find the product in which this is from.
        const productId = selectedItem.id;
        const product = products.get(productId)

        try {
            if (product) await editProduct(product);
            handleClose();
        } catch (err) {
            console.error("Failed to update product variant:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const columns: Column<DisplayProductRow>[] = [
        {
            header: "",
            align: "center",
            className: "w-10",
            render: (item) => (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleRowClick(item);
                    }}
                    className="text-slate-500 hover:text-emerald-400 p-1 rounded-md hover:bg-slate-800 transition"
                    title="編輯"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-4 h-4"
                    >
                        <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                        <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10a.75.75 0 000-1.5H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                    </svg>
                </button>
            ),
        },
        {
            header: "產品名稱 / 規格",
            render: (item) => (
                <div className="font-sans font-medium text-slate-100 text-sm">
                    {item.name}
                    {/* {item.variant_details && (
                        <span className="ml-2 text-xs text-slate-400 font-normal">
                            ({item.variant_details})
                        </span>
                    )} */}
                </div>
            ),
        },
        {
            header: "SKU",
            render: (item) => (
                <span className="font-mono text-slate-300">{item.sku || "N/A"}</span>
            ),
        },
        // {
        //     header: "類別",
        //     render: (item) => (
        //         <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700/60 font-sans">
        //             {item.category_name}
        //         </span>
        //     ),
        // },
        {
            header: "單位",
            align: "center",
            render: (item) => (
                <span className="font-mono text-slate-400">{item.uom}</span>
            ),
        },
        {
            header: "Variant ID",
            align: "right",
            render: (item) => (
                <span className="font-mono text-slate-500">#{item.variantId}</span>
            ),
        },
    ];

    return (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-xl border border-slate-800">
            <DataTable
                data={items}
                columns={columns}
                keyExtractor={(item) => item.variantId}
                onRowClick={handleRowClick}
                emptyMessage="查無符合條件的產品。"
            />

            {/* Edit Modal */}
            <EditModal
                isOpen={Boolean(selectedItem)}
                title={`編輯產品 (ID: #${selectedItem?.variantId})`}
                onClose={handleClose}
                onSave={handleSave}
                isSaving={isSaving}
            >
                {
                    selectedItem && <EditProduct id={selectedItem.id} />
                }
                {/* <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1 font-sans">
                            產品名稱
                        </label>
                        <input
                            type="text"
                            value={formData.name || ""}
                            onChange={(e) =>
                                setFormData({ ...formData, name: e.target.value })
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none transition font-sans"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1 font-sans">
                            SKU
                        </label>
                        <input
                            type="text"
                            value={formData.sku || ""}
                            onChange={(e) =>
                                setFormData({ ...formData, sku: e.target.value })
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none transition font-mono"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1 font-sans">
                            單位 (UOM)
                        </label>
                        <input
                            type="text"
                            value={formData.uom || ""}
                            onChange={(e) =>
                                setFormData({ ...formData, uom: e.target.value })
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none transition font-mono"
                        />
                    </div>
                </div> */}
            </EditModal>
        </div>
    );
};