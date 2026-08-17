// packages/shared/src/models/variant.ts
import type { Database, Json } from "../models/database.types";

export interface VariantConfigAttribute {
    config_name: string; // e.g. "Size", "切法"
    config_value: string; // e.g. "L", "三去"
}

export type VariantRow = Database["public"]["Tables"]["product_variants"]["Row"];
export type VariantInsert = Database["public"]["Tables"]["product_variants"]["Insert"];
export type VariantUpdate = Database["public"]["Tables"]["product_variants"]["Update"];

// Structured application entity
export interface ProductVariant extends Omit<VariantRow, "config_attributes" | "custom_fields"> {
    config_attributes: VariantConfigAttribute[];
    custom_fields: Array<{ field_name: string; field_value: string }>;
}

// Creation input (product_id + fields)
export interface CreateVariantInput {
    product_id: number;
    sku?: string | null;
    sales_price?: number;
    purchase_price?: number;
    internal_barcode?: string | null;
    registered_barcode?: string | null;
    supplier_item_codes?: string[];
    config_attributes?: VariantConfigAttribute[];
    custom_fields?: Array<{ field_name: string; field_value: string }>;
}

// Update input (partial fields by variant ID)
export type UpdateVariantInput = Partial<Omit<CreateVariantInput, "product_id">>;