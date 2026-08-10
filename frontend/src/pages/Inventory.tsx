import { useState, useMemo, useContext, useRef } from "react";
import { Plus } from "lucide-react";
import { ProductContext } from "../context/ProductContext";
import { InventoryTable } from "../components/inventory/InventoryTable";
import { PageLayout } from "../components/PageLayout";
import { useError } from "../hooks/useError";
import {
    CONTROL_INPUT,
    ERROR_PANEL,
    PLACEHOLDER_PANEL,
    PRIMARY_BUTTON,
    TOOLBAR_BUTTON,
} from "../lib/styles";
import { useInventoryCatalog } from "../hooks/useContexts";
import { EditModal } from "@/components/EditModal";
import { StockAdjustment, type StockAdjustmentHandle } from "@/components/inventory/StockAdjustment";

/** null = closed, undefined variant = blank adjustment, number = prefilled row. */
type AdjustmentTarget = { variantId: number | null } | null;

export const Inventory = () => {
    // 1. Consume inventory catalog and product context
    const { inventory, loading, refetchInventory } = useInventoryCatalog();
    const productCtx = useContext(ProductContext);

    const { errorMessage } = useError();
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [adjustmentTarget, setAdjustmentTarget] = useState<AdjustmentTarget>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    const stockAdjustmentRef = useRef<StockAdjustmentHandle>(null);
    const inventoryList = useMemo(() => {
        return Array.from(inventory.values());
    }, [inventory]);

    // 3. Filter across Variant ID, Product Name, SKU, and Variant Details
    const filteredItems = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return inventoryList;

        return inventoryList.filter((item) => {
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
    }, [inventoryList, searchTerm, productCtx]);

    const isGlobalLoading = loading || (productCtx?.loading ?? false);

    return (
        <PageLayout
            id="inventoryPage"
            title="庫存"
            actions={
                <>
                    <button
                        onClick={() => setAdjustmentTarget({ variantId: null })}
                        className={PRIMARY_BUTTON}
                    >
                        <Plus width="14" height="14" />
                        調整庫存
                    </button>

                    <button onClick={() => refetchInventory()} className={TOOLBAR_BUTTON}>
                        重新整理庫存
                    </button>

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
                        await refetchInventory(); // 1. Refresh table data
                        setAdjustmentTarget(null); // 2. Close the modal!
                    }}
                    initialVariantId={adjustmentTarget?.variantId}
                />
            </EditModal>
        </PageLayout>
    );
};