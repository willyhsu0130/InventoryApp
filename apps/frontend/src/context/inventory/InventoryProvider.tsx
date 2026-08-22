import {
    useState,
    useCallback,
    useEffect,
    type FC,
    type ReactNode,
} from "react";
import { InventoryContext } from "./InventoryContext";
import { inventoryService } from "@/services/inventoryMovementService"
import type {
    KatanaInventoryItem,
    KatanaBatch,
    KatanaStockAdjustment,
    KatanaCreateBatchInput,
    KatanaUpdateBatchInput,
    KatanaStockAdjustmentInput,
} from "@my-inventory-app/shared";
import { useError } from "../../hooks/useError";

function getErrorMessage(err: unknown, fallback: string): string {
    if (err instanceof Error) return err.message;
    if (typeof err === "object" && err !== null && "message" in err) {
        return String((err as { message: unknown }).message);
    }
    return fallback;
}

export const InventoryProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [inventoryItems, setInventoryItems] = useState<Map<number, KatanaInventoryItem>>(new Map());
    const [batches, setBatches] = useState<Map<number, KatanaBatch>>(new Map());
    const [stockAdjustments, setStockAdjustments] = useState<Map<number, KatanaStockAdjustment>>(new Map());
    const [loading, setLoading] = useState<boolean>(true);
    const { setErrorMessage } = useError();

    // 1. Unified Sync Handler
    const refetchInventory = useCallback(async () => {
        try {
            const [invData, batchData, adjData] = await Promise.all([
                inventoryService.getInventoryLevels(),
                inventoryService.getBatches(),
                inventoryService.getStockAdjustments(),
            ]);

            const invMap = new Map<number, KatanaInventoryItem>();
            invData.forEach((item) => invMap.set(item.variant_id, item));
            setInventoryItems(invMap);

            const bMap = new Map<number, KatanaBatch>();
            batchData.forEach((b) => bMap.set(b.id, b));
            setBatches(bMap);

            const adjMap = new Map<number, KatanaStockAdjustment>();
            adjData.forEach((adj) => adjMap.set(adj.id, adj));
            setStockAdjustments(adjMap);
        } catch (err: unknown) {
            setErrorMessage(getErrorMessage(err, "Failed to sync inventory data."));
        }
    }, [setErrorMessage]);

    // Initial fetch on mount
    useEffect(() => {
        let isMounted = true;

        const loadInitialData = async () => {
            await refetchInventory();
            if (isMounted) setLoading(false);
        };

        void loadInitialData();

        return () => {
            isMounted = false;
        };
    }, [refetchInventory]);

    // 2. Batch Methods
    const createBatch = useCallback(
        async (input: KatanaCreateBatchInput): Promise<KatanaBatch> => {
            try {
                const created = await inventoryService.createBatch(input);
                setBatches((prev) => new Map(prev).set(created.id, created));
                return created;
            } catch (err: unknown) {
                const msg = getErrorMessage(err, "Failed to create batch");
                setErrorMessage(msg);
                throw new Error(msg, { cause: err });
            }
        },
        [setErrorMessage]
    );

    const updateBatch = useCallback(
        async (id: number, input: KatanaUpdateBatchInput): Promise<KatanaBatch> => {
            try {
                const updated = await inventoryService.updateBatch(id, input);
                setBatches((prev) => new Map(prev).set(updated.id, updated));
                return updated;
            } catch (err: unknown) {
                const msg = getErrorMessage(err, "Failed to update batch");
                setErrorMessage(msg);
                throw new Error(msg, { cause: err });
            }
        },
        [setErrorMessage]
    );

    const deleteBatch = useCallback(
        async (id: number): Promise<void> => {
            try {
                await inventoryService.deleteBatch(id);
                setBatches((prev) => {
                    const next = new Map(prev);
                    next.delete(id);
                    return next;
                });
            } catch (err: unknown) {
                const msg = getErrorMessage(err, "Failed to delete batch");
                setErrorMessage(msg);
                throw new Error(msg, { cause: err });
            }
        },
        [setErrorMessage]
    );

    // 3. Stock Adjustment Methods
    const createStockAdjustment = useCallback(
        async (input: KatanaStockAdjustmentInput): Promise<KatanaStockAdjustment> => {
            try {
                const created = await inventoryService.createStockAdjustment(input);
                setStockAdjustments((prev) => new Map(prev).set(created.id, created));
                // Refresh inventory levels to show updated stock
                await refetchInventory();
                return created;
            } catch (err: unknown) {
                const msg = getErrorMessage(err, "Failed to create stock adjustment");
                setErrorMessage(msg);
                throw new Error(msg, { cause: err });
            }
        },
        [refetchInventory, setErrorMessage]
    );

    const updateStockAdjustment = useCallback(
        async (
            id: number,
            input: Partial<KatanaStockAdjustment>
        ): Promise<KatanaStockAdjustment> => {
            try {
                const updated = await inventoryService.updateStockAdjustment(id, input);
                setStockAdjustments((prev) => new Map(prev).set(updated.id, updated));
                return updated;
            } catch (err: unknown) {
                const msg = getErrorMessage(err, "Failed to update stock adjustment");
                setErrorMessage(msg);
                throw new Error(msg, { cause: err });
            }
        },
        [setErrorMessage]
    );

    const deleteStockAdjustment = useCallback(
        async (id: number): Promise<void> => {
            try {
                await inventoryService.deleteStockAdjustment(id);
                setStockAdjustments((prev) => {
                    const next = new Map(prev);
                    next.delete(id);
                    return next;
                });
            } catch (err: unknown) {
                const msg = getErrorMessage(err, "Failed to delete stock adjustment");
                setErrorMessage(msg);
                throw new Error(msg, { cause: err });
            }
        },
        [setErrorMessage]
    );

    return (
        <InventoryContext.Provider
            value={{
                inventoryItems,
                batches,
                stockAdjustments,
                loading,
                refetchInventory,
                createBatch,
                updateBatch,
                deleteBatch,
                createStockAdjustment,
                updateStockAdjustment,
                deleteStockAdjustment,
            }}
        >
            {children}
        </InventoryContext.Provider>
    );
};