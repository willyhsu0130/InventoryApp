import { supabase, unwrap } from "@/lib/supabase";
import type { Variant, VariantConfigAttribute, Database, ProductConfig } from "@my-inventory-app/shared";
import { getProductById } from "./productService";

type VariantRow = Database["public"]["Tables"]["variants"]["Row"];

function toVariantDomain(row: VariantRow): Variant {
    return {
        id: row.id,
        productId: row.product_id,
        sku: row.sku ?? null,
        salesPrice: Number(row.sales_price ?? 0),
        configs: (row.configs as unknown as VariantConfigAttribute[]) ?? [],
        isArchived: row.is_archived,
    };
}

/**
 * Validates that all variant config attributes exist and have allowed values in the parent product configs
 */
function validateVariantConfigsAgainstParent(
    parentConfigs: ProductConfig[],
    variantConfigs: VariantConfigAttribute[]
) {
    if (!variantConfigs || variantConfigs.length === 0) return;

    for (const attr of variantConfigs) {
        const parentDef = parentConfigs.find((pc) => pc.name === attr.name);
        if (!parentDef) {
            throw new Error(
                `Invalid variant config name: "${attr.name}" does not exist in parent product configs.`
            );
        }

        if (!parentDef.value.includes(attr.value)) {
            throw new Error(
                `Invalid variant config value: "${attr.value}" is not an allowed value for "${attr.name}". Allowed: [${parentDef.value.join(", ")}]`
            );
        }
    }
}

export async function createVariant(
    payload: Omit<Variant, "id" | "isArchived">
): Promise<Variant> {
    // 1. Fetch parent product to validate configs (also asserts parent product exists)
    const parentProduct = await getProductById(payload.productId);

    // 2. Validate configs against parent definition
    if (payload.configs && payload.configs.length > 0) {
        validateVariantConfigsAgainstParent(parentProduct.configs ?? [], payload.configs);
    }

    const row = await unwrap(
        supabase
            .from("variants")
            .insert({
                product_id: payload.productId,
                sku: payload.sku,
                sales_price: payload.salesPrice,
                configs: payload.configs as  VariantConfigAttribute[],
                is_archived: false,
            })
            .select()
            .single()
    );

    return toVariantDomain(row);
}

export async function getVariantById(id: number): Promise<Variant> {
    const row = await unwrap(
        supabase
            .from("variants")
            .select("*")
            .eq("id", id)
            .single()
    );

    return toVariantDomain(row);
}

export async function getVariantsByProductId(productId: number): Promise<Variant[]> {
    const rows = await unwrap(
        supabase
            .from("variants")
            .select("*")
            .eq("product_id", productId)
            .order("id", { ascending: true })
    );

    return rows.map(toVariantDomain);
}

export async function getActiveVariantsByProductId(productId: number): Promise<Variant[]> {
    const rows = await unwrap(
        supabase
            .from("variants")
            .select("*")
            .eq("product_id", productId)
            .eq("is_archived", false)
            .order("id", { ascending: true })
    );

    return rows.map(toVariantDomain);
}

export async function updateVariant(
    id: number,
    payload: Partial<Omit<Variant, "id" | "productId">>
): Promise<Variant> {
    const updateData: Database["public"]["Tables"]["variants"]["Update"] = {};

    if (payload.sku !== undefined) updateData.sku = payload.sku;
    if (payload.salesPrice !== undefined) updateData.sales_price = payload.salesPrice;
    if (payload.isArchived !== undefined) updateData.is_archived = payload.isArchived;

    // Validate new configs if updating them
    if (payload.configs !== undefined) {
        const currentVariant = await getVariantById(id);
        const parentProduct = await getProductById(currentVariant.productId);
        validateVariantConfigsAgainstParent(parentProduct.configs ?? [], payload.configs);
        updateData.configs = payload.configs as VariantConfigAttribute[];
    }

    if (Object.keys(updateData).length === 0) {
        return getVariantById(id);
    }

    const row = await unwrap(
        supabase
            .from("variants")
            .update(updateData)
            .eq("id", id)
            .select()
            .single()
    );

    return toVariantDomain(row);
}

export async function deleteVariant(id: number): Promise<Variant> {
    const row = await unwrap(
        supabase
            .from("variants")
            .update({ is_archived: true })
            .eq("id", id)
            .select()
            .single()
    );

    return toVariantDomain(row);
}