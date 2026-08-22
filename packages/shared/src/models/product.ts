export type ProductConfig = {
    id: number
    name: string
    value: string[]
}

export type Product = {
    id: number
    name: string
    uom: string
    batchTracked: boolean
    isArchived: boolean
    configs: ProductConfig[]
}