import { describe, it, expect, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import type { Location } from "@my-inventory-app/shared";
import {
    getLocations,
    getLocationById,
    createLocation,
    updateLocationById,
    deleteLocationById,
} from "../locationService";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error(
        "Missing Supabase credentials for test execution. Ensure SUPABASE_URL and SUPABASE_ANON_KEY exist."
    );
}

const supabase = createClient(supabaseUrl, supabaseKey);

describe("Location Service", () => {
    const createdLocationIds: Location["id"][] = [];
    let sharedLocationId: number;

    const basePayload: Omit<Location, "id"> = {
        name: `Primary Warehouse ${Date.now()}`,
        line1: "100 Innovation Way",
        line2: "Dock 4B",
        city: "Toronto",
        state: "ON",
        country: "Canada",
    };

    afterAll(async () => {
        if (createdLocationIds.length > 0) {
            const { error: locError } = await supabase
                .from("locations")
                .delete()
                .in("id", createdLocationIds);
            if (locError) console.error("Locations cleanup failed:", locError);
        }
    });

    // ==========================================
    // 1. CORE CRUD & QUERIES
    // ==========================================
    describe("Core CRUD & Queries", () => {
        it("POST: creates a location with all address fields", async () => {
            const location = await createLocation(basePayload);

            expect(location).toBeDefined();
            expect(location.id).toBeTypeOf("number");
            expect(location.name).toBe(basePayload.name);
            expect(location.line1).toBe(basePayload.line1);
            expect(location.line2).toBe(basePayload.line2);
            expect(location.city).toBe(basePayload.city);
            expect(location.state).toBe(basePayload.state);
            expect(location.country).toBe(basePayload.country);

            createdLocationIds.push(location.id);
            sharedLocationId = location.id;
        });

        it("POST: creates a location with null line2", async () => {
            const payload: Omit<Location, "id"> = {
                name: `Secondary Depot ${Date.now()}`,
                line1: "250 Industrial Blvd",
                line2: null,
                city: "Vancouver",
                state: "BC",
                country: "Canada",
            };

            const location = await createLocation(payload);

            expect(location.id).toBeTypeOf("number");
            expect(location.line2).toBeNull();

            createdLocationIds.push(location.id);
        });

        it("GET: retrieves a single location by ID", async () => {
            const location = await getLocationById(sharedLocationId);

            expect(location).toBeDefined();
            expect(location.id).toBe(sharedLocationId);
            expect(location.name).toBe(basePayload.name);
            expect(location.city).toBe(basePayload.city);
        });

        it("GET: retrieves all locations list", async () => {
            const list = await getLocations();

            expect(Array.isArray(list)).toBe(true);
            expect(list.length).toBeGreaterThan(0);
            expect(list.some((loc) => loc.id === sharedLocationId)).toBe(true);
        });

        it("PATCH: updates address details", async () => {
            const updated = await updateLocationById(sharedLocationId, {
                line1: "102 Innovation Way",
                line2: "Suite 300",
                city: "Mississauga",
            });

            expect(updated.id).toBe(sharedLocationId);
            expect(updated.line1).toBe("102 Innovation Way");
            expect(updated.line2).toBe("Suite 300");
            expect(updated.city).toBe("Mississauga");
            expect(updated.state).toBe(basePayload.state); // Unchanged
        });

        it("DELETE: hard deletes a location record", async () => {
            const temp = await createLocation({
                name: `Temp Bay ${Date.now()}`,
                line1: "12 Quick St",
                line2: null,
                city: "Calgary",
                state: "AB",
                country: "Canada",
            });

            await deleteLocationById(temp.id);

            await expect(getLocationById(temp.id)).rejects.toThrow();
        });
    });

    // ==========================================
    // 2. VALIDATION & ERROR BOUNDARIES
    // ==========================================
    describe("Validation & Error Boundaries", () => {
        it("POST: rejects creation when mandatory address fields are missing/empty", async () => {
            await expect(
                createLocation({ ...basePayload, name: "" })
            ).rejects.toThrow();

            await expect(
                createLocation({ ...basePayload, line1: "  " })
            ).rejects.toThrow();

            await expect(
                createLocation({ ...basePayload, city: "" })
            ).rejects.toThrow();

            await expect(
                createLocation({ ...basePayload, state: "" })
            ).rejects.toThrow();

            await expect(
                createLocation({ ...basePayload, country: "" })
            ).rejects.toThrow();
        });

        it("GET: fails when location ID does not exist", async () => {
            await expect(getLocationById(99999999)).rejects.toThrow();
        });

        it("PATCH: fails when attempting to update a non-existent ID", async () => {
            await expect(
                updateLocationById(99999999, { name: "Non-existent Depot" })
            ).rejects.toThrow();
        });

        it("PATCH: passing an empty object leaves existing record unchanged", async () => {
            const before = await getLocationById(sharedLocationId);
            const after = await updateLocationById(sharedLocationId, {});

            expect(after.name).toBe(before.name);
            expect(after.line1).toBe(before.line1);
            expect(after.city).toBe(before.city);
        });
    });
});