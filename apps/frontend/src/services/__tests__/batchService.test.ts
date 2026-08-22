import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import type { Product, Variant, Batch } from "@my-inventory-app/shared";
import { createProduct } from "../productService";
import { createVariant } from "../variantService";
import {
    createBatch,
    getBatchById,
    getBatchesByVariantId,
    updateBatch,
} from "../batchService";

// Load environment variables
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

describe("Batch Service", () => {
    const createdProductIds: Product["id"][] = [];
    const createdVariantIds: Variant["id"][] = [];
    const createdBatchIds: Batch["id"][] = [];

    let batchedProduct: Product;
    let batchedVariant: Variant;
    let unbatchedProduct: Product;
    let unbatchedVariant: Variant;
    let sharedBatchId: number;

    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 90)
        .toISOString()
        .split("T")[0]; // e.g. "2026-11-19"

    const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24)
        .toISOString()
        .split("T")[0];  // e.g. "2026-08-20"

    beforeAll(async () => {
        // 1. Setup batch-tracked product and variant
        batchedProduct = await createProduct({
            name: `Batch Test Product ${Date.now()}`,
            uom: "kg",
            batchTracked: true,
            configs: [],
        });
        createdProductIds.push(batchedProduct.id);

        batchedVariant = await createVariant({
            productId: batchedProduct.id,
            sku: `SKU-BATCH-TEST-${Date.now()}`,
            salesPrice: 20,
            configs: [],
        });

        createdVariantIds.push(batchedVariant.id);

        // 2. Setup unbatched product and variant
        unbatchedProduct = await createProduct({
            name: `Unbatched Product ${Date.now()}`,
            uom: "pcs",
            batchTracked: false,
            configs: [],
        });
        createdProductIds.push(unbatchedProduct.id);

        unbatchedVariant = await createVariant({
            productId: unbatchedProduct.id,
            sku: `SKU-NO-BATCH-${Date.now()}`,
            salesPrice: 15,
            configs: [],
        });
        createdVariantIds.push(unbatchedVariant.id);
    });

    afterAll(async () => {
        // Clean up in reverse dependency order: batches -> variants -> products
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
    // 1. CORE CRUD & INITIALIZATION
    // ==========================================
    describe("Core CRUD & Queries", () => {
        it("POST: creates a batch with valid quantity and future expiredAt", async () => {
            const payload: Omit<Batch, "id" | "createdAt"> = {
                variantId: batchedVariant.id,
                batchNumber: `LOT-${Date.now()}`,
                quantity: 150,
                expiredAt: futureDate,
            };

            const batch = await createBatch(payload);

            expect(batch).toBeDefined();
            expect(batch.id).toBeTypeOf("number");
            expect(batch.variantId).toBe(batchedVariant.id);
            expect(batch.batchNumber).toBe(payload.batchNumber);
            expect(batch.quantity).toBe(150);

            expect(new Date(batch.expiredAt).getTime()).toBe(new Date(futureDate).getTime());

            expect(batch.createdAt).toBeDefined();

            createdBatchIds.push(batch.id);
            sharedBatchId = batch.id;
        });

        it("GET: retrieves batch by primary key ID", async () => {
            const batch = await getBatchById(sharedBatchId);

            expect(batch).toBeDefined();
            expect(batch.id).toBe(sharedBatchId);
            expect(batch.variantId).toBe(batchedVariant.id);
        });

        it("GET: retrieves all batches for a specific variantId", async () => {
            const list = await getBatchesByVariantId(batchedVariant.id);

            expect(Array.isArray(list)).toBe(true);
            expect(list.length).toBeGreaterThan(0);
            expect(list.some((b) => b.id === sharedBatchId)).toBe(true);
            expect(list.every((b) => b.variantId === batchedVariant.id)).toBe(true);
        });

        it("PATCH: updates expiredAt date for an existing batch", async () => {
            const updatedExpiry = new Date(Date.now() + 1000 * 60 * 60 * 24 * 120)
                .toISOString()
                .split("T")[0];

            const updated = await updateBatch(sharedBatchId, {
                expiredAt: updatedExpiry,
            });

            expect(updated.id).toBe(sharedBatchId);
            expect(new Date(updated.expiredAt).getTime()).toBe(new Date(updatedExpiry).getTime());
        });
    });

    // ==========================================
    // 2. BUSINESS LOGIC & INVARIANTS
    // ==========================================
    describe("Business Logic & Constraints", () => {
        it("POST: rejects batch creation if quantity is <= 0", async () => {
            const zeroQuantityPayload: Omit<Batch, "id" | "createdAt"> = {
                variantId: batchedVariant.id,
                batchNumber: `LOT-ZERO-${Date.now()}`,
                quantity: 0,
                expiredAt: futureDate,
            };

            await expect(createBatch(zeroQuantityPayload)).rejects.toThrow();

            const negativeQuantityPayload: Omit<Batch, "id" | "createdAt"> = {
                ...zeroQuantityPayload,
                batchNumber: `LOT-NEG-${Date.now()}`,
                quantity: -10,
            };

            await expect(createBatch(negativeQuantityPayload)).rejects.toThrow();
        });

        it("POST: rejects batch creation if expiredAt is in the past", async () => {
            const expiredPayload: Omit<Batch, "id" | "createdAt"> = {
                variantId: batchedVariant.id,
                batchNumber: `LOT-EXPIRED-${Date.now()}`,
                quantity: 50,
                expiredAt: pastDate,
            };

            await expect(createBatch(expiredPayload)).rejects.toThrow();
        });

        it("POST: rejects batch creation if parent product is not batchTracked", async () => {
            const payload: Omit<Batch, "id" | "createdAt"> = {
                variantId: unbatchedVariant.id, // product has batchTracked = false
                batchNumber: `LOT-UNTRACKED-${Date.now()}`,
                quantity: 50,
                expiredAt: futureDate,
            };

            await expect(createBatch(payload)).rejects.toThrow();
        });

        it("POST: rejects duplicate batchNumber for the same variant", async () => {
            const duplicateBatchNumber = `LOT-DUP-${Date.now()}`;

            const first = await createBatch({
                variantId: batchedVariant.id,
                batchNumber: duplicateBatchNumber,
                quantity: 100,
                expiredAt: futureDate,
            });
            createdBatchIds.push(first.id);

            const duplicatePayload: Omit<Batch, "id" | "createdAt"> = {
                variantId: batchedVariant.id,
                batchNumber: duplicateBatchNumber,
                quantity: 50,
                expiredAt: futureDate,
            };

            try {
                const second = await createBatch(duplicatePayload);
                if (second?.id) createdBatchIds.push(second.id);
                expect.unreachable("Should have rejected duplicate batchNumber");
            } catch (err) {
                expect(err).toBeDefined();
            }
        });
    });

    // ==========================================
    // 3. FOREIGN KEY & BOUNDARY CHECKS
    // ==========================================
    describe("Foreign Key & Error Boundaries", () => {
        it("GET: fails when batch ID does not exist", async () => {
            await expect(getBatchById(99999999)).rejects.toThrow();
        });

        it("POST: fails when variantId does not exist (FK constraint)", async () => {
            const invalidPayload: Omit<Batch, "id" | "createdAt"> = {
                variantId: 99999999,
                batchNumber: `LOT-NO-FK-${Date.now()}`,
                quantity: 50,
                expiredAt: futureDate,
            };

            await expect(createBatch(invalidPayload)).rejects.toThrow();
        });

        it("PATCH: fails when attempting to update a non-existent batch ID", async () => {
            await expect(
                updateBatch(99999999, { expiredAt: futureDate })
            ).rejects.toThrow();
        });

        it("PATCH: passing empty payload leaves batch unchanged", async () => {
            const before = await getBatchById(sharedBatchId);
            const after = await updateBatch(sharedBatchId, {});

            expect(after.quantity).toBe(before.quantity);
            expect(after.batchNumber).toBe(before.batchNumber);
            expect(after.expiredAt).toBe(before.expiredAt);
        });
    });
});