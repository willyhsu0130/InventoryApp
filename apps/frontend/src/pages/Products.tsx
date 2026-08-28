import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { ProductsTable } from "../components/products/ProductsTable";
import { Plus, PackageOpen, SearchX } from "lucide-react";
import { EditModal } from "../components/EditModal";
import { EditProduct, type EditProductHandle } from "../components/products/EditProduct";
import type { Product, Variant } from "@my-inventory-app/shared";
import { getActiveProducts, deleteProduct } from "@/services/productService";
import { getActiveVariants } from "@/services/variantService";
import { Button } from "@/components/ui/button";
import { RefreshButton } from "@/components/RefreshButton";
import { CONTROL_INPUT, ERROR_PANEL } from "@/lib/styles";

const UNSAVED_PRODUCT_ID = -1;

export interface DisplayProductRow {
    id: number;              // Product ID
    variantId: number;       // Variant ID
    name: string;            // Formatted Name (e.g. "金目鱸魚 - 三去")
    sku: string;             // SKU string
    salesPrice: number;
    purchasePrice: number;
    uom: string;             // Unit of measure
    configValues: string[];  // Raw variant attribute values
}

async function loadCatalogRows(): Promise<DisplayProductRow[]> {
    const [variants, products] = await Promise.all([
        getActiveVariants(),
        getActiveProducts(),
    ]);

    const productMap = new Map<number, Product>();
    products.forEach((p) => productMap.set(p.id, p));

    return variants.map((variant: Variant): DisplayProductRow => {
        const parentProduct = productMap.get(variant.productId);
        const parentName = parentProduct?.name ?? "未命名產品";
        const uom = parentProduct?.uom ?? "pcs";

        const configValues: string[] = (variant.configs ?? [])
            .map((c) => c.value)
            .filter((val): boolean => Boolean(val?.trim()));

        const displayName =
            configValues.length > 0
                ? `${parentName} - ${configValues.join(" / ")}`
                : parentName;

        return {
            id: variant.productId,
            variantId: variant.id,
            name: displayName,
            sku: variant.sku ?? "",
            salesPrice: variant.salesPrice ?? 0,
            purchasePrice: 0,
            uom,
            configValues,
        };
    });
}

export const Products = () => {
    const [rows, setRows] = useState<DisplayProductRow[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState<string>("");
    const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const editProductRef = useRef<EditProductHandle>(null);

    const isCreating = selectedProductId === UNSAVED_PRODUCT_ID;

    const refreshCatalog = useCallback(async () => {
        setIsLoading(true);
        setErrorMessage(null);
        try {
            const displayRows = await loadCatalogRows();
            setRows(displayRows);
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : "Failed to load product catalog.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        loadCatalogRows()
            .then((displayRows) => {
                if (isMounted) {
                    setRows(displayRows);
                    setIsLoading(false);
                }
            })
            .catch((err) => {
                if (isMounted) {
                    setErrorMessage(err instanceof Error ? err.message : "Failed to load product catalog.");
                    setIsLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, []);

    const handleCreateProduct = () => {
        setSelectedProductId(UNSAVED_PRODUCT_ID);
    };

    const handleDeleteProduct = async () => {
        if (!selectedProductId || selectedProductId === UNSAVED_PRODUCT_ID) return;
        try {
            await deleteProduct(selectedProductId);
            setSelectedProductId(null);
            await refreshCatalog();
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : "Failed to delete product.");
        }
    };

    const handleCloseModal = () => {
        if (isSaving) return;
        setSelectedProductId(null);
        refreshCatalog();
    };

    const filteredProducts = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return rows;

        return rows.filter((item) => {
            return (
                item.name.toLowerCase().includes(term) ||
                item.sku.toLowerCase().includes(term) ||
                item.variantId.toString().includes(term) ||
                item.id.toString().includes(term)
            );
        });
    }, [rows, searchTerm]);

    return (
        <div className="p-6 space-y-6 flex flex-col h-full min-h-0 bg-background text-foreground" id="productsPage">
            {/* Header & Search */}
            <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">產品目錄</h1>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <RefreshButton label="重新整理目錄" onClick={refreshCatalog} />

                    <div className="w-full sm:w-80">
                        <input
                            type="text"
                            placeholder="搜尋產品名稱、SKU 或編號..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={CONTROL_INPUT}
                        />
                    </div>

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

            {/* Content Table / Empty State (Full-height Flex container) */}
            <div className="flex-1 w-full min-h-0 flex flex-col" id="bottomContainer">
                {isLoading ? (
                    <div className="flex-1 flex justify-center items-center text-muted-foreground">
                        <p className="animate-pulse font-medium text-sm">
                            準備畫面中...
                        </p>
                    </div>
                ) : errorMessage ? (
                    <div className={ERROR_PANEL}>
                        <p className="font-semibold">無法讀取產品目錄</p>
                        <p className="text-xs font-mono mt-1 text-destructive">{errorMessage}</p>
                    </div>
                ) : rows.length === 0 ? (
                    /* Full-Height Clean White/Background Empty State */
                    <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-border rounded-xl p-8 text-center bg-background">
                        <div className="p-4 bg-muted rounded-full mb-4 text-muted-foreground">
                            <PackageOpen className="w-10 h-10 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">目前尚無任何產品</h3>
                        <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">
                            建立您的第一項產品以開始管理規格、款式及庫存追蹤。
                        </p>
                        <Button
                            type="button"
                            size="lg"
                            onClick={handleCreateProduct}
                            className="mt-6 gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            新增產品
                        </Button>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    /* Full-Height Clean White/Background Search Filter Empty State */
                    <div className="flex-1 flex flex-col items-center justify-center border border-border rounded-xl p-8 text-center bg-background">
                        <SearchX className="w-10 h-10 text-muted-foreground mb-3" />
                        <p className="text-base font-medium text-foreground">找不到符合「{searchTerm}」的產品</p>
                        <Button
                            variant="link"
                            size="sm"
                            onClick={() => setSearchTerm("")}
                            className="mt-2 text-primary"
                        >
                            清除搜尋條件
                        </Button>
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
                        onCreated={async () => {
                            setSelectedProductId(null);
                            await refreshCatalog();
                        }}
                    />
                )}
            </EditModal>
        </div>
    );
};