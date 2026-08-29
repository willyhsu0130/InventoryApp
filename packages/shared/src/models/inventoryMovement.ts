import type{ Batch } from "./batch"
import type{ Variant } from "./variant"

export type InventoryMovement = {
    id: number
    quantityAdjusted: number
    variantId: Variant["id"]
    batchId: Batch["id"] | null
    adjustedAt: string
    locationId: number
    referenceId: string | null;
    referenceType: "MANUFACTURE" | "SALES" | "ADJUSTMENT"
}

export type InventoryMovementList = InventoryMovement[]