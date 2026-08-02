import { useEffect, useState, useMemo } from "react";
import { katanaFetch } from "../lib/katanaFetch";
import { KATANA_API_ROUTES } from "../lib/routes/routes";

// Structure matching Katana API Inventory shape
export interface KatanaInventoryItem {
    variant_id: number;
    location_id: number;
    safety_stock_level: string;
    reorder_point: string; // Deprecated by Katana in favor of safety_stock_level
    average_cost: string;
    value_in_stock: string;
    quantity_in_stock: string;
    quantity_committed: string;
    quantity_expected: string;
    quantity_missing_or_excess: string;
    quantity_potential: string | null;
    default_storage_bin: string | null;
    archived_at: string | null;
}

export const Inventory = () => {
    const [items, setItems] = useState<KatanaInventoryItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>("");

    useEffect(() => {
        const fetchInventory = async () => {
            setLoading(true);
            setError(null);

            // Fetching inventory balances from Katana
            const res = await katanaFetch<KatanaInventoryItem[]>(
                KATANA_API_ROUTES.INVENTORY
            );

            console.log("Katana API Response:", res);

            if (res.success) {
                setItems(res.data);
            } else {
                setError(res.message || "Failed to load inventory data.");
            }
            setLoading(false);
        };

        fetchInventory();
    }, []);

    // Filter items by Variant ID or Location ID
    const filteredItems = useMemo(() => {
        return items.filter((item) => {
            const term = searchTerm.toLowerCase().trim();
            if (!term) return true;

            return (
                item.variant_id.toString().includes(term) ||
                item.location_id.toString().includes(term)
            );
        });
    }, [items, searchTerm]);

    return (
        <div className="p-6 space-y-6 text-slate-100">
            {/* Header & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                    <h1 className="text-2xl font-bold tracking-tigh text-black">庫存</h1>
                </div>

                <div className="w-full sm:w-72">
                    <input
                        type="text"
                        placeholder="Search Variant or Location ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition"
                    />
                </div>
            </div>

            {/* Loading / Error States */}
            {loading ? (
                <div className="flex justify-center items-center h-48 text-slate-400">
                    <p className="animate-pulse font-medium text-sm">
                        Fetching stock levels...
                    </p>
                </div>
            ) : error ? (
                <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-lg text-red-200 text-sm">
                    <p className="font-semibold">Unable to display inventory</p>
                    <p className="text-xs font-mono mt-1 text-red-300">{error}</p>
                </div>
            ) : (
                /* Inventory Table */
                <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/50 shadow-sm">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-950 text-slate-400 font-medium text-xs uppercase tracking-wider border-b border-slate-800">
                            <tr>
                                <th className="py-3 px-4">商品代碼</th>
                                <th className="py-3 px-4 text-right">現貨</th>
                                <th className="py-3 px-4 text-right">使用</th>
                                <th className="py-3 px-4 text-right">預期</th>
                                <th className="py-3 px-4 text-center">庫存</th>
                                <th className="py-3 px-4 text-right">平均成本($)</th>
                                <th className="py-3 px-4 text-right">總價值($)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                            {filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                                        No matching inventory items found.
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((item) => {
                                    const missingOrExcess = parseFloat(item.quantity_missing_or_excess);
                                    const isShortage = missingOrExcess < 0;

                                    return (
                                        <tr key={item.variant_id} className="hover:bg-slate-800/40 transition-colors">
                                            <td className="py-3 px-4 text-slate-200 font-medium">
                                                {item.variant_id}
                                            </td>
                                            <td className="py-3 px-4 text-right font-bold text-slate-100">
                                                {parseFloat(item.quantity_in_stock)}
                                            </td>
                                            <td className="py-3 px-4 text-right text-slate-400">
                                                {parseFloat(item.quantity_committed)}
                                            </td>
                                            <td className="py-3 px-4 text-right text-slate-400">
                                                {parseFloat(item.quantity_expected)}
                                            </td>
                                            {/* Stock Health Badge */}
                                            <td className="py-3 px-4 text-center">
                                                {isShortage ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-950/60 text-amber-400 border border-amber-800/50">
                                                        Reorder ({missingOrExcess.toFixed(1)})
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
                                                        Optimal
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right text-slate-300">
                                                ${parseFloat(item.average_cost).toFixed(2)}
                                            </td>
                                            <td className="py-3 px-4 text-right text-emerald-400 font-medium">
                                                ${parseFloat(item.value_in_stock).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};