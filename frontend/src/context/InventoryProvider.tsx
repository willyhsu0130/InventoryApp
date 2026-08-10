import { InventoryContext } from "./InventoryContext";
import {
    convertStockAdjustmentToCreatePayload,
    type KatanaStockAdjustment,
    type CreateStockAdjustmentPayload,
    type KatanaBatch,
    type KatanaCreateBatchInput,
    type KatanaInventoryItem
} from "../models/katana/inventory";
import { useCallback, useEffect, useMemo, useState } from "react";
import { katanaFetch } from "../lib/katanaFetch";
import { KATANA_API_ROUTES } from "../lib/routes/routes";
import { useError } from "../hooks/useError";

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [inventory, setInventory] = useState<Map<number, KatanaInventoryItem>>(new Map());
    const [batch, setBatch] = useState<Map<number, KatanaBatch>>(new Map());
    const [loading, setLoading] = useState<boolean>(true);
    const { setErrorMessage } = useError();

    // Shared refetch handler for background updates & manual triggers
    const refetchInventory = useCallback(async () => {
        const inventoryRes = await katanaFetch<KatanaInventoryItem[]>(KATANA_API_ROUTES.INVENTORY);

        if (inventoryRes.success && Array.isArray(inventoryRes.data)) {
            const iMap = new Map<number, KatanaInventoryItem>();
            inventoryRes.data.forEach((i) => iMap.set(i.variant_id, i));
            setInventory(iMap);
        } else {
            console.log("Failed to sync inv data");
            setErrorMessage("Failed to sync inventory data.");
        }
    }, [setErrorMessage]);

    const createBatch = useCallback(async (batchInput: KatanaCreateBatchInput) => {
        const res = await katanaFetch<KatanaBatch>(KATANA_API_ROUTES.BATCHES, {
            method: "POST",
            body: JSON.stringify(batchInput),
        });

        if (!res.success) {
            const errorMsg = res.message || "Failed to create batch";
            setErrorMessage(errorMsg);
            throw new Error(errorMsg);
        }

        if (res.data) {
            setBatch((prev) => new Map(prev).set(res.data.id, res.data));
        }

        return res.data;
    }, [setErrorMessage]);

    const createStockAdjustment = useCallback(async (stockAdjustment: CreateStockAdjustmentPayload) => {
        const payload = convertStockAdjustmentToCreatePayload(stockAdjustment);

        const res = await katanaFetch<KatanaStockAdjustment>(
            KATANA_API_ROUTES.STOCK_ADJUSTMENTS,
            { method: "POST", body: JSON.stringify(payload) }
        );

        if (!res.success || !res.data) {
            const errorMsg = "Failed to create stock adjustment";
            setErrorMessage(errorMsg);
            throw new Error(errorMsg);
        }

        const adjustment = res.data;

        // ⚡ Optimistically update local inventory state immediately
        setInventory((prevMap) => {
            const nextMap = new Map(prevMap);

            for (const row of adjustment.stock_adjustment_rows) {
                const existingItem = nextMap.get(row.variant_id);

                if (existingItem) {
                    const currentQty = parseFloat(existingItem.quantity_in_stock) || 0;
                    const newQty = currentQty + row.quantity;

                    nextMap.set(row.variant_id, {
                        ...existingItem,
                        quantity_in_stock: newQty.toString(),
                    });
                }
            }

            return nextMap;
        });

        return adjustment;
    }, [setErrorMessage]);

    // Initial mount load
    useEffect(() => {
        let isMounted = true;

        const loadInitialData = async () => {
            const [inventoryRes, batchRes] = await Promise.all([
                katanaFetch<KatanaInventoryItem[]>(KATANA_API_ROUTES.INVENTORY),
                katanaFetch<KatanaBatch[]>(KATANA_API_ROUTES.BATCH_STOCKS)
            ]);

            if (!isMounted) return;

            if (inventoryRes.success && Array.isArray(inventoryRes.data)) {
                const iMap = new Map<number, KatanaInventoryItem>();
                inventoryRes.data.forEach((i) => iMap.set(i.variant_id, i));
                setInventory(iMap);
            } else {
                setErrorMessage("Failed to load inventory data.");
            }

            if (batchRes.success && Array.isArray(batchRes.data)) {
                const bMap = new Map<number, KatanaBatch>();
                batchRes.data.forEach((b) => bMap.set(b.id, b));
                setBatch(bMap);
            }

            setLoading(false);
        };

        loadInitialData();

        return () => {
            isMounted = false;
        };
    }, [setErrorMessage]);

    const contextValue = useMemo(() => ({
        inventory,
        batch,
        loading,
        refetchInventory,
        createBatch,
        createStockAdjustment
    }), [inventory, batch, loading, refetchInventory, createBatch, createStockAdjustment]);

    return (
        <InventoryContext.Provider value={contextValue}>
            {children}
        </InventoryContext.Provider>
    );
};