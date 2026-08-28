import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Plus, PackagePlus, SearchX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { InventoryTable } from "../components/inventory/InventoryTable";
import { PageLayout } from "../components/PageLayout";
import type { Product, Variant } from "@my-inventory-app/shared";
import { getActiveProducts } from "@/services/productService";
import { getActiveVariants } from "@/services/variantService";
import { getTotalStockByVariantId } from "@/services/inventoryLevelService";
import {
    CONTROL_INPUT,
    ERROR_PANEL,
    PRIMARY_BUTTON,
} from "../lib/styles";
import { EditModal } from "@/components/EditModal";
import { InventoryMovement, type InventoryMovementHandle } from "@/components/inventory/InventoryMovement";
import { Button } from "@/components/ui/button";
import { RefreshButton } from "@/components/RefreshButton";
import { InventorySectionNav } from "@/components/inventory/InventorySectionNav";

export interface DisplayInventoryRow {
    variantId: number;
    productId: number;
    productName: string;
    displayName: string;
    sku: string;
    uom: string;
    inStock: number;
    configValues: string[];
}

type AdjustmentTarget = { variantId: number | null } | null;

async function loadInventoryCatalog(): Promise<DisplayInventoryRow[]> {
    const [variants, products] = await Promise.all([
        getActiveVariants(),
        getActiveProducts(),
    ]);

    const productMap = new Map<number, Product>();
    products.forEach((p) => productMap.set(p.id, p));

    return Promise.all(
        variants.map(async (variant: Variant): Promise<DisplayInventoryRow> => {
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

            const inStock = await getTotalStockByVariantId(variant.id).catch(() => 0);

            return {
                variantId: variant.id,
                productId: variant.productId,
                productName: parentName,
                displayName,
                sku: variant.sku ?? "",
                uom,
                inStock,
                configValues,
            };
        })
    );
}

export const Inventory = () => {
    const navigate = useNavigate();
    const [items, setItems] = useState<DisplayInventoryRow[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState<string>("");
    const [adjustmentTarget, setAdjustmentTarget] = useState<AdjustmentTarget>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    const stockAdjustmentRef = useRef<InventoryMovementHandle>(null);

    const refreshInventory = useCallback(async () => {
        setIsLoading(true);
        setErrorMessage(null);
        try {
            const data = await loadInventoryCatalog();
            setItems(data);
        } catch (err) {
            setErrorMessage(
                err instanceof Error ? err.message : "無法載入庫存資訊。"
            );
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        loadInventoryCatalog()
            .then((data) => {
                if (isMounted) {
                    setItems(data);
                    setIsLoading(false);
                }
            })
            .catch((err) => {
                if (isMounted) {
                    setErrorMessage(
                        err instanceof Error ? err.message : "無法載入庫存資訊。"
                    );
                    setIsLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, []);

    const filteredItems = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return items;

        return items.filter((item) => {
            return (
                item.displayName.toLowerCase().includes(term) ||
                item.productName.toLowerCase().includes(term) ||
                item.sku.toLowerCase().includes(term) ||
                item.variantId.toString().includes(term) ||
                item.configValues.some((val) => val.toLowerCase().includes(term))
            );
        });
    }, [items, searchTerm]);

    const handleCloseAdjustmentModal = async () => {
        if (isSaving) return;
        setAdjustmentTarget(null);
        await refreshInventory();
    };

    return (
        <PageLayout
            id="inventoryPage"
            title="庫存"
            subnav={<InventorySectionNav />}
            actions={
                items.length > 0 ? (
                    <>
                        <Button
                            onClick={() => setAdjustmentTarget({ variantId: null })}
                            className={PRIMARY_BUTTON}
                        >
                            <Plus width="14" height="14" />
                            調整庫存
                        </Button>

                        <RefreshButton label="重新整理庫存" onClick={refreshInventory} />

                        <div className="w-full sm:w-80">
                            <input
                                type="text"
                                placeholder="搜尋產品, SKU, 樣式, 或 ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={CONTROL_INPUT}
                            />
                        </div>
                    </>
                ) : undefined
            }
        >
            <div className="flex-1 w-full min-h-0 flex flex-col">
                {isLoading ? (
                    <div className="flex-1 flex justify-center items-center text-slate-400">
                        <p className="animate-pulse font-medium text-sm">準備畫面中...</p>
                    </div>
                ) : errorMessage ? (
                    <div className={ERROR_PANEL}>
                        <p className="font-semibold">無法讀取庫存</p>
                        <p className="text-xs font-mono mt-1 text-red-300">{errorMessage}</p>
                    </div>
                ) : items.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl p-8 text-center bg-slate-900/20">
                        <div className="p-4 bg-slate-800/80 rounded-full mb-4 text-slate-400">
                            <PackagePlus className="w-10 h-10 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">目前尚無庫存品項</h3>
                        <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">
                            系統尚未建立任何產品款式。請先前往產品目錄新增產品，庫存清單將會自動產生。
                        </p>
                        <Button
                            type="button"
                            size="lg"
                            onClick={() => navigate("/products")}
                            className="mt-6 gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            前往建立產品
                        </Button>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center border border-slate-800 rounded-xl p-8 text-center">
                        <SearchX className="w-10 h-10 text-muted-foreground mb-3" />
                        <p className="text-base font-medium text-foreground">找不到符合「{searchTerm}」的庫存品項</p>
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
                    <InventoryTable
                        items={filteredItems}
                        onRowClick={(variantId) => setAdjustmentTarget({ variantId })}
                    />
                )}
            </div>

            <EditModal
                showSaveButton={true}
                title="調整庫存"
                isOpen={adjustmentTarget !== null}
                onClose={handleCloseAdjustmentModal}
                isSaving={isSaving}
                onSave={() => stockAdjustmentRef.current?.submit()}
            >
                <InventoryMovement
                    onSavingChange={setIsSaving}
                    items={items}
                    ref={stockAdjustmentRef}
                    onSuccess={async () => {
                        setAdjustmentTarget(null);
                        await refreshInventory();
                    }}
                    initialVariantId={adjustmentTarget?.variantId}
                />
            </EditModal>
        </PageLayout>
    );
};