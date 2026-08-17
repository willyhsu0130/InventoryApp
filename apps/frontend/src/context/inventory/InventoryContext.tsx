import { createContext } from "react";
import type {
    KatanaInventoryItem,
    KatanaBatch,
    KatanaStockAdjustment,
    KatanaCreateBatchInput,
    KatanaUpdateBatchInput,
    KatanaStockAdjustmentInput,
} from "@my-inventory-app/shared";

export interface InventoryContextType {
    inventoryItems: Map<number, KatanaInventoryItem>; // Key: variant_id
    batches: Map<number, KatanaBatch>;               // Key: batch_id
    stockAdjustments: Map<number, KatanaStockAdjustment>; // Key: adjustment_id
    loading: boolean;
    refetchInventory: () => Promise<void>;

    // Batch Operations
    createBatch: (input: KatanaCreateBatchInput) => Promise<KatanaBatch>;
    updateBatch: (id: number, input: KatanaUpdateBatchInput) => Promise<KatanaBatch>;
    deleteBatch: (id: number) => Promise<void>;

    // Stock Adjustment Operations
    createStockAdjustment: (input: KatanaStockAdjustmentInput) => Promise<KatanaStockAdjustment>;
    updateStockAdjustment: (id: number, input: Partial<KatanaStockAdjustment>) => Promise<KatanaStockAdjustment>;
    deleteStockAdjustment: (id: number) => Promise<void>;
}

export const InventoryContext = createContext<InventoryContextType | null>(null);