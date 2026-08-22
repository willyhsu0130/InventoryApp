import { supabase, unwrap } from "@/lib/supabase";
import type { Batch, Database } from "@my-inventory-app/shared";
import { getVariantById } from "./variantService";
import { getProductById } from "./productService";

type BatchRow = Database["public"]["Tables"]["batches"]["Row"];

function toBatchDomain(row: BatchRow): Batch {
    return {
        id: row.id,
        variantId: row.variant_id,
        batchNumber: row.batch_number,
        quantity: Number(row.quantity),
        createdAt: row.created_at,
        expiredAt: row.expired_at,
    };
}

export async function createBatch(
    payload: Omit<Batch, "id" | "createdAt">
): Promise<Batch> {
    // 1. Validate quantity > 0
    if (payload.quantity <= 0) {
        throw new Error("Batch quantity must be greater than 0.");
    }

    // 2. Validate expiredAt is in the future
    if (new Date(payload.expiredAt).getTime() <= Date.now()) {
        throw new Error("Batch expiredAt date must be in the future.");
    }

    // 3. Verify variant exists and parent product is batchTracked
    const variant = await getVariantById(payload.variantId);
    const product = await getProductById(variant.productId);

    if (!product.batchTracked) {
        throw new Error(
            `Cannot create a batch for product "${product.name}" because batch tracking is disabled.`
        );
    }

    // 4. Insert batch record
    const row = await unwrap(
        supabase
            .from("batches")
            .insert({
                variant_id: payload.variantId,
                batch_number: payload.batchNumber,
                quantity: payload.quantity,
                expired_at: payload.expiredAt,
            })
            .select()
            .single()
    );

    return toBatchDomain(row);
}

export async function getBatchById(id: number): Promise<Batch> {
    const row = await unwrap(
        supabase
            .from("batches")
            .select("*")
            .eq("id", id)
            .single()
    );

    return toBatchDomain(row);
}

export async function getBatchesByVariantId(variantId: number): Promise<Batch[]> {
    const rows = await unwrap(
        supabase
            .from("batches")
            .select("*")
            .eq("variant_id", variantId)
            .order("created_at", { ascending: false })
    );

    return rows.map(toBatchDomain);
}

export async function updateBatch(
    id: number,
    payload: Partial<Omit<Batch, "id" | "variantId" | "createdAt">>
): Promise<Batch> {
    const updateData: Database["public"]["Tables"]["batches"]["Update"] = {};

    if (payload.batchNumber !== undefined) updateData.batch_number = payload.batchNumber;
    if (payload.quantity !== undefined) updateData.quantity = payload.quantity;
    if (payload.expiredAt !== undefined) updateData.expired_at = payload.expiredAt;

    if (Object.keys(updateData).length === 0) {
        return getBatchById(id);
    }

    const row = await unwrap(
        supabase
            .from("batches")
            .update(updateData)
            .eq("id", id)
            .select()
            .single()
    );

    return toBatchDomain(row);
}