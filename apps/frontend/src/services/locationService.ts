import { supabase, unwrap } from "@/lib/supabase";
import type { Location, Database } from "@my-inventory-app/shared";

type LocationRow = Database["public"]["Tables"]["locations"]["Row"];

function toLocationDomain(row: LocationRow): Location {
    return {
        id: row.id,
        name: row.name,
        line1: row.line1,
        line2: row.line2 ?? null,
        city: row.city,
        state: row.state ?? null,
        country: row.country,
    };
}

export async function createLocation(
    payload: Omit<Location, "id">
): Promise<Location> {
    const trimmedName = payload.name?.trim();
    if (!trimmedName) {
        throw new Error("Location name cannot be empty.");
    }
    if (!payload.line1?.trim()) {
        throw new Error("Address line1 cannot be empty.");
    }
    if (!payload.city?.trim()) {
        throw new Error("City cannot be empty.");
    }
    if (!payload.state?.trim()) {
        throw new Error("State cannot be empty.");
    }
    if (!payload.country?.trim()) {
        throw new Error("Country cannot be empty.");
    }

    const row = await unwrap(
        supabase
            .from("locations")
            .insert({
                name: trimmedName,
                line1: payload.line1.trim(),
                line2: payload.line2?.trim() || null,
                city: payload.city.trim(),
                state: payload.state.trim(),
                country: payload.country.trim(),
            })
            .select()
            .single()
    );

    return toLocationDomain(row);
}

export async function getLocationById(id: number): Promise<Location> {
    const row = await unwrap(
        supabase
            .from("locations")
            .select("*")
            .eq("id", id)
            .single()
    );

    return toLocationDomain(row);
}

export async function getLocations(): Promise<Location[]> {
    const rows = await unwrap(
        supabase
            .from("locations")
            .select("*")
            .order("id", { ascending: true })
    );

    return rows.map(toLocationDomain);
}

export async function updateLocationById(
    id: number,
    payload: Partial<Omit<Location, "id">>
): Promise<Location> {
    const updateData: Database["public"]["Tables"]["locations"]["Update"] = {};

    if (payload.name !== undefined) {
        const trimmedName = payload.name.trim();
        if (!trimmedName) throw new Error("Location name cannot be empty.");
        updateData.name = trimmedName;
    }

    if (payload.line1 !== undefined) {
        const trimmedLine1 = payload.line1.trim();
        if (!trimmedLine1) throw new Error("Address line1 cannot be empty.");
        updateData.line1 = trimmedLine1;
    }

    if (payload.line2 !== undefined) {
        updateData.line2 = payload.line2 ? payload.line2.trim() : null;
    }

    if (payload.city !== undefined) {
        const trimmedCity = payload.city.trim();
        if (!trimmedCity) throw new Error("City cannot be empty.");
        updateData.city = trimmedCity;
    }

    if (payload.state !== undefined) {
        const trimmedState = payload?.state?.trim();
        if (!trimmedState) throw new Error("State cannot be empty.");
        updateData.state = trimmedState;
    }

    if (payload.country !== undefined) {
        const trimmedCountry = payload.country.trim();
        if (!trimmedCountry) throw new Error("Country cannot be empty.");
        updateData.country = trimmedCountry;
    }

    if (Object.keys(updateData).length === 0) {
        return getLocationById(id);
    }

    const row = await unwrap(
        supabase
            .from("locations")
            .update(updateData)
            .eq("id", id)
            .select()
            .single()
    );

    return toLocationDomain(row);
}

export async function deleteLocationById(id: number): Promise<void> {
    await unwrap(
        supabase
            .from("locations")
            .delete()
            .eq("id", id)
            .select()
            .single()
    );
}