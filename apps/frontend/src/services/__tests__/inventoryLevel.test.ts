import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import type {
    Product,
    Variant,
    Batch,
    Location,
    InventoryMovement,

} from "@my-inventory-app/shared";
import { createProduct } from "../productService";
import { createVariant } from "../variantService";
import { createBatch } from "../batchService";
import { createLocation } from "../locationService";
import { createInventoryMovement } from "../inventoryMovementService";
import {
    getInventoryLevel,
    getInventoryLevelsByVariantId,
    getInventoryLevelsByLocationId,
    getTotalStockByVariantId,
} from "../inventoryLevelService";

// Load environment variables for local testing
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

describe("Inventory Level Service", () => {
    const createdProductIds: Product["id"][] = [];
    const createdVariantIds: Variant["id"][] = [];
    const createdBatchIds: Batch["id"][] = [];
    const createdLocationIds: Location["id"][] = [];
    const createdMovementIds: InventoryMovement["id"][] = [];

    // Locations
    let locationPrimary: Location;
    let locationSecondary: Location;

    // Unbatched Product & Variant
    let unbatchedProduct: Product;
    let unbatchedVariant: Variant;

    // Batched Product & Variant
    let batchedProduct: Product;
    let batchedVariant: Variant;

    // Batches
    let batchA: Batch;
    let batchB: Batch;

    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 90)
        .toISOString()
        .split("T")[0];

    beforeAll(async () => {
        // 1. Setup 2 Locations
        locationPrimary = await createLocation({
            name: `Level Main Hub ${Date.now()}`,
            line1: "100 Main St",
            line2: null,
            city: "Toronto",
            state: "ON",
            country: "Canada",
        });
        createdLocationIds.push(locationPrimary.id);

        locationSecondary = await createLocation({
            name: `Level West Branch ${Date.now()}`,
            line1: "200 West Rd",
            line2: "Bay 2",
            city: "Vancouver",
            state: "BC",
            country: "Canada",
        });
        createdLocationIds.push(locationSecondary.id);

        // 2. Setup Unbatched Product (batchTracked: false)
        unbatchedProduct = await createProduct({
            name: `Unbatched Item ${Date.now()}`,
            uom: "pcs",
            batchTracked: false,
            configs: [],
        });
        createdProductIds.push(unbatchedProduct.id);

        unbatchedVariant = await createVariant({
            productId: unbatchedProduct.id,
            sku: `SKU-UNBATCHED-LVL-${Date.now()}`,
            salesPrice: 15,
            configs: [],
        });
        createdVariantIds.push(unbatchedVariant.id);

        // 3. Setup Batched Product (batchTracked: true)
        batchedProduct = await createProduct({
            name: `Batched Specialty Item ${Date.now()}`,
            uom: "kg",
            batchTracked: true,
            configs: [],
        });
        createdProductIds.push(batchedProduct.id);

        batchedVariant = await createVariant({
            productId: batchedProduct.id,
            sku: `SKU-BATCHED-LVL-${Date.now()}`,
            salesPrice: 35,
            configs: [],
        });
        createdVariantIds.push(batchedVariant.id);

        // 4. Setup 2 Batches under the batched variant
        batchA = await createBatch({
            variantId: batchedVariant.id,
            batchNumber: `LOT-A-${Date.now()}`,
            quantity: 50,
            expiredAt: futureDate,
        });
        createdBatchIds.push(batchA.id);

        batchB = await createBatch({
            variantId: batchedVariant.id,
            batchNumber: `LOT-B-${Date.now()}`,
            quantity: 30,
            expiredAt: futureDate,
        });
        createdBatchIds.push(batchB.id);
    });

    afterAll(async () => {
        // Teardown in foreign-key dependency order
        if (createdMovementIds.length > 0) {
            const { error } = await supabase
                .from("inventory_movements")
                .delete()
                .in("id", createdMovementIds);
            if (error) console.error("Movement cleanup failed:", error);
        }

        if (createdBatchIds.length > 0) {
            const { error } = await supabase
                .from("batches")
                .delete()
                .in("id", createdBatchIds);
            if (error) console.error("Batches cleanup failed:", error);
        }

        if (createdVariantIds.length > 0) {
            const { error } = await supabase
                .from("variants")
                .delete()
                .in("id", createdVariantIds);
            if (error) console.error("Variants cleanup failed:", error);
        }

        if (createdProductIds.length > 0) {
            const { error } = await supabase
                .from("products")
                .delete()
                .in("id", createdProductIds);
            if (error) console.error("Products cleanup failed:", error);
        }

        if (createdLocationIds.length > 0) {
            const { error } = await supabase
                .from("locations")
                .delete()
                .in("id", createdLocationIds);
            if (error) console.error("Locations cleanup failed:", error);
        }
    });

    // ==========================================
    // 1. UNBATCHED PRODUCT CALCULATIONS
    // ==========================================
    describe("Unbatched Product Stock Calculations", () => {
        it("returns quantity: 0 when no movements exist for a variant at a location", async () => {
            const level = await getInventoryLevel(unbatchedVariant.id, locationPrimary.id);

            expect(level).toBeDefined();
            expect(level.variantId).toBe(unbatchedVariant.id);
            expect(level.locationId).toBe(locationPrimary.id);
            expect(level.quantity).toBe(0);
        });

        it("increments on-hand level following inbound unbatched adjustments", async () => {
            const mov1 = await createInventoryMovement({
                variantId: unbatchedVariant.id,
                batchId: null,
                quantityAdjusted: 100,
                locationId: locationPrimary.id,
                referenceId: `REF-IN-1-${Date.now()}`,
                referenceType: "ADJUSTMENT",
            });
            createdMovementIds.push(mov1.id);

            const level = await getInventoryLevel(unbatchedVariant.id, locationPrimary.id);
            expect(level.quantity).toBe(100);
        });

        it("decrements on-hand level following outbound sales movement", async () => {
            const movOut = await createInventoryMovement({
                variantId: unbatchedVariant.id,
                batchId: null,
                quantityAdjusted: -30,
                locationId: locationPrimary.id,
                referenceId: `REF-OUT-1-${Date.now()}`,
                referenceType: "SALES",
            });
            createdMovementIds.push(movOut.id);

            const level = await getInventoryLevel(unbatchedVariant.id, locationPrimary.id);
            expect(level.quantity).toBe(70); // 100 - 30 = 70
        });

        it("maintains multi-location isolation for unbatched items", async () => {
            // Add 40 units to locationSecondary
            const movSec = await createInventoryMovement({
                variantId: unbatchedVariant.id,
                batchId: null,
                quantityAdjusted: 40,
                locationId: locationSecondary.id,
                referenceId: `REF-IN-SEC-${Date.now()}`,
                referenceType: "ADJUSTMENT",
            });
            createdMovementIds.push(movSec.id);

            // Primary location level remains 70
            const levelPrimary = await getInventoryLevel(unbatchedVariant.id, locationPrimary.id);
            expect(levelPrimary.quantity).toBe(70);

            // Secondary location level is 40
            const levelSecondary = await getInventoryLevel(unbatchedVariant.id, locationSecondary.id);
            expect(levelSecondary.quantity).toBe(40);

            // Total across all locations = 70 + 40 = 110
            const totalStock = await getTotalStockByVariantId(unbatchedVariant.id);
            expect(totalStock).toBe(110);
        });
    });

    // ==========================================
    // 2. BATCHED PRODUCT CALCULATIONS (BATCH SUMMING)
    // ==========================================
    describe("Batched Product Stock Calculations", () => {
        it("calculates location level as the sum of multiple inbound batches", async () => {
            // Inbound Batch A (50 units) at Location Primary
            const movA = await createInventoryMovement({
                variantId: batchedVariant.id,
                batchId: batchA.id,
                quantityAdjusted: 50,
                locationId: locationPrimary.id,
                referenceId: `REF-BATCH-A-IN-${Date.now()}`,
                referenceType: "MANUFACTURE",
            });
            createdMovementIds.push(movA.id);

            // Inbound Batch B (30 units) at Location Primary
            const movB = await createInventoryMovement({
                variantId: batchedVariant.id,
                batchId: batchB.id,
                quantityAdjusted: 30,
                locationId: locationPrimary.id,
                referenceId: `REF-BATCH-B-IN-${Date.now()}`,
                referenceType: "MANUFACTURE",
            });
            createdMovementIds.push(movB.id);

            // Level quantity should equal sum of Batch A + Batch B (50 + 30 = 80)
            const level = await getInventoryLevel(batchedVariant.id, locationPrimary.id);
            expect(level.quantity).toBe(80);
        });

        it("decrements location level when a specific batch is consumed", async () => {
            // Consume 20 units from Batch A at Location Primary
            const movOutA = await createInventoryMovement({
                variantId: batchedVariant.id,
                batchId: batchA.id,
                quantityAdjusted: -20,
                locationId: locationPrimary.id,
                referenceId: `REF-BATCH-A-OUT-${Date.now()}`,
                referenceType: "SALES",
            });
            createdMovementIds.push(movOutA.id);

            // Level becomes 80 - 20 = 60 (Batch A has 30 remaining, Batch B has 30)
            const level = await getInventoryLevel(batchedVariant.id, locationPrimary.id);
            expect(level.quantity).toBe(60);
        });

        it("aggregates total batched stock across multiple locations", async () => {
            // Receive another 25 units of Batch B at Location Secondary
            const movSecB = await createInventoryMovement({
                variantId: batchedVariant.id,
                batchId: batchB.id,
                quantityAdjusted: 25,
                locationId: locationSecondary.id,
                referenceId: `REF-BATCH-B-SEC-${Date.now()}`,
                referenceType: "MANUFACTURE",
            });
            createdMovementIds.push(movSecB.id);

            // Secondary location level is 25
            const levelSec = await getInventoryLevel(batchedVariant.id, locationSecondary.id);
            expect(levelSec.quantity).toBe(25);

            // Total stock across all locations = 60 (Primary) + 25 (Secondary) = 85
            const totalStock = await getTotalStockByVariantId(batchedVariant.id);
            expect(totalStock).toBe(85);
        });
    });

    // ==========================================
    // 3. MULTI-LEVEL QUERY LISTS & FILTERING
    // ==========================================
    describe("Multi-Level Query Lists & Filtering", () => {
        it("GET by Variant ID: returns all location rows for a variant", async () => {
            const levels = await getInventoryLevelsByVariantId(unbatchedVariant.id);

            expect(Array.isArray(levels)).toBe(true);
            expect(levels.length).toBeGreaterThanOrEqual(2);

            const primaryEntry = levels.find((l) => l.locationId === locationPrimary.id);
            const secondaryEntry = levels.find((l) => l.locationId === locationSecondary.id);

            expect(primaryEntry?.quantity).toBe(70);
            expect(secondaryEntry?.quantity).toBe(40);
        });

        it("GET by Location ID: returns all variants held at a specific location", async () => {
            const levels = await getInventoryLevelsByLocationId(locationPrimary.id);

            expect(Array.isArray(levels)).toBe(true);
            expect(levels.length).toBeGreaterThanOrEqual(2);

            const unbatchedEntry = levels.find((l) => l.variantId === unbatchedVariant.id);
            const batchedEntry = levels.find((l) => l.variantId === batchedVariant.id);

            expect(unbatchedEntry?.quantity).toBe(70);
            expect(batchedEntry?.quantity).toBe(60);
        });
    });

    // ==========================================
    // 4. ERROR & BOUNDARY CONDITIONS
    // ==========================================
    describe("Error & Boundary Conditions", () => {
        it("fails or returns not found when querying non-existent variantId", async () => {
            await expect(getInventoryLevel(99999999, locationPrimary.id)).rejects.toThrow();
        });

        it("fails or returns not found when querying non-existent locationId", async () => {
            await expect(getInventoryLevel(unbatchedVariant.id, 99999999)).rejects.toThrow();
        });
    });
});