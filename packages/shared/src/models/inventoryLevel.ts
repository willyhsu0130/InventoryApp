import { Variant } from "./variant"
import { Location } from "./location"

export type InventoryLevel = {
    variantId: Variant["id"]
    quantity: number
    locationId: Location["id"]
    committedQuantity: number
}