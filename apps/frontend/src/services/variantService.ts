import { supabase, unwrap } from "@/lib/supabase";
import type {
    Variant,
    VariantConfigAttribute,
    Database,
    ProductConfig,
} from "@my-inventory-app/shared";
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

function normalizeConfigs(configs?: VariantConfigAttribute[] | null): Array<{ name: string; value: string }> {
    if (!configs || !Array.isArray(configs)) return [];
    return configs
        .map((c) => ({
            name: c.name.trim().toLowerCase(),
            value: String(c.value).trim().toLowerCase(),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

function validateVariantConfigsAgainstParent(
    parentConfigs: ProductConfig[],
    variantConfigs: VariantConfigAttribute[]
) {
    if (!variantConfigs || variantConfigs.length === 0) return;

    for (const attr of variantConfigs) {
        const parentDef = parentConfigs.find(
            (pc) => pc.name.trim().toLowerCase() === attr.name.trim().toLowerCase()
        );
        if (!parentDef) {
            throw new Error(
                `Invalid variant config name: "${attr.name}" does not exist in parent product configs.`
            );
        }

        const allowedValues = (parentDef.values ?? []).map((v) => String(v).trim().toLowerCase());
        if (!allowedValues.includes(String(attr.value).trim().toLowerCase())) {
            throw new Error(
                `Invalid variant config value: "${attr.value}" is not an allowed value for "${attr.name}". Allowed: [${parentDef.values?.join(", ")}]`
            );
        }
    }
}

async function assertNoDuplicateConfigs(
    productId: number,
    configs: VariantConfigAttribute[],
    excludeVariantId?: number
): Promise<void> {
    if (!configs || configs.length === 0) return;

    let query = supabase
        .from("variants")
        .select("id, configs")
        .eq("product_id", productId)
        .eq("is_archived", false);

    if (excludeVariantId) {
        query = query.neq("id", excludeVariantId);
    }

    const existingVariants = await unwrap(query);
    const incomingNormalized = normalizeConfigs(configs);

    const isDuplicate = existingVariants.some((v) => {
        const existingNormalized = normalizeConfigs(v.configs as VariantConfigAttribute[]);
        if (existingNormalized.length !== incomingNormalized.length) return false;

        return incomingNormalized.every(
            (inc, idx) =>
                inc.name === existingNormalized[idx]?.name &&
                inc.value === existingNormalized[idx]?.value
        );
    });

    if (isDuplicate) {
        throw new Error(
            "A variant with this exact configuration combination already exists for this product."
        );
    }
}

export async function createVariant(
    payload: Omit<Variant, "id" | "isArchived">
): Promise<Variant> {
    if (!payload.productId || Number.isNaN(Number(payload.productId))) {
        throw new Error("A valid productId is required to create a variant.");
    }

    const parentProduct = await getProductById(payload.productId);

    if (payload.configs && payload.configs.length > 0) {
        validateVariantConfigsAgainstParent(parentProduct.configs ?? [], payload.configs);
    }

    await assertNoDuplicateConfigs(payload.productId, payload.configs ?? []);

    const row = await unwrap(
        supabase
            .from("variants")
            .insert({
                product_id: payload.productId,
                sku: payload.sku?.trim() || null,
                sales_price: payload.salesPrice ?? 0,
                configs: (payload.configs as VariantConfigAttribute[]) ?? [],
                is_archived: false,
            })
            .select()
            .single()
    );

    return toVariantDomain(row);
}

export async function getVariantById(id: number): Promise<Variant> {
    if (!id || Number.isNaN(Number(id))) {
        throw new Error(`Invalid variant ID provided: ${id}`);
    }

    const row = await unwrap(
        supabase
            .from("variants")
            .select("*")
            .eq("id", Number(id))
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

export async function getActiveVariants(): Promise<Variant[]> {
    const rows = await unwrap(
        supabase
            .from("variants")
            .select("*")
            .eq("is_archived", false)
            .order("id", { ascending: true })
    );

    return rows.map(toVariantDomain);
}

export async function updateVariant(
    id: number,
    payload: Partial<Omit<Variant, "id" | "productId">>
): Promise<Variant> {
    if (!id || Number.isNaN(Number(id))) {
        throw new Error(`Invalid variant ID provided for update: ${id}`);
    }

    const updateData: Database["public"]["Tables"]["variants"]["Update"] = {};

    if (payload.sku !== undefined) updateData.sku = payload.sku?.trim() || null;
    if (payload.salesPrice !== undefined) updateData.sales_price = payload.salesPrice;
    if (payload.isArchived !== undefined) updateData.is_archived = payload.isArchived;

    if (payload.configs !== undefined) {
        const currentVariant = await getVariantById(id);
        const parentProduct = await getProductById(currentVariant.productId);
        validateVariantConfigsAgainstParent(parentProduct.configs ?? [], payload.configs);
        await assertNoDuplicateConfigs(currentVariant.productId, payload.configs, id);
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
    if (!id || Number.isNaN(Number(id))) {
        throw new Error(`Invalid variant ID provided for deletion: ${id}`);
    }

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