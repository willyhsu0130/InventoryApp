// src/services/inventoryLevelService.ts
import { supabase, unwrap } from "@/lib/supabase";
import type { InventoryLevel, Database } from "@my-inventory-app/shared";
import { getVariantById } from "./variantService";
import { getLocationById } from "./locationService";

type InventoryLevelRow = Database["public"]["Tables"]["inventory_levels"]["Row"];

function toInventoryLevelDomain(row: InventoryLevelRow): InventoryLevel {
    return {
        variantId: row.variant_id,
        locationId: row.location_id,
        quantity: Number(row.quantity),
        committedQuantity: Number(row.committed_quantity),
    };
}

export async function getInventoryLevel(
    variantId: number,
    locationId: number
): Promise<InventoryLevel> {
    await getVariantById(variantId);
    await getLocationById(locationId);

    const row = await unwrap(
        supabase
            .from("inventory_levels")
            .select("*")
            .eq("variant_id", variantId)
            .eq("location_id", locationId)
            .maybeSingle()
    );

    if (!row) {
        return {
            variantId,
            locationId,
            quantity: 0,
            committedQuantity: 0,
        };
    }

    return toInventoryLevelDomain(row);
}
export async function getInventoryLevelsByVariantId(
    variantId: number
): Promise<InventoryLevel[]> {
    await getVariantById(variantId);

    const rows = await unwrap(
        supabase
            .from("inventory_levels")
            .select("*")
            .eq("variant_id", variantId)
    );

    return rows.map(toInventoryLevelDomain);
}

export async function getInventoryLevelsByLocationId(
    locationId: number
): Promise<InventoryLevel[]> {
    await getLocationById(locationId);

    const rows = await unwrap(
        supabase
            .from("inventory_levels")
            .select("*")
            .eq("location_id", locationId)
    );

    return rows.map(toInventoryLevelDomain);
}

export async function getTotalStockByVariantId(variantId: number): Promise<number> {
    await getVariantById(variantId);

    const rows = await unwrap(
        supabase
            .from("inventory_levels")
            .select("quantity")
            .eq("variant_id", variantId)
    );

    return rows.reduce((acc, curr) => acc + Number(curr.quantity), 0);
}