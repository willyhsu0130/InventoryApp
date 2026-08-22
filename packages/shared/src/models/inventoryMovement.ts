import { Batch } from "./batch"
import { Variant } from "./variant"

export type InventoryMovement = {
    id: number
    quantityAdjusted: number
    variantId: Variant["id"]
    batchId: Batch["id"] | null
    adjustedAt: string
    locationId: number
    referenceId: string;
    referenceType: "MANUFACTURE" | "SALES" | "ADJUSTMENT"
}

export type InventoryMovementList = InventoryMovement[]