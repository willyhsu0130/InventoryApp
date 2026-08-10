import { InventoryContext } from "./InventoryContext";
import { convertStockAdjustmentToCreatePayload, type KatanaStockAdjustment, type CreateStockAdjustmentPayload, type KatanaBatch, type KatanaCreateBatchInput, type KatanaInventoryItem } from "../models/katana";
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
        console.log("Refetching inventory")

        const inventoryRes = await katanaFetch<KatanaInventoryItem[]>(KATANA_API_ROUTES.INVENTORY);
        console.log(inventoryRes)

        if (inventoryRes.success && Array.isArray(inventoryRes.data)) {
            const iMap = new Map<number, KatanaInventoryItem>();
            inventoryRes.data.forEach((i) => iMap.set(i.variant_id, i));
            setInventory(iMap);

        } else {
            console.log("Failed to sync inv data")
            setErrorMessage("Failed to sync inventory data.");
        }
    }, [setErrorMessage]);

    const createBatch = useCallback(async (batch: KatanaCreateBatchInput) => {
        const res = await katanaFetch<KatanaBatch>(KATANA_API_ROUTES.BATCHES, {
            method: "POST",
            body: JSON.stringify(batch),
        });

        if (!res.success) {
            const errorMsg = res.message || "Failed to create batch";
            setErrorMessage(errorMsg);
            throw new Error(errorMsg); // Rethrow so the form can keep the user's input
        }

        return res.data;

    }, [setErrorMessage])

    const createStockAdjustment = useCallback(async (stockAdjustment: CreateStockAdjustmentPayload) => {
        const payload = convertStockAdjustmentToCreatePayload(stockAdjustment)

        const res = await katanaFetch<KatanaStockAdjustment>(
            KATANA_API_ROUTES.STOCK_ADJUSTMENTS,
            { method: "POST", body: JSON.stringify(payload) }
        );
        if (!res.success) {
            const errorMsg = res.message || "Failed to create stock adjustment";
            setErrorMessage(errorMsg);
            throw new Error(errorMsg); // Rethrow so the form can keep the user's input
        }
        return res.data
    }, [setErrorMessage])

    // Initial mount load using unmount flag safety
    useEffect(() => {
        let isMounted = true;

        const loadInitialInventory = async () => {
            const inventoryRes = await katanaFetch<KatanaInventoryItem[]>(KATANA_API_ROUTES.INVENTORY);

            if (!isMounted) return;

            if (inventoryRes.success && Array.isArray(inventoryRes.data)) {
                const iMap = new Map<number, KatanaInventoryItem>();
                inventoryRes.data.forEach((i) => iMap.set(i.variant_id, i));
                setInventory(iMap);
            } else {
                setErrorMessage("Failed to load inventory data.");
            }

            setLoading(false);
        };

        const loadIntialBatch = async () => {
            const batchRes = await katanaFetch<KatanaBatch[]>(KATANA_API_ROUTES.BATCH_STOCKS)
            if (!isMounted) return;

            if (batchRes.success && Array.isArray(batchRes.data)) {
                const bMap = new Map<number, KatanaBatch>();
                batchRes.data.forEach((i) => bMap.set(i.variant_id, i));
                setBatch(bMap);
            } else {
                setErrorMessage("Failed to load inventory data.");
            }

            setLoading(false);
        }

        loadInitialInventory();
        loadIntialBatch()

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
    }), [inventory, loading, refetchInventory, batch, createBatch, createStockAdjustment]);

    return (
        <InventoryContext.Provider value={contextValue}>
            {children}
        </InventoryContext.Provider>
    );
};