import { createContext } from "react";
import type { CreateStockAdjustmentPayload, KatanaBatch, KatanaCreateBatchInput, KatanaInventoryItem, KatanaStockAdjustment } from "../models/katana/katana";
interface InventoryContextType {
    inventory: Map<number, KatanaInventoryItem>
    loading: boolean
    batch: Map<number, KatanaBatch>
    refetchInventory: () => Promise<void>;
    createBatch: (batch: KatanaCreateBatchInput) => Promise<KatanaBatch>
    createStockAdjustment: (stockAdjustment: CreateStockAdjustmentPayload) => Promise<KatanaStockAdjustment>
}

export const InventoryContext = createContext<InventoryContextType | undefined>(undefined);