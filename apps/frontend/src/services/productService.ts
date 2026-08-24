// frontend/src/services/productService.ts
import type { Product, ProductConfig } from "@my-inventory-app/shared";
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
    // 1. Insert parent product
    const productRow = await unwrap(
        supabase
            .from("products")
            .insert({
                name: payload.name.trim(),
                uom: payload.uom.trim(),
                batch_tracked: payload.batchTracked,
                configs: payload.configs ?? [],
                is_archived: false,
            })
            .select()
            .single()
    );

    const configs = payload.configs;

    // 2. If NO configs, create exactly ONE default variant
    if (configs.length === 0) {
        await unwrap(
            supabase.from("variants").insert({
                product_id: productRow.id,
                sku: null,
                sales_price: 0,
                configs: [],
                is_archived: false,
            }).select()
                .single()
        );
    } else {
        // Generate Cartesian product if configs exist
        const generateCombinations = (
            cfgList: ProductConfig[]
        ): { name: string; value: string }[][] => {
            if (cfgList.length === 0) return [[]];
            const [first, ...rest] = cfgList;
            const subCombinations = generateCombinations(rest);
            const values = first.values ?? (first as ProductConfig).values;
            return values.flatMap((val: string) =>
                subCombinations.map((sub) => [{ name: first.name, value: val }, ...sub])
            );
        };

        const combinations = generateCombinations(configs);

        await unwrap(
            supabase
                .from("variants")
                .insert(
                    combinations.map((combo) => ({
                        product_id: productRow.id,
                        sku: null,
                        sales_price: 0,
                        configs: combo,
                        is_archived: false,
                    }))
                )
                .select()
        );
    }

    return toProductDomain(productRow);
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