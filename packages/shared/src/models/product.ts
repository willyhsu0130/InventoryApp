export type ProductConfig = {
    // id: number
    name: string
    values: string[]
}

export type ProductConfigDraft = Omit<ProductConfig, "id">;

export type Product = {
    id: number
    name: string
    uom: string
    batchTracked: boolean
    isArchived: boolean
    configs: ProductConfig[]
}
