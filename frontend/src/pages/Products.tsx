// src/pages/Products.tsx
import { useState, useMemo } from "react";
import { useProductCatalog } from "../hooks/useContexts";
import { ProductsTable, } from "../components/products/ProductsTable";
import { Plus } from "lucide-react";

export interface DisplayProductRow {
    id: number;              // Product ID
    variantId: number;       // Variant ID
    name: string;            // Formatted Name (e.g. "金目鱸魚 - 三去")
    sku: string;             // SKU string or empty string
    salesPrice: number;
    purchasePrice: number;
    uom: string;             // Unit of measure (e.g. "pcs", "box")
    configValues: string[];  // Raw variant attribute values
    categoryName?: string;   // Optional category name if present
}


export const Products = () => {
    const { products, loading, error, refetchProducts } = useProductCatalog();
    const [searchTerm, setSearchTerm] = useState<string>("");
    const handleCreateProduct = () => {

    }

    const productList = useMemo<DisplayProductRow[]>(() => {
        return Array.from(products.values()).flatMap((product) => {
            const variantsList = product.variants || [];

            return variantsList.map((variant) => {
                // Extract config values (e.g., ["三去"] or ["蝶切", "真空"])
                const configValues = (variant.config_attributes || [])
                    .map((attr) => attr.config_value)
                    .filter(Boolean);

                // Append config value to product name if variant has configs,
                // otherwise keep base product name (e.g., "金目鱸魚下巴")
                const displayName = configValues.length > 0
                    ? `${product.name} - ${configValues.join(" / ")}`
                    : product.name;

                return {
                    id: product.id,                  // Product Parent ID (e.g., 17667981)
                    variantId: variant.id,          // Unique Variant ID (e.g., 41466914)
                    name: displayName,              // "金目鱸魚 - 三去" or "金目鱸魚下巴"
                    sku: variant.sku ?? "",
                    salesPrice: variant.sales_price ?? 0,
                    purchasePrice: variant.purchase_price ?? 0,
                    uom: product.uom,               // "box" or "pcs"
                    configValues,                    // Raw array of option values if needed for badges/filters
                };
            });
        });
    }, [products]);



    // Search filter across Product Name, SKU, Category, or Variant Spec
    const filteredProducts = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return productList;

        return productList.filter((item) => {
            return (
                item.name.toLowerCase().includes(term) ||
                item.sku.toLowerCase().includes(term) ||
                // item.category_name.toLowerCase().includes(term) ||
                // item.variant_details?.toLowerCase().includes(term) ||
                item.variantId.toString().includes(term) ||
                item.id.toString().includes(term)
            );
        });
    }, [productList, searchTerm]);



    return (
        <div className="p-6 space-y-6 text-slate-100 flex flex-col h-full min-h-0" id="productsPage">
            {/* Header & Search */}
            <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-black">產品目錄</h1>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* Refresh Button */}
                    <button
                        onClick={() => refetchProducts()}
                        className="h-9 px-3.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition shrink-0 flex items-center justify-center"
                    >
                        重新整理目錄
                    </button>

                    {/* Search Input Container */}
                    <div className="w-full sm:w-80">
                        <input
                            type="text"
                            placeholder="搜尋產品名稱、SKU 或類別..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-9 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition"
                        />
                    </div>

                    {/* Plus Button */}
                    <button
                        onClick={() => handleCreateProduct}
                        className="h-9 w-9 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition shrink-0 flex items-center justify-center"
                    >
                        <Plus width="14" height="14" />
                    </button>
                </div>
            </div>

            {/* Loading / Error States */}
            <div className="flex-1 w-full min-h-0" id="bottomContainer">
                {loading ? (
                    <div className="flex justify-center items-center h-48 text-slate-400">
                        <p className="animate-pulse font-medium text-sm">
                            準備畫面中
                        </p>
                    </div>
                ) : error ? (
                    <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-lg text-red-200 text-sm">
                        <p className="font-semibold">無法讀取產品目錄</p>
                        <p className="text-xs font-mono mt-1 text-red-300">{error}</p>
                    </div>
                ) : (
                    /* Products Table */
                    <ProductsTable items={filteredProducts} />
                )}
            </div>
        </div>
    );
};