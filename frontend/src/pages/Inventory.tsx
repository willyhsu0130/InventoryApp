import { useEffect, useState, useMemo, useContext } from "react";
import { katanaFetch } from "../lib/katanaFetch";
import { KATANA_API_ROUTES } from "../lib/routes/routes";
import { ProductContext } from "../context/ProductContext"; // Adjust path if needed
import { InventoryTable } from "../components/inventory/InventoryTable";
import type { KatanaInventoryItem } from "../models/katana";
import { useError } from "../hooks/useError";


export const Inventory = () => {
    // 1. Consume Product Context for names, SKUs, and variant details
    const productCtx = useContext(ProductContext);

    const [items, setItems] = useState<KatanaInventoryItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const {  setErrorMessage } = useError()
    const [searchTerm, setSearchTerm] = useState<string>("");

    useEffect(() => {
        const fetchInventory = async () => {
            setLoading(true);


            const res = await katanaFetch<KatanaInventoryItem[]>(
                KATANA_API_ROUTES.INVENTORY
            );

            if (res.success) {
                setItems(res.data);
            } else {
                setErrorMessage(res.message || "Failed to load inventory data.");
            }
            setLoading(false);
        };

        fetchInventory();
    }, [setErrorMessage]);

    // 2. Enhanced Filter: search across Variant ID, Product Name, SKU, and Variant Details
    const filteredItems = useMemo(() => {
        return items.filter((item) => {
            const term = searchTerm.toLowerCase().trim();
            if (!term) return true;

            const details = productCtx?.getVariantDetails(item.variant_id);
            const productNameMatch = details?.product_name.toLowerCase().includes(term);
            const variantDetailsMatch = details?.variant_details?.toLowerCase().includes(term);
            const skuMatch = details?.sku.toLowerCase().includes(term);
            const variantIdMatch = item.variant_id.toString().includes(term);
            const locationIdMatch = item.location_id.toString().includes(term);

            return (
                productNameMatch ||
                variantDetailsMatch ||
                skuMatch ||
                variantIdMatch ||
                locationIdMatch
            );
        });
    }, [items, searchTerm, productCtx]);

    const isGlobalLoading = loading || (productCtx?.loading ?? false);

    return (
        <div className="p-6 space-y-6 text-slate-100 flex flex-col h-full min-h-0" id="inventoryPage">
            {/* Header & Search */}
            <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-black">庫存</h1>
                </div>

                <div className="w-full sm:w-80">
                    <input
                        type="text"
                        placeholder="搜尋產品, SKU, 樣式, 或 ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition"
                    />
                </div>
            </div>
            <div className="flex gap-x-3">
                <button>
                    <p className="text-black">調整庫存</p>
                </button>
                <button>
                    <p className="text-black">調整庫存</p>
                </button>
            </div>
            {/* Loading / Error States */}
            <div className="flex-1 w-full min-h-0" id="bottomContainer">
                {isGlobalLoading ? (
                    <div className="flex justify-center items-center h-48 text-slate-400">
                        <p className="animate-pulse font-medium text-sm">
                            準備畫面中
                        </p>
                    </div>
                ) : (
                    /* Inventory Table */
                    <InventoryTable items={filteredItems} />
                )}
            </div>

        </div>
    );
};