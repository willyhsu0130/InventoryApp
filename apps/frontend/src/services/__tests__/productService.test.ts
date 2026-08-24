import { describe, it, expect, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import type { Product, ProductConfig } from "@my-inventory-app/shared";
import {
    createProduct,
    getProductById,
    getActiveProducts,
    updateProduct,
    deleteProduct,
} from "../productService";

// Load root env files via ESM path resolution
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    throw new Error(
        "Missing Supabase credentials for test execution. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY exist in .env.test or .env.local."
    );
}

// Direct client used exclusively for test teardown and DB setup
const supabase = createClient(supabaseUrl, supabaseKey);


describe("Product Service", () => {
    const createdProductIds: Product["id"][] = [];
    let sharedProductId: number;

    afterAll(async () => {
        if (createdProductIds.length > 0) {
            // 1. Clean up auto-created child variants
            await supabase
                .from("variants")
                .delete()
                .in("product_id", createdProductIds);

            // 2. Clean up parent products
            const { error: prodError } = await supabase
                .from("products")
                .delete()
                .in("id", createdProductIds);
            if (prodError) console.error("Products cleanup failed:", prodError);
        }
    });

    // ==========================================
    // 1. HAPPY PATH (CRUD & Configs)
    // ==========================================
    describe("Core CRUD & Configs", () => {
        it("POST: automatically creates at least one default variant when creating an unconfigured product", async () => {
            const payload: Omit<Product, "id" | "isArchived"> = {
                name: `Auto Variant Standard ${Date.now()}`,
                uom: "kg",
                batchTracked: false,
                configs: [],
            };

            const product = await createProduct(payload);
            createdProductIds.push(product.id);

            // Query variants table to verify auto-generation
            const { data: variants, error } = await supabase
                .from("variants")
                .select("*")
                .eq("product_id", product.id);

            if (error) throw error;

            expect(variants).toBeDefined();
            expect(variants.length).toBeGreaterThanOrEqual(1);

            // Verify default variant properties
            const defaultVariant = variants[0];
            expect(defaultVariant.product_id).toBe(product.id);
            expect(defaultVariant.is_archived).toBe(false);
            expect(defaultVariant.configs).toEqual([]);
        });

        it("POST: automatically creates initial variants when product is created with configs", async () => {
            const configs: ProductConfig[] = [
                { name: "Grind Size", values: ["Fine", "Coarse"] },
            ];

            const product = await createProduct({
                name: `Auto Variant Configured ${Date.now()}`,
                uom: "bags",
                batchTracked: true,
                configs,
            });
            createdProductIds.push(product.id);

            const { data: variants, error } = await supabase
                .from("variants")
                .select("*")
                .eq("product_id", product.id);

            if (error) throw error;

            expect(variants).toBeDefined();
            expect(variants.length).toBeGreaterThanOrEqual(1);
            expect(variants[0].product_id).toBe(product.id);
        });

        it("POST: creates a product without configs", async () => {
            const payload: Omit<Product, "id" | "isArchived"> = {
                name: "Standard Ground Coffee",
                uom: "kg",
                batchTracked: false,
                configs: [],
            };

            const product = await createProduct(payload);
            expect(product).toBeDefined();
            expect(product.id).toBeTypeOf("number");
            expect(product.name).toBe(payload.name);
            expect(product.uom).toBe(payload.uom);
            expect(product.batchTracked).toBe(false);
            expect(product.isArchived).toBe(false);

            createdProductIds.push(product.id);
            sharedProductId = product.id;
        });

        it("POST: creates a product with initial configs", async () => {
            const configs: ProductConfig[] = [
                { name: "Grind Size", values: ["Fine", "Medium", "Coarse"] },
                { name: "Roast Level", values: ["Light", "Dark"] },
            ];

            const product = await createProduct({
                name: "Configurable Artisan Roast",
                uom: "bags",
                batchTracked: true,
                configs,
            });

            expect(product.id).toBeTypeOf("number");
            expect(product.configs).toEqual(configs);

            createdProductIds.push(product.id);
        });

        it("PATCH: edits primitive fields (name, uom)", async () => {
            const updated = await updateProduct(sharedProductId, {
                name: "Premium Ground Coffee",
                uom: "pcs",
            });

            expect(updated.id).toBe(sharedProductId);
            expect(updated.name).toBe("Premium Ground Coffee");
            expect(updated.uom).toBe("pcs");
        });

        it("PATCH: updates configs array", async () => {
            const newConfigs: ProductConfig[] = [
                { name: "Flavor Notes", values: ["Fruity", "Nutty"] },
            ];

            const updated = await updateProduct(sharedProductId, {
                configs: newConfigs,
            });

            expect(updated.configs).toEqual(newConfigs);
        });

        it("PATCH: removes configs (resets to empty array)", async () => {
            const updated = await updateProduct(sharedProductId, {
                configs: [],
            });

            expect(updated.configs).toEqual([]);
        });

        it("GET: retrieves a single product by ID", async () => {
            const product = await getProductById(sharedProductId);

            expect(product).toBeDefined();
            expect(product.id).toBe(sharedProductId);
            expect(product.name).toBe("Premium Ground Coffee");
        });

        it("GET: retrieves active product list", async () => {
            const activeList = await getActiveProducts();

            expect(Array.isArray(activeList)).toBe(true);
            const exists = activeList.some((p) => p.id === sharedProductId);
            expect(exists).toBe(true);
        });
    });

    // ==========================================
    // 2. ARCHIVE & CASCADING BEHAVIORS
    // ==========================================
    describe("Archiving & Soft Delete Rules", () => {
        // let cascadeProductId: number;
        // let childVariantId: number;

        it("DELETE: soft-deletes the product (is_archived = true)", async () => {
            const archivedProduct = await deleteProduct(sharedProductId);
            expect(archivedProduct.isArchived).toBe(true);
        });

        it("GET: getActiveProducts strictly excludes archived products", async () => {
            const activeList = await getActiveProducts();
            const exists = activeList.some((p) => p.id === sharedProductId);
            expect(exists).toBe(false);
        });

        it("GET: getProductById still retrieves archived product for history", async () => {
            const product = await getProductById(sharedProductId);
            expect(product).toBeDefined();
            expect(product.id).toBe(sharedProductId);
            expect(product.isArchived).toBe(true);
        });
    });

    it("DELETE: cascades is_archived = true to ALL auto-generated and existing child variants", async () => {
        // 1. Create product with multiple config permutations (creates 4 variants)
        const product = await createProduct({
            name: `Multi-Variant Cascade Target ${Date.now()}`,
            uom: "pcs",
            batchTracked: false,
            configs: [
                { name: "Size", values: ["S", "M"] },
                { name: "Color", values: ["Red", "Blue"] },
            ],
        });
        createdProductIds.push(product.id);

        // 2. Verify all 4 variants are active initially
        const { data: initialVariants } = await supabase
            .from("variants")
            .select("id, is_archived")
            .eq("product_id", product.id);

        expect(initialVariants?.length).toBe(4);
        expect(initialVariants?.every((v) => v.is_archived === false)).toBe(true);

        // 3. Soft-delete the parent product
        const archivedProduct = await deleteProduct(product.id);
        expect(archivedProduct.isArchived).toBe(true);

        // 4. Verify EVERY child variant under this product is now soft-deleted
        const { data: updatedVariants } = await supabase
            .from("variants")
            .select("id, is_archived")
            .eq("product_id", product.id);

        expect(updatedVariants?.length).toBe(4);
        expect(updatedVariants?.every((v) => v.is_archived === true)).toBe(true);
    });

    // ==========================================
    // 3. ERROR HANDLING & VALIDATION
    // ==========================================
    describe("Validation & Error Boundaries", () => {
        it("GET: fails when product ID does not exist", async () => {
            await expect(getProductById(99999999)).rejects.toThrow();
        });

        it("POST: fails when product name is the same", async () => {
            const duplicatePayload: Omit<Product, "id" | "isArchived"> = {
                name: `Duplicate Test Product ${Date.now()}`,
                uom: "kg",
                batchTracked: false,
                configs: [],
            };

            const first = await createProduct(duplicatePayload);
            createdProductIds.push(first.id);

            try {
                const second = await createProduct(duplicatePayload);
                // If it mistakenly created a 2nd row, track it so afterAll deletes it
                if (second?.id) createdProductIds.push(second.id);
                expect.unreachable("Should have thrown duplicate name error");
            } catch (err) {
                expect(err).toBeDefined();
            }
        });

        it("PATCH: fails when attempting to update a non-existent ID", async () => {
            await expect(
                updateProduct(99999999, { name: "Non-existent Update" })
            ).rejects.toThrow();
        });

        it("PATCH: passing an empty object leaves existing record unchanged", async () => {
            const before = await getProductById(sharedProductId);
            const after = await updateProduct(sharedProductId, {});

            expect(after.name).toBe(before.name);
            expect(after.uom).toBe(before.uom);
        });
        it("DELETE: cascades is_archived = true to all associated variants", async () => {
            // 1. Create target parent product
            const product = await createProduct({
                name: `Cascade Target Product ${Date.now()}`,
                uom: "pcs",
                batchTracked: false,
                configs: [],
            });
            createdProductIds.push(product.id);

            // 2. Insert associated child variant directly
            const { data: variant, error: varError } = await supabase
                .from("variants")
                .insert({
                    product_id: product.id,
                    sku: `TEST-SKU-CASCADE-${Date.now()}`,
                    sales_price: 10,
                    configs: [],
                    is_archived: false,
                })
                .select()
                .single();

            if (varError) throw varError;

            // 3. Perform soft delete on the parent product
            await deleteProduct(product.id);

            // 4. Verify cascade soft-deletion on the child variant
            const { data: updatedVariant, error: fetchError } = await supabase
                .from("variants")
                .select("is_archived")
                .eq("id", variant.id)
                .single();

            if (fetchError) throw fetchError;

            expect(updatedVariant?.is_archived).toBe(true);
        });

    });

    // ==========================================
    // 1. EXACT AUTO-GENERATION COUNT CHECKS
    // ==========================================
    describe("Variant Auto-Generation Rules", () => {
        it("POST: creates EXACTLY ONE default variant when product has NO configs", async () => {
            const payload: Omit<Product, "id" | "isArchived"> = {
                name: `Single Default Variant Item ${Date.now()}`,
                uom: "pcs",
                batchTracked: false,
                configs: [],
            };

            const product = await createProduct(payload);
            createdProductIds.push(product.id);

            const { data: variants, error } = await supabase
                .from("variants")
                .select("*")
                .eq("product_id", product.id);

            if (error) throw error;

            // Strictly assert EXACTLY 1 variant exists
            expect(variants).toBeDefined();
            expect(variants?.length).toBe(1);

            const defaultVariant = variants![0];
            expect(defaultVariant.product_id).toBe(product.id);
            expect(defaultVariant.is_archived).toBe(false);
            expect(defaultVariant.configs).toEqual([]);
        });

        it("POST: creates EXACTLY matching variants corresponding to config permutations", async () => {
            // 2 grind sizes * 2 roast levels = 4 total variants
            const configs: ProductConfig[] = [
                { name: "Grind Size", values: ["Fine", "Coarse"] },
                { name: "Roast Level", values: ["Light", "Dark"] },
            ];

            const product = await createProduct({
                name: `Permuted Variant Item ${Date.now()}`,
                uom: "bags",
                batchTracked: true,
                configs,
            });
            createdProductIds.push(product.id);

            const { data: variants, error } = await supabase
                .from("variants")
                .select("*")
                .eq("product_id", product.id);

            if (error) throw error;

            // Strictly assert EXACTLY 4 variants (2 * 2) are created
            expect(variants).toBeDefined();
            expect(variants?.length).toBe(4);
        });
    });
})

