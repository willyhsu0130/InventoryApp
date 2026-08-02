import { useState, useMemo } from "react";
import { useProductCatalog } from "../hooks/useProductCatalog";

export const Products = () => {
    const { variants, getVariantDetails, loading, error, refetchProducts } = useProductCatalog();
    const [searchTerm, setSearchTerm] = useState<string>("");

    // Transform Map entries into an array of enriched product details
    const productList = useMemo(() => {
        return Array.from(variants.keys()).map((variantId) => {
            const details = getVariantDetails(variantId);
            return {
                variantId,
                ...details,
            };
        });
    }, [variants, getVariantDetails]);

    // Search filter across Product Name, SKU, Category, or Variant Spec
    const filteredProducts = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return productList;

        return productList.filter((item) => {
            return (
                item.product_name.toLowerCase().includes(term) ||
                item.sku.toLowerCase().includes(term) ||
                item.category_name.toLowerCase().includes(term) ||
                item.variant_details?.toLowerCase().includes(term) ||
                item.variantId.toString().includes(term)
            );
        });
    }, [productList, searchTerm]);

    return (
        <div className="p-6 space-y-6 text-slate-100">
            {/* Header & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">產品目錄</h1>
                    <p className="text-sm text-slate-400 mt-1">
                        已載入的所有 Katana 產品與變體規格 ({productList.length} 項)
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                        onClick={() => refetchProducts()}
                        className="px-3.5 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
                    >
                        重新整理目錄
                    </button>
                    <div className="w-full sm:w-80">
                        <input
                            type="text"
                            placeholder="搜尋產品名稱、SKU 或類別..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition"
                        />
                    </div>
                </div>
            </div>

            {/* Loading / Error States */}
            {loading ? (
                <div className="flex justify-center items-center h-48 text-slate-400">
                    <p className="animate-pulse font-medium text-sm">
                        載入 Katana 產品目錄中...
                    </p>
                </div>
            ) : error ? (
                <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-lg text-red-200 text-sm">
                    <p className="font-semibold">無法讀取產品目錄</p>
                    <p className="text-xs font-mono mt-1 text-red-300">{error}</p>
                </div>
            ) : (
                /* Products Table */
                <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/50 shadow-sm">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-950 text-slate-400 font-medium text-xs uppercase tracking-wider border-b border-slate-800">
                            <tr>
                                <th className="py-3 px-4">產品名稱 / 規格</th>
                                <th className="py-3 px-4">SKU</th>
                                <th className="py-3 px-4">類別</th>
                                <th className="py-3 px-4 text-center">單位 (UOM)</th>
                                <th className="py-3 px-4 text-right">Variant ID</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-xs">
                            {filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">
                                        查無符合條件的產品。
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map((item) => (
                                    <tr key={item.variantId} className="hover:bg-slate-800/40 transition-colors">
                                        {/* Product Name & Variant Spec */}
                                        <td className="py-3 px-4 font-sans">
                                            <div className="font-medium text-slate-100 text-sm">
                                                {item.product_name}
                                                {item.variant_details && (
                                                    <span className="ml-2 text-xs text-slate-400 font-normal">
                                                        ({item.variant_details})
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* SKU */}
                                        <td className="py-3 px-4 font-mono text-slate-300">
                                            {item.sku}
                                        </td>

                                        {/* Category */}
                                        <td className="py-3 px-4 text-slate-400">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700/60">
                                                {item.category_name}
                                            </span>
                                        </td>

                                        {/* UOM */}
                                        <td className="py-3 px-4 text-center font-mono text-slate-400">
                                            {item.uom}
                                        </td>

                                        {/* Variant ID */}
                                        <td className="py-3 px-4 text-right font-mono text-slate-500">
                                            #{item.variantId}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};