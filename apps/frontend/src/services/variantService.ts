import { supabase, unwrap } from "@/lib/supabase";
import type {
    CreateVariantInput,
    UpdateVariantInput,
    ProductVariant,
    Database,
    Json,
} from "@my-inventory-app/shared";

type VariantInsert = Database["public"]["Tables"]["product_variants"]["Insert"];
type VariantUpdate = Database["public"]["Tables"]["product_variants"]["Update"];

export const variantService = {
    // Fetch all variants
    async getAll(): Promise<ProductVariant[]> {
        const data = await unwrap(
            supabase
                .from("product_variants")
                .select("*")
                .order("created_at", { ascending: false })
        );

        return data as unknown as ProductVariant[];
    },

    // Create single variant (inventory level is initialized via DB trigger)
    async create(input: CreateVariantInput): Promise<ProductVariant> {
        const insertPayload: VariantInsert = {
            product_id: input.product_id,
            sku: input.sku?.trim() ? input.sku.trim() : null, // Ensures "" becomes NULL
            sales_price: input.sales_price ?? 0,
            purchase_price: input.purchase_price ?? 0,
            internal_barcode: input.internal_barcode?.trim() || null,
            registered_barcode: input.registered_barcode?.trim() || null,
            supplier_item_codes: input.supplier_item_codes?.filter(Boolean) ?? [],
            config_attributes: (input.config_attributes ?? []) as unknown as Json,
            custom_fields: (input.custom_fields ?? []) as unknown as Json,
        };

        const variant = await unwrap(
            supabase
                .from("product_variants")
                .insert(insertPayload)
                .select()
                .single()
        );

        return variant as unknown as ProductVariant;
    },

    // Update variant by ID
    async update(id: number, input: UpdateVariantInput): Promise<ProductVariant> {
        const updatePayload: VariantUpdate = {
            ...(input.sku !== undefined && {
                sku: input.sku?.trim() ? input.sku.trim() : null,
            }),
            ...(input.sales_price !== undefined && { sales_price: input.sales_price }),
            ...(input.purchase_price !== undefined && { purchase_price: input.purchase_price }),
            ...(input.internal_barcode !== undefined && {
                internal_barcode: input.internal_barcode?.trim() || null,
            }),
            ...(input.registered_barcode !== undefined && {
                registered_barcode: input.registered_barcode?.trim() || null,
            }),
            ...(input.supplier_item_codes !== undefined && {
                supplier_item_codes: input.supplier_item_codes.filter(Boolean),
            }),
            ...(input.config_attributes !== undefined && {
                config_attributes: input.config_attributes as unknown as Json,
            }),
            ...(input.custom_fields !== undefined && {
                custom_fields: input.custom_fields as unknown as Json,
            }),
        };

        const data = await unwrap(
            supabase
                .from("product_variants")
                .update(updatePayload)
                .eq("id", id)
                .select()
                .single()
        );

        return data as unknown as ProductVariant;
    },

    // Delete variant
    async delete(id: number): Promise<void> {
        await unwrap(
            supabase
                .from("product_variants")
                .delete()
                .eq("id", id)
        );
    },
};