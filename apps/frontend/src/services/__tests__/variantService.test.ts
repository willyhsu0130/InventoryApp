import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import type { Product, Variant, ProductConfig, VariantConfigAttribute } from "@my-inventory-app/shared";
import { createProduct, deleteProduct } from "../productService";
import {
    createVariant,
    getVariantById,
    getVariantsByProductId,
    getActiveVariantsByProductId,
    updateVariant,
    deleteVariant,
} from "../variantService";

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

describe("Variant Service", () => {
    const createdProductIds: Product["id"][] = [];
    const createdVariantIds: Variant["id"][] = [];
    let configuredVariantId: number;

    let baseProduct: Product;
    let configuredProduct: Product;
    let sharedVariantId: number;

    beforeAll(async () => {
        // 1. Create a parent product without configs
        baseProduct = await createProduct({
            name: `Variant Test Base Product ${Date.now()}`,
            uom: "pcs",
            batchTracked: false,
            configs: [],
        });
        createdProductIds.push(baseProduct.id);

        // 2. Create a parent product with configs
        const configs: ProductConfig[] = [
            { id: 1, name: "Grind Size", value: ["Fine", "Medium", "Coarse"] },
            { id: 2, name: "Roast Level", value: ["Light", "Dark"] },
        ];

        configuredProduct = await createProduct({
            name: `Variant Test Config Product ${Date.now()}`,
            uom: "bags",
            batchTracked: true,
            configs,
        });
        createdProductIds.push(configuredProduct.id);
    });

    afterAll(async () => {
        // Clean up child variants first (foreign key dependency)
        if (createdVariantIds.length > 0) {
            const { error: varError } = await supabase
                .from("variants")
                .delete()
                .in("id", createdVariantIds);
            if (varError) console.error("Variants cleanup failed:", varError);
        }

        // Clean up parent products
        if (createdProductIds.length > 0) {
            const { error: prodError } = await supabase
                .from("products")
                .delete()
                .in("id", createdProductIds);
            if (prodError) console.error("Products cleanup failed:", prodError);
        }
    });

    // ==========================================
    // 1. HAPPY PATH (CRUD & Config Attributes)
    // ==========================================
    describe("Core CRUD & Configs", () => {
        it("POST: creates a basic variant with no configs and null SKU", async () => {
            const payload: Omit<Variant, "id" | "isArchived"> = {
                productId: baseProduct.id,
                sku: null,
                salesPrice: 15.5,
                configs: [],
            };

            const variant = await createVariant(payload);

            expect(variant).toBeDefined();
            expect(variant.id).toBeTypeOf("number");
            expect(variant.productId).toBe(baseProduct.id);
            expect(variant.sku).toBeNull();
            expect(variant.salesPrice).toBe(15.5);
            expect(variant.configs).toEqual([]);
            expect(variant.isArchived).toBe(false);

            createdVariantIds.push(variant.id);
            sharedVariantId = variant.id;
        });

        it("POST: creates a configured variant with SKU and configs array", async () => {
            const variantConfigs: VariantConfigAttribute[] = [
                { name: "Grind Size", value: "Fine" },
                { name: "Roast Level", value: "Dark" },
            ];
            const sku = `SKU-CFG-${Date.now()}`;

            const variant = await createVariant({
                productId: configuredProduct.id,
                sku,
                salesPrice: 22.0,
                configs: variantConfigs,
            });

            expect(variant.id).toBeTypeOf("number");
            expect(variant.productId).toBe(configuredProduct.id);
            expect(variant.sku).toBe(sku);
            expect(variant.salesPrice).toBe(22.0);
            expect(variant.configs).toEqual(variantConfigs);
            expect(variant.isArchived).toBe(false);

            createdVariantIds.push(variant.id);
            configuredVariantId = variant.id; // <-- 1. Capture configured variant ID here
        });

        it("PATCH: updates primitive fields (sku, salesPrice)", async () => {
            const newSku = `SKU-UPDATED-${Date.now()}`;
            const updated = await updateVariant(sharedVariantId, {
                sku: newSku,
                salesPrice: 18.75,
            });

            expect(updated.id).toBe(sharedVariantId);
            expect(updated.sku).toBe(newSku);
            expect(updated.salesPrice).toBe(18.75);
        });

        it("PATCH: updates configs array", async () => {
            const newConfigs: VariantConfigAttribute[] = [
                { name: "Grind Size", value: "Coarse" },
            ];

            // 2. Use configuredVariantId here
            const updated = await updateVariant(configuredVariantId, {
                configs: newConfigs,
            });

            expect(updated.configs).toEqual(newConfigs);
        });

        it("PATCH: resets configs array to empty", async () => {
            // 3. Use configuredVariantId here
            const updated = await updateVariant(configuredVariantId, {
                configs: [],
            });

            expect(updated.configs).toEqual([]);
        });

        it("GET: retrieves single variant by ID", async () => {
            const variant = await getVariantById(sharedVariantId);

            expect(variant).toBeDefined();
            expect(variant.id).toBe(sharedVariantId);
            expect(variant.productId).toBe(baseProduct.id);
        });

        it("GET: retrieves all variants under a product ID", async () => {
            const list = await getVariantsByProductId(baseProduct.id);

            expect(Array.isArray(list)).toBe(true);
            const exists = list.some((v) => v.id === sharedVariantId);
            expect(exists).toBe(true);
        });

        it("GET: retrieves active variants under a product ID", async () => {
            const activeList = await getActiveVariantsByProductId(baseProduct.id);

            expect(Array.isArray(activeList)).toBe(true);
            const exists = activeList.some((v) => v.id === sharedVariantId);
            expect(exists).toBe(true);
        });
    });

    // ==========================================
    // 2. ARCHIVE & CASCADING BEHAVIORS
    // ==========================================
    describe("Archiving & Soft Delete Rules", () => {
        it("DELETE: soft-deletes a variant (is_archived = true)", async () => {
            const archived = await deleteVariant(sharedVariantId);
            expect(archived.isArchived).toBe(true);
        });

        it("GET: getActiveVariantsByProductId strictly excludes archived variants", async () => {
            const activeList = await getActiveVariantsByProductId(baseProduct.id);
            const exists = activeList.some((v) => v.id === sharedVariantId);
            expect(exists).toBe(false);
        });

        it("GET: getVariantById still retrieves archived variant for history", async () => {
            const variant = await getVariantById(sharedVariantId);
            expect(variant).toBeDefined();
            expect(variant.id).toBe(sharedVariantId);
            expect(variant.isArchived).toBe(true);
        });

        it("DELETE (Cascade): archiving parent product soft-deletes associated variants", async () => {
            const cascadeProduct = await createProduct({
                name: `Cascade Test Parent ${Date.now()}`,
                uom: "pcs",
                batchTracked: false,
                configs: [],
            });
            createdProductIds.push(cascadeProduct.id);

            const childVariant = await createVariant({
                productId: cascadeProduct.id,
                sku: `SKU-CASCADE-${Date.now()}`,
                salesPrice: 10,
                configs: [],
            });
            createdVariantIds.push(childVariant.id);

            // Archive the parent product
            await deleteProduct(cascadeProduct.id);

            // The child variant must now be soft-deleted
            const refreshedVariant = await getVariantById(childVariant.id);
            expect(refreshedVariant.isArchived).toBe(true);
        });
    });

    // ==========================================
    // 3. ERROR HANDLING & VALIDATION
    // ==========================================
    describe("Validation & Error Boundaries", () => {
        it("GET: fails when variant ID does not exist", async () => {
            await expect(getVariantById(99999999)).rejects.toThrow();
        });

        it("POST: fails when parent product ID does not exist (FK constraint)", async () => {
            await expect(
                createVariant({
                    productId: 99999999,
                    sku: `SKU-INVALID-FK-${Date.now()}`,
                    salesPrice: 10,
                    configs: [],
                })
            ).rejects.toThrow();
        });

        it("POST: fails when SKU already exists (unique constraint)", async () => {
            const duplicateSku = `SKU-DUP-${Date.now()}`;
            const payload: Omit<Variant, "id" | "isArchived"> = {
                productId: baseProduct.id,
                sku: duplicateSku,
                salesPrice: 10,
                configs: [],
            };

            const first = await createVariant(payload);
            createdVariantIds.push(first.id);

            try {
                const second = await createVariant(payload);
                if (second?.id) createdVariantIds.push(second.id);
                expect.unreachable("Should have failed on duplicate SKU");
            } catch (err) {
                expect(err).toBeDefined();
            }
        });

        it("PATCH: fails when attempting to update a non-existent variant ID", async () => {
            await expect(
                updateVariant(99999999, { salesPrice: 50 })
            ).rejects.toThrow();
        });

        it("PATCH: passing an empty object leaves existing record unchanged", async () => {
            const before = await getVariantById(sharedVariantId);
            const after = await updateVariant(sharedVariantId, {});

            expect(after.sku).toBe(before.sku);
            expect(after.salesPrice).toBe(before.salesPrice);
            expect(after.configs).toEqual(before.configs);
            expect(after.isArchived).toBe(before.isArchived);
        });
    });

    // ==========================================
    // CONFIG & ATTRIBUTE INTEGRITY RULES
    // ==========================================
    describe("Config & Attribute Validation Rules", () => {
        it("POST: fails when variant config attribute name does not exist in parent product configs", async () => {
            const invalidPayload: Omit<Variant, "id" | "isArchived"> = {
                productId: configuredProduct.id,
                sku: `SKU-INVALID-NAME-${Date.now()}`,
                salesPrice: 20,
                configs: [{ name: "NonExistentConfig", value: "Fine" }],
            };

            await expect(createVariant(invalidPayload)).rejects.toThrow();
        });

        it("POST: fails when variant config attribute value is not in parent product allowed values", async () => {
            const invalidPayload: Omit<Variant, "id" | "isArchived"> = {
                productId: configuredProduct.id,
                sku: `SKU-INVALID-VAL-${Date.now()}`,
                salesPrice: 20,
                // "UltraFine" is not in ["Fine", "Medium", "Coarse"]
                configs: [{ name: "Grind Size", value: "UltraFine" }],
            };

            await expect(createVariant(invalidPayload)).rejects.toThrow();
        });

        it("POST: fails when creating duplicate active variants with identical config combinations", async () => {
            const identicalConfigs: VariantConfigAttribute[] = [
                { name: "Grind Size", value: "Fine" },
                { name: "Roast Level", value: "Dark" },
            ];

            // 1. First insert must succeed
            const first = await createVariant({
                productId: configuredProduct.id,
                sku: `SKU-COMBO-1-${Date.now()}`,
                salesPrice: 20,
                configs: identicalConfigs,
            });
            createdVariantIds.push(first.id);

            // 2. Second insert with identical config combination for the same product must fail
            const duplicateAttempt: Omit<Variant, "id" | "isArchived"> = {
                productId: configuredProduct.id,
                sku: `SKU-COMBO-2-${Date.now()}`,
                salesPrice: 22,
                configs: identicalConfigs,
            };

            try {
                const second = await createVariant(duplicateAttempt);
                if (second?.id) createdVariantIds.push(second.id);
                expect.unreachable("Should reject identical variant config combination");
            } catch (err) {
                expect(err).toBeDefined();
            }
        });
    });
});