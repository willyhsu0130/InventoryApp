import { supabase, unwrap } from "@/lib/supabase";
import type { InventoryMovement, Database } from "@my-inventory-app/shared";
import { getVariantById } from "./variantService";
import { getProductById } from "./productService";

type InventoryMovementRow = Database["public"]["Tables"]["inventory_movements"]["Row"];

const ALLOWED_REFERENCE_TYPES: ReadonlyArray<InventoryMovement["referenceType"]> = [
    "MANUFACTURE",
    "SALES",
    "ADJUSTMENT",
];

function toInventoryMovementDomain(row: InventoryMovementRow): InventoryMovement {
    return {
        id: row.id,
        variantId: row.variant_id,
        batchId: row.batch_id ?? null,
        quantityAdjusted: Number(row.quantity_adjusted),
        locationId: row.location_id,
        referenceId: row.reference_id,
        referenceType: row.reference_type as InventoryMovement["referenceType"],
        adjustedAt: row.adjusted_at,
    };
}

export async function createInventoryMovement(
    payload: Omit<InventoryMovement, "id" | "adjustedAt">
): Promise<InventoryMovement> {
    // 1. Invariant: Disallow zero-quantity adjustments
    if (payload.quantityAdjusted === 0) {
        throw new Error("quantityAdjusted must be a non-zero value.");
    }

    // 2. Invariant: Validate referenceType enum
    if (!ALLOWED_REFERENCE_TYPES.includes(payload.referenceType)) {
        throw new Error(
            `Invalid referenceType: "${payload.referenceType}". Must be one of: ${ALLOWED_REFERENCE_TYPES.join(", ")}`
        );
    }

    // 3. Batch Consistency Validations
    if (payload.batchId !== null && payload.batchId !== undefined) {
        // Fetch the variant to verify existence and get parent product ID
        const variant = await getVariantById(payload.variantId);
        const parentProduct = await getProductById(variant.productId);

        // Disallow attaching batchId if the parent product is not batch-tracked
        if (!parentProduct.batchTracked) {
            throw new Error(
                `Cannot assign batchId to a variant whose product "${parentProduct.name}" is not batch-tracked.`
            );
        }

        // Fetch the batch record to ensure it exists and belongs to this variant
        const batchRow = await unwrap(
            supabase
                .from("batches")
                .select("id, variant_id")
                .eq("id", payload.batchId)
                .single()
        );

        if (batchRow.variant_id !== payload.variantId) {
            throw new Error(
                `Batch with ID ${payload.batchId} does not belong to variant ID ${payload.variantId}.`
            );
        }
    }

    // 4. Insert ledger movement
    const row = await unwrap(
        supabase
            .from("inventory_movements")
            .insert({
                variant_id: payload.variantId,
                batch_id: payload.batchId,
                quantity_adjusted: payload.quantityAdjusted,
                location_id: payload.locationId,
                reference_id: payload.referenceId,
                reference_type: payload.referenceType,
            })
            .select()
            .single()
    );

    return toInventoryMovementDomain(row);
}

export async function getInventoryMovementById(id: number): Promise<InventoryMovement> {
    const row = await unwrap(
        supabase
            .from("inventory_movements")
            .select("*")
            .eq("id", id)
            .single()
    );

    return toInventoryMovementDomain(row);
}

export async function getMovementsByVariantId(
    variantId: number
): Promise<InventoryMovement[]> {
    const rows = await unwrap(
        supabase
            .from("inventory_movements")
            .select("*")
            .eq("variant_id", variantId)
            .order("adjusted_at", { ascending: false })
    );

    return rows.map(toInventoryMovementDomain);
}

export async function getMovementsByBatchId(
    batchId: number
): Promise<InventoryMovement[]> {
    const rows = await unwrap(
        supabase
            .from("inventory_movements")
            .select("*")
            .eq("batch_id", batchId)
            .order("adjusted_at", { ascending: false })
    );

    return rows.map(toInventoryMovementDomain);
}

export async function getMovementsByLocationId(
    locationId: number
): Promise<InventoryMovement[]> {
    const rows = await unwrap(
        supabase
            .from("inventory_movements")
            .select("*")
            .eq("location_id", locationId)
            .order("adjusted_at", { ascending: false })
    );

    return rows.map(toInventoryMovementDomain);
}