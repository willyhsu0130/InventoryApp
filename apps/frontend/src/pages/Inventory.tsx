import { useState, useMemo, useRef } from "react";
import { Plus } from "lucide-react";
import { InventoryTable } from "../components/inventory/InventoryTable";
import { PageLayout } from "../components/PageLayout";
import { useError } from "../hooks/useError";
import {
    useInventoryCatalog,
    useProductCatalog,
    useVariant,
} from "../hooks/useContexts";
import type { KatanaInventoryItem } from "@my-inventory-app/shared";
import {
    CONTROL_INPUT,
    ERROR_PANEL,
    PLACEHOLDER_PANEL,
    PRIMARY_BUTTON,
} from "../lib/styles";
import { EditModal } from "@/components/EditModal";
import { StockAdjustment, type StockAdjustmentHandle } from "@/components/inventory/StockAdjustment";
import { Button } from "@/components/ui/button";
import { RefreshButton } from "@/components/RefreshButton";
import { InventorySectionNav } from "@/components/inventory/InventorySectionNav";

/** null = closed, undefined variant = blank adjustment, number = prefilled row. */
type AdjustmentTarget = { variantId: number | null } | null;

export const Inventory = () => {
    // 1. Consume inventory catalog and product context
    const { inventoryItems, loading: inventoryLoading, refetchInventory } = useInventoryCatalog();
    const { products, loading: productsLoading } = useProductCatalog();
    const { variants, loading: variantsLoading } = useVariant();

    const { errorMessage } = useError();
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [adjustmentTarget, setAdjustmentTarget] = useState<AdjustmentTarget>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    const stockAdjustmentRef = useRef<StockAdjustmentHandle>(null);

    // 2. Explicitly type inventoryList
    const inventoryList = useMemo<KatanaInventoryItem[]>(() => {
        return Array.from(inventoryItems.values());
    }, [inventoryItems]);

    // 3. Filter across Variant ID, Product Name, SKU, and Variant Details
    const filteredItems = useMemo<KatanaInventoryItem[]>(() => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return inventoryList;

        return inventoryList.filter((item: KatanaInventoryItem) => {
            const variant = variants.get(item.variant_id);
            const product = variant ? products.get(variant.product_id) : undefined;

            const productNameMatch = product?.name.toLowerCase().includes(term);
            const skuMatch = variant?.sku?.toLowerCase().includes(term);
            const variantDetailsMatch = variant?.config_attributes?.some(
                (attr) => attr.config_value?.toLowerCase().includes(term)
            );
            const variantIdMatch = item.variant_id.toString().includes(term);
            const locationIdMatch = item.location_id.toString().includes(term);

            return Boolean(
                productNameMatch ||
                variantDetailsMatch ||
                skuMatch ||
                variantIdMatch ||
                locationIdMatch
            );
        });
    }, [inventoryList, searchTerm, products, variants]);

    const isGlobalLoading = inventoryLoading || productsLoading || variantsLoading;

    return (
        <PageLayout
            id="inventoryPage"
            title="庫存"
            subnav={<InventorySectionNav />}
            actions={
                <>
                    <Button
                        onClick={() => setAdjustmentTarget({ variantId: null })}
                        className={PRIMARY_BUTTON}
                    >
                        <Plus width="14" height="14" />
                        調整庫存
                    </Button>

                    <RefreshButton label="重新整理庫存" onClick={() => refetchInventory()} />

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
            }
        >
            {isGlobalLoading ? (
                <div className={PLACEHOLDER_PANEL}>準備畫面中</div>
            ) : errorMessage ? (
                <div className={ERROR_PANEL}>
                    <p className="font-semibold">無法讀取庫存</p>
                    <p className="text-xs font-mono mt-1 text-red-300">{errorMessage}</p>
                </div>
            ) : (
                /* Inventory Table */
                <InventoryTable
                    items={filteredItems}
                    onRowClick={(variantId) => setAdjustmentTarget({ variantId })}
                />
            )}

            <EditModal
                showSaveButton={true}
                title="調整庫存"
                isOpen={adjustmentTarget !== null}
                onClose={() => setAdjustmentTarget(null)}
                isSaving={isSaving}
                onSave={() => stockAdjustmentRef.current?.submit()}
            >
                <StockAdjustment
                    onSavingChange={setIsSaving}
                    items={inventoryList}
                    ref={stockAdjustmentRef}
                    onSuccess={async () => {
                        setAdjustmentTarget(null);
                    }}
                    initialVariantId={adjustmentTarget?.variantId}
                />
            </EditModal>
        </PageLayout>
    );
};