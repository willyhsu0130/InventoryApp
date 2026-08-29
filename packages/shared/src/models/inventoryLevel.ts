import type{ Variant } from "./variant"
import type { Location } from "./location"

export type InventoryLevel = {
    variantId: Variant["id"]
    quantity: number
    locationId: Location["id"]
    committedQuantity: number
}