import type { Product } from "./product"

export type VariantConfigAttribute = {
    name: string
    value: string
}

export type Variant = {
    id: number
    productId: Product["id"]
    sku: string | null
    salesPrice: number
    isArchived: boolean
    configs: VariantConfigAttribute[]
}