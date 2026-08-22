import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import type {
    Product,
    Variant,
    Batch,
    InventoryMovement,
} from "@my-inventory-app/shared";
import { createProduct } from "../productService";
import { createVariant } from "../variantService";
import * as inventoryMovementService from "../inventoryMovementService";
import {
    createInventoryMovement,
    getInventoryMovementById,
    getMovementsByVariantId,
    getMovementsByBatchId,
    getMovementsByLocationId,
} from "../inventoryMovementService";
import { createBatch } from "../batchService";

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

describe("Inventory Movement Service", () => {
    const createdProductIds: Product["id"][] = [];
    const createdVariantIds: Variant["id"][] = [];
    const createdBatchIds: Batch["id"][] = [];
    const createdMovementIds: InventoryMovement["id"][] = [];

    let unbatchedProduct: Product;
    let unbatchedVariant: Variant;

    let batchedProduct: Product;
    let batchedVariant: Variant;
    let foreignVariant: Variant;

    let testBatch: Batch;
    const testLocationId = 1;

    let sharedMovementId: number;

    beforeAll(async () => {
        // 1. Create standard product & variant (batchTracked: false)
        unbatchedProduct = await createProduct({
            name: `Inv Movement Std Product ${Date.now()}`,
            uom: "pcs",
            batchTracked: false,
            configs: [],
        });
        createdProductIds.push(unbatchedProduct.id);

        unbatchedVariant = await createVariant({
            productId: unbatchedProduct.id,
            sku: `SKU-UNBATCHED-${Date.now()}`,
            salesPrice: 10,
            configs: [],
        });
        createdVariantIds.push(unbatchedVariant.id);

        // 2. Create batch-tracked product & variant (batchTracked: true)
        batchedProduct = await createProduct({
            name: `Inv Movement Batch Product ${Date.now()}`,
            uom: "kg",
            batchTracked: true,
            configs: [],
        });
        createdProductIds.push(batchedProduct.id);

        batchedVariant = await createVariant({
            productId: batchedProduct.id,
            sku: `SKU-BATCHED-${Date.now()}`,
            salesPrice: 25,
            configs: [],
        });
        createdVariantIds.push(batchedVariant.id);

        // 3. Create a secondary variant under the same batched product to test cross-variant batch mismatch
        foreignVariant = await createVariant({
            productId: batchedProduct.id,
            sku: `SKU-FOREIGN-${Date.now()}`,
            salesPrice: 30,
            configs: [],
        });
        createdVariantIds.push(foreignVariant.id);

        // 4. Create an active batch using createBatch
        const futureExpiry = new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString();
        testBatch = await createBatch({
            variantId: batchedVariant.id,
            batchNumber: `BATCH-TEST-${Date.now()}`,
            quantity: 100,
            expiredAt: futureExpiry,
        });
        createdBatchIds.push(testBatch.id);
    });

    afterAll(async () => {
        // Teardown in reverse foreign-key dependency order
        if (createdMovementIds.length > 0) {
            const { error: movError } = await supabase
                .from("inventory_movements")
                .delete()
                .in("id", createdMovementIds);
            if (movError) console.error("Movements cleanup failed:", movError);
        }

        if (createdBatchIds.length > 0) {
            const { error: batchError } = await supabase
                .from("batches")
                .delete()
                .in("id", createdBatchIds);
            if (batchError) console.error("Batches cleanup failed:", batchError);
        }

        if (createdVariantIds.length > 0) {
            const { error: varError } = await supabase
                .from("variants")
                .delete()
                .in("id", createdVariantIds);
            if (varError) console.error("Variants cleanup failed:", varError);
        }

        if (createdProductIds.length > 0) {
            const { error: prodError } = await supabase
                .from("products")
                .delete()
                .in("id", createdProductIds);
            if (prodError) console.error("Products cleanup failed:", prodError);
        }
    });

    // ==========================================
    // 1. CORE CREATION & DIRECTIONAL QUANTITIES
    // ==========================================
    describe("Core Creation & Directional Quantities", () => {
        it("Inbound Movement without Batch: creates an ADJUSTMENT with positive quantity and batchId null", async () => {
            const payload: Omit<InventoryMovement, "id" | "adjustedAt"> = {
                variantId: unbatchedVariant.id,
                batchId: null,
                quantityAdjusted: 50,
                locationId: testLocationId,
                referenceId: `REF-ADJ-IN-${Date.now()}`,
                referenceType: "ADJUSTMENT",
            };

            const movement = await createInventoryMovement(payload);

            expect(movement).toBeDefined();
            expect(movement.id).toBeTypeOf("number");
            expect(movement.variantId).toBe(unbatchedVariant.id);
            expect(movement.batchId).toBeNull();
            expect(movement.quantityAdjusted).toBe(50);
            expect(movement.locationId).toBe(testLocationId);
            expect(movement.referenceType).toBe("ADJUSTMENT");

            createdMovementIds.push(movement.id);
            sharedMovementId = movement.id;
        });

        it("Inbound Movement with Batch: creates a MANUFACTURE movement linked to a valid batchId", async () => {
            const payload: Omit<InventoryMovement, "id" | "adjustedAt"> = {
                variantId: batchedVariant.id,
                batchId: testBatch.id,
                quantityAdjusted: 100,
                locationId: testLocationId,
                referenceId: `REF-MFG-${Date.now()}`,
                referenceType: "MANUFACTURE",
            };

            const movement = await createInventoryMovement(payload);

            expect(movement.id).toBeTypeOf("number");
            expect(movement.variantId).toBe(batchedVariant.id);
            expect(movement.batchId).toBe(testBatch.id);
            expect(movement.quantityAdjusted).toBe(100);
            expect(movement.referenceType).toBe("MANUFACTURE");

            createdMovementIds.push(movement.id);
        });

        it("Outbound Movement: creates a SALES movement with negative quantityAdjusted", async () => {
            const payload: Omit<InventoryMovement, "id" | "adjustedAt"> = {
                variantId: unbatchedVariant.id,
                batchId: null,
                quantityAdjusted: -15,
                locationId: testLocationId,
                referenceId: `REF-SALES-${Date.now()}`,
                referenceType: "SALES",
            };

            const movement = await createInventoryMovement(payload);

            expect(movement.id).toBeTypeOf("number");
            expect(movement.quantityAdjusted).toBe(-15);
            expect(movement.referenceType).toBe("SALES");

            createdMovementIds.push(movement.id);
        });

        it("Timestamp Generation: verifies adjustedAt is automatically generated and valid ISO string", async () => {
            const payload: Omit<InventoryMovement, "id" | "adjustedAt"> = {
                variantId: unbatchedVariant.id,
                batchId: null,
                quantityAdjusted: 10,
                locationId: testLocationId,
                referenceId: `REF-TIMESTAMP-${Date.now()}`,
                referenceType: "ADJUSTMENT",
            };

            const movement = await createInventoryMovement(payload);

            expect(movement.adjustedAt).toBeDefined();
            expect(typeof movement.adjustedAt).toBe("string");
            expect(new Date(movement.adjustedAt).getTime()).not.toBeNaN();

            createdMovementIds.push(movement.id);
        });
    });

    // ==========================================
    // 2. QUERYING & FILTERING
    // ==========================================
    describe("Querying & Filtering", () => {
        it("Get by ID: retrieves a single movement record by its primary key", async () => {
            const movement = await getInventoryMovementById(sharedMovementId);

            expect(movement).toBeDefined();
            expect(movement.id).toBe(sharedMovementId);
            expect(movement.variantId).toBe(unbatchedVariant.id);
        });

        it("Filter by Variant: retrieves all historical movements for a specific variantId", async () => {
            const movements = await getMovementsByVariantId(unbatchedVariant.id);

            expect(Array.isArray(movements)).toBe(true);
            expect(movements.length).toBeGreaterThan(0);
            expect(movements.every((m) => m.variantId === unbatchedVariant.id)).toBe(true);
            expect(movements.some((m) => m.id === sharedMovementId)).toBe(true);
        });

        it("Filter by Batch: retrieves all movements linked to a specific batchId", async () => {
            const movements = await getMovementsByBatchId(testBatch.id);

            expect(Array.isArray(movements)).toBe(true);
            expect(movements.length).toBeGreaterThan(0);
            expect(movements.every((m) => m.batchId === testBatch.id)).toBe(true);
        });

        it("Filter by Location: retrieves movements occurring at a specific locationId", async () => {
            const movements = await getMovementsByLocationId(testLocationId);

            expect(Array.isArray(movements)).toBe(true);
            expect(movements.length).toBeGreaterThan(0);
            expect(movements.every((m) => m.locationId === testLocationId)).toBe(true);
            expect(movements.some((m) => m.id === sharedMovementId)).toBe(true);
        });
    });

    // ==========================================
    // 3. BUSINESS LOGIC & INVARIANTS
    // ==========================================
    describe("Business Logic & Invariants", () => {
        it("Zero-Quantity Prohibition: rejects movements where quantityAdjusted === 0", async () => {
            const zeroPayload: Omit<InventoryMovement, "id" | "adjustedAt"> = {
                variantId: unbatchedVariant.id,
                batchId: null,
                quantityAdjusted: 0,
                locationId: testLocationId,
                referenceId: `REF-ZERO-${Date.now()}`,
                referenceType: "ADJUSTMENT",
            };

            await expect(createInventoryMovement(zeroPayload)).rejects.toThrow();
        });

        it("Batch Consistency Check: rejects batchId assignment if parent product is not batch-tracked", async () => {
            const invalidPayload: Omit<InventoryMovement, "id" | "adjustedAt"> = {
                variantId: unbatchedVariant.id, // unbatchedProduct has batchTracked = false
                batchId: testBatch.id,
                quantityAdjusted: 10,
                locationId: testLocationId,
                referenceId: `REF-INVALID-TRACK-${Date.now()}`,
                referenceType: "ADJUSTMENT",
            };

            await expect(createInventoryMovement(invalidPayload)).rejects.toThrow();
        });

        it("Batch Consistency Check: rejects batchId assignment if batch does not belong to the target variantId", async () => {
            const invalidPayload: Omit<InventoryMovement, "id" | "adjustedAt"> = {
                variantId: foreignVariant.id, // testBatch belongs to batchedVariant, not foreignVariant
                batchId: testBatch.id,
                quantityAdjusted: 10,
                locationId: testLocationId,
                referenceId: `REF-WRONG-VARIANT-BATCH-${Date.now()}`,
                referenceType: "ADJUSTMENT",
            };

            await expect(createInventoryMovement(invalidPayload)).rejects.toThrow();
        });

        it("Valid Reference Types: rejects invalid referenceType string values", async () => {
            const invalidPayload = {
                variantId: unbatchedVariant.id,
                batchId: null,
                quantityAdjusted: 10,
                locationId: testLocationId,
                referenceId: `REF-INVALID-TYPE-${Date.now()}`,
                referenceType: "INVALID_TYPE",
            };

            await expect(
                createInventoryMovement(invalidPayload as unknown as Omit<InventoryMovement, "id" | "adjustedAt">)
            ).rejects.toThrow();
        });
    });

    // ==========================================
    // 4. FOREIGN KEY & INTEGRITY BOUNDARIES
    // ==========================================
    describe("Foreign Key & Integrity Boundaries", () => {
        it("Non-existent ID: fails when fetching a movement ID that does not exist", async () => {
            await expect(getInventoryMovementById(99999999)).rejects.toThrow();
        });

        it("Invalid variantId: rejects movement insertion when variantId does not exist", async () => {
            const invalidPayload: Omit<InventoryMovement, "id" | "adjustedAt"> = {
                variantId: 99999999,
                batchId: null,
                quantityAdjusted: 10,
                locationId: testLocationId,
                referenceId: `REF-FK-VAR-${Date.now()}`,
                referenceType: "ADJUSTMENT",
            };

            await expect(createInventoryMovement(invalidPayload)).rejects.toThrow();
        });

        it("Invalid batchId: rejects movement insertion when batchId does not exist", async () => {
            const invalidPayload: Omit<InventoryMovement, "id" | "adjustedAt"> = {
                variantId: batchedVariant.id,
                batchId: 99999999,
                quantityAdjusted: 10,
                locationId: testLocationId,
                referenceId: `REF-FK-BATCH-${Date.now()}`,
                referenceType: "ADJUSTMENT",
            };

            await expect(createInventoryMovement(invalidPayload)).rejects.toThrow();
        });

        it("Invalid locationId: rejects movement insertion when locationId does not exist", async () => {
            const invalidPayload: Omit<InventoryMovement, "id" | "adjustedAt"> = {
                variantId: unbatchedVariant.id,
                batchId: null,
                quantityAdjusted: 10,
                locationId: 99999999,
                referenceId: `REF-FK-LOC-${Date.now()}`,
                referenceType: "ADJUSTMENT",
            };

            await expect(createInventoryMovement(invalidPayload)).rejects.toThrow();
        });
    });

    // ==========================================
    // 5. LEDGER IMMUTABILITY (APPEND-ONLY LOG)
    // ==========================================
    describe("Ledger Immutability", () => {
        it("Service Architecture: does not expose update or delete methods for ledger movements", () => {
            expect((inventoryMovementService as Record<string, unknown>).updateInventoryMovement).toBeUndefined();
            expect((inventoryMovementService as Record<string, unknown>).deleteInventoryMovement).toBeUndefined();
        });
    });
});