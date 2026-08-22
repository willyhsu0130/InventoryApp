import { supabase, unwrap } from "@/lib/supabase";
import type { InventoryLevel } from "@my-inventory-app/shared";
import { getVariantById } from "./variantService";
import { getLocationById } from "./locationService";

/**
 * Retrieves the aggregated on-hand quantity for a specific variant at a single location.
 * Validates existence of both variant and location, returning 0 if no movements exist.
 */
export async function getInventoryLevel(
    variantId: number,
    locationId: number
): Promise<InventoryLevel> {
    // 1. Verify existence of variant and location
    await getVariantById(variantId);
    await getLocationById(locationId);

    // 2. Aggregate movements for the variant + location pair
    const rows = await unwrap(
        supabase
            .from("inventory_movements")
            .select("quantity_adjusted")
            .eq("variant_id", variantId)
            .eq("location_id", locationId)
    );

    const totalQuantity = rows.reduce(
        (acc, curr) => acc + Number(curr.quantity_adjusted),
        0
    );

    return {
        variantId,
        locationId,
        quantity: totalQuantity,
    };
}

/**
 * Retrieves inventory levels across all locations for a specific variant.
 */
export async function getInventoryLevelsByVariantId(
    variantId: number
): Promise<InventoryLevel[]> {
    await getVariantById(variantId);

    const rows = await unwrap(
        supabase
            .from("inventory_movements")
            .select("location_id, quantity_adjusted")
            .eq("variant_id", variantId)
    );

    // Group and sum by location_id
    const locationMap = new Map<number, number>();
    for (const row of rows) {
        const current = locationMap.get(row.location_id) ?? 0;
        locationMap.set(row.location_id, current + Number(row.quantity_adjusted));
    }

    const levels: InventoryLevel[] = [];
    locationMap.forEach((quantity, locationId) => {
        levels.push({
            variantId,
            locationId,
            quantity,
        });
    });

    return levels;
}

/**
 * Retrieves inventory levels for all variants stored at a specific location.
 */
export async function getInventoryLevelsByLocationId(
    locationId: number
): Promise<InventoryLevel[]> {
    await getLocationById(locationId);

    const rows = await unwrap(
        supabase
            .from("inventory_movements")
            .select("variant_id, quantity_adjusted")
            .eq("location_id", locationId)
    );

    // Group and sum by variant_id
    const variantMap = new Map<number, number>();
    for (const row of rows) {
        const current = variantMap.get(row.variant_id) ?? 0;
        variantMap.set(row.variant_id, current + Number(row.quantity_adjusted));
    }

    const levels: InventoryLevel[] = [];
    variantMap.forEach((quantity, variantId) => {
        levels.push({
            variantId,
            locationId,
            quantity,
        });
    });

    return levels;
}

/**
 * Calculates the global total on-hand stock for a variant across all locations.
 */
export async function getTotalStockByVariantId(variantId: number): Promise<number> {
    await getVariantById(variantId);

    const rows = await unwrap(
        supabase
            .from("inventory_movements")
            .select("quantity_adjusted")
            .eq("variant_id", variantId)
    );

    return rows.reduce(
        (acc, curr) => acc + Number(curr.quantity_adjusted),
        0
    );
}