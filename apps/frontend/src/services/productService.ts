// frontend/src/services/productService.ts
import type { Product, ProductConfig, VariantConfigAttribute } from "@my-inventory-app/shared";
import { supabase, unwrap } from "@/lib/supabase";
import type { Database } from "@my-inventory-app/shared";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];

function toProductDomain(row: ProductRow): Product {
    return {
        id: row.id,
        name: row.name,
        uom: row.uom,
        batchTracked: row.batch_tracked,
        configs: (row.configs as unknown as ProductConfig[]) ?? [],
        isArchived: row.is_archived,
    };
}


// src/services/productService.ts

export async function createProduct(
    payload: Omit<Product, "id" | "isArchived">
): Promise<Product> {
    // 1. Create the parent product
    const productRow = await unwrap(
        supabase
            .from("products")
            .insert({
                name: payload.name,
                uom: payload.uom,
                batch_tracked: payload.batchTracked,
                configs: (payload.configs as ProductConfig[]) ?? [],
                is_archived: false,
            })
            .select()
            .single()
    );

    const product = toProductDomain(productRow);

    const defaultConfigs =
        payload.configs && payload.configs.length > 0
            ? payload.configs.map((c) => ({
                name: c.name,
                value: Array.isArray(c.value) ? c.value[0] : c.value,
            }))
            : [];

    const { error: variantError } = await supabase.from("variants").insert({
        product_id: product.id,
        sku: null,
        sales_price: 0,
        configs: defaultConfigs as VariantConfigAttribute[],
        is_archived: false,
    });

    if (variantError) throw variantError;

    return product;
}
export async function getProductById(id: number): Promise<Product> {
    const row = await unwrap(
        supabase
            .from("products")
            .select("*")
            .eq("id", id)
            .single()
    );

    return toProductDomain(row);
}

export async function getActiveProducts(): Promise<Product[]> {
    const rows = await unwrap(
        supabase
            .from("products")
            .select("*")
            .eq("is_archived", false)
            .order("id", { ascending: true })
    );

    return rows.map(toProductDomain);
}

export async function updateProduct(
    id: number,
    payload: Partial<Omit<Product, "id">>
): Promise<Product> {
    const updateData: Database["public"]["Tables"]["products"]["Update"] = {};


    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.uom !== undefined) updateData.uom = payload.uom;
    if (payload.batchTracked !== undefined) updateData.batch_tracked = payload.batchTracked;
    if (payload.configs !== undefined) updateData.configs = payload.configs as ProductConfig[];
    if (payload.isArchived !== undefined) updateData.is_archived = payload.isArchived;

    // Return the existing record immediately if no fields are provided
    if (Object.keys(updateData).length === 0) {
        return getProductById(id);
    }

    const row = await unwrap(
        supabase
            .from("products")
            .update(updateData)
            .eq("id", id)
            .select()
            .single()
    );

    return toProductDomain(row);
}

export async function deleteProduct(id: number): Promise<Product> {
    // 1. Cascade soft-delete to all child variants
    const { error: variantError } = await supabase
        .from("variants")
        .update({ is_archived: true })
        .eq("product_id", id);

    if (variantError) throw variantError;

    // 2. Soft-delete the parent product
    const row = await unwrap(
        supabase
            .from("products")
            .update({ is_archived: true })
            .eq("id", id)
            .select()
            .single()
    );

    return toProductDomain(row);
}