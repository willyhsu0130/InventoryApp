import { useState, useMemo, useRef } from "react";
import { useProductCatalog, useVariant } from "../hooks/useContexts";
import { ProductsTable } from "../components/products/ProductsTable";
import { Plus } from "lucide-react";
import { useError } from "../hooks/useError";
import { EditModal } from "../components/EditModal";
import { EditProduct, type EditProductHandle } from "../components/products/EditProduct";
import {
    UNSAVED_PRODUCT_ID,
    type KatanaProduct,
    type VariantConfigAttribute,
    type ProductVariant,
} from "@my-inventory-app/shared";
import { Button } from "@/components/ui/button";
import { RefreshButton } from "@/components/RefreshButton";
import { CONTROL_INPUT } from "@/lib/styles";

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
    const { products, loading: productsLoading, refetchProducts, deleteProduct } = useProductCatalog();
    const { variants, loading: variantsLoading, refetchVariants } = useVariant();
    const { errorMessage } = useError();

    const [searchTerm, setSearchTerm] = useState<string>("");
    // selectedProductId: null = closed, UNSAVED_PRODUCT_ID = create mode, >0 = edit mode
    const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const editProductRef = useRef<EditProductHandle>(null);

    const isCreating = selectedProductId === UNSAVED_PRODUCT_ID;
    const isLoading = productsLoading || variantsLoading;

    const handleCreateProduct = () => {
        setSelectedProductId(UNSAVED_PRODUCT_ID);
    };

    const handleDeleteProduct = async () => {
        if (!selectedProductId) return;
        await deleteProduct(selectedProductId);
        setSelectedProductId(null);
    };

    const handleCloseModal = () => {
        if (isSaving) return;
        setSelectedProductId(null);
    };

    const handleRefresh = async () => {
        await Promise.all([refetchProducts(), refetchVariants()]);
    };

    // Group variants by product_id for fast O(1) lookup
    const productList = useMemo<DisplayProductRow[]>(() => {
        const variantsByProductId = new Map<number, ProductVariant[]>();

        variants.forEach((variant: ProductVariant) => {
            const list = variantsByProductId.get(variant.product_id);
            if (list) {
                list.push(variant);
            } else {
                variantsByProductId.set(variant.product_id, [variant]);
            }
        });

        return Array.from(products.values()).flatMap((product: KatanaProduct): DisplayProductRow[] => {
            const productVariants: ProductVariant[] = variantsByProductId.get(product.id) ?? [];

            // Fallback row if product has no variants configured
            if (productVariants.length === 0) {
                return [
                    {
                        id: product.id,
                        variantId: -1,
                        name: product.name,
                        sku: "",
                        salesPrice: 0,
                        purchasePrice: 0,
                        uom: product.uom ?? "pcs",
                        configValues: [],
                        categoryName: product.category_name ?? undefined,
                    },
                ];
            }

            return productVariants.map((variant: ProductVariant): DisplayProductRow => {
                const configValues: string[] = (variant.config_attributes ?? [])
                    .map((attr: VariantConfigAttribute) => attr.config_value)
                    .filter((val: string): boolean => Boolean(val?.trim()));

                const displayName =
                    configValues.length > 0
                        ? `${product.name} - ${configValues.join(" / ")}`
                        : product.name;

                return {
                    id: product.id,
                    variantId: variant.id,
                    name: displayName,
                    sku: variant.sku ?? "",
                    salesPrice: variant.sales_price ?? 0,
                    purchasePrice: variant.purchase_price ?? 0,
                    uom: product.uom ?? "pcs",
                    configValues,
                    categoryName: product.category_name ?? undefined,
                };
            });
        });
    }, [products, variants]);

    // Filter across Name, SKU, ID, or Category
    const filteredProducts = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return productList;

        return productList.filter((item) => {
            return (
                item.name.toLowerCase().includes(term) ||
                item.sku.toLowerCase().includes(term) ||
                item.categoryName?.toLowerCase().includes(term) ||
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
                    <RefreshButton label="重新整理目錄" onClick={handleRefresh} />

                    {/* Search Input Container */}
                    <div className="w-full sm:w-80">
                        <input
                            type="text"
                            placeholder="搜尋產品名稱、SKU 或類別..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={CONTROL_INPUT}
                        />
                    </div>

                    {/* Plus Button */}
                    <Button
                        id="createButton"
                        type="button"
                        variant="secondary"
                        size="icon"
                        onClick={handleCreateProduct}
                    >
                        <Plus width="14" height="14" />
                    </Button>
                </div>
            </div>

            {/* Loading / Error / Table States */}
            <div className="flex-1 w-full min-h-0" id="bottomContainer">
                {isLoading ? (
                    <div className="flex justify-center items-center h-48 text-slate-400">
                        <p className="animate-pulse font-medium text-sm">
                            準備畫面中...
                        </p>
                    </div>
                ) : errorMessage ? (
                    <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-lg text-red-200 text-sm">
                        <p className="font-semibold">無法讀取產品目錄</p>
                        <p className="text-xs font-mono mt-1 text-red-300">{errorMessage}</p>
                    </div>
                ) : (
                    <ProductsTable
                        items={filteredProducts}
                        onRowClick={(id) => setSelectedProductId(id)}
                    />
                )}
            </div>

            <EditModal
                isOpen={selectedProductId !== null}
                title={isCreating ? "新增產品" : "編輯產品"}
                onClose={handleCloseModal}
                onSave={() => editProductRef.current?.submit()}
                onDelete={handleDeleteProduct}
                showSaveButton={isCreating}
                isSaving={isSaving}
            >
                {selectedProductId !== null && (
                    <EditProduct
                        key={selectedProductId}
                        ref={editProductRef}
                        id={selectedProductId}
                        onSavingChange={setIsSaving}
                        onCreated={() => setSelectedProductId(null)}
                    />
                )}
            </EditModal>
        </div>
    );
};