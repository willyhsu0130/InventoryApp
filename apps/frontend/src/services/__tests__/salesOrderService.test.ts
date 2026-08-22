import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import type {
    Product,
    Variant,
    Batch,
    Location,
    Customer,
    SalesOrder,
    CreateSalesOrderPayload,
    Database,
} from "@my-inventory-app/shared";
import { createProduct } from "../productService";
import { createVariant } from "../variantService";
import { createBatch } from "../batchService";
import { createLocation } from "../locationService";
import { createCustomer } from "../customerService";
import {
    createSalesOrder,
    getSalesOrderById,
    getSalesOrdersByCustomerId,
    getSalesOrdersByStatus,
    updateSalesOrderStatus,
} from "../salesOrderService";

// Load environment variables for testing
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), ".env"), quiet: true });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error(
        "Missing Supabase credentials for test execution. Ensure SUPABASE_URL and SUPABASE_ANON_KEY exist."
    );
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
});

describe("Sales Order Service", () => {
    const createdCustomerIds: Customer["id"][] = [];
    const createdLocationIds: Location["id"][] = [];
    const createdProductIds: Product["id"][] = [];
    const createdVariantIds: Variant["id"][] = [];
    const createdBatchIds: Batch["id"][] = [];
    const createdOrderIds: SalesOrder["id"][] = [];

    let testCustomer: Customer;
    let testLocation: Location;

    let unbatchedProduct: Product;
    let unbatchedVariant: Variant;

    let batchedProduct: Product;
    let batchedVariant: Variant;
    let foreignVariant: Variant;
    let testBatch: Batch;

    let sharedOrderId: number;

    beforeAll(async () => {
        // 1. Create Test Location
        testLocation = await createLocation({
            name: `SO Warehouse ${Date.now()}`,
            line1: "100 Logistics Way",
            line2: null,
            city: "Toronto",
            state: "ON",
            country: "Canada",
        });
        createdLocationIds.push(testLocation.id);

        // 2. Create Test Customer via customerService
        testCustomer = await createCustomer({
            firstName: "Test1",
            lastName: "Test2",
            email: `willyhsu.${Date.now()}@example.com`,
            line1: "Foo District",
            line2: null,
            city: "Taipei",
            state: null,
            country: "Taiwan",
            phoneNumber: "0900000000",
            company: null,
        });
        createdCustomerIds.push(testCustomer.id);

        // 3. Create Unbatched Product & Variant
        unbatchedProduct = await createProduct({
            name: `SO Unbatched Item ${Date.now()}`,
            uom: "pcs",
            batchTracked: false,
            configs: [],
        });
        createdProductIds.push(unbatchedProduct.id);

        unbatchedVariant = await createVariant({
            productId: unbatchedProduct.id,
            sku: `SKU-SO-UNB-${Date.now()}`,
            salesPrice: 20,
            configs: [],
        });
        createdVariantIds.push(unbatchedVariant.id);

        // 4. Create Batched Product & Variant
        batchedProduct = await createProduct({
            name: `SO Batched Item ${Date.now()}`,
            uom: "kg",
            batchTracked: true,
            configs: [],
        });
        createdProductIds.push(batchedProduct.id);

        batchedVariant = await createVariant({
            productId: batchedProduct.id,
            sku: `SKU-SO-BAT-${Date.now()}`,
            salesPrice: 45,
            configs: [],
        });
        createdVariantIds.push(batchedVariant.id);

        // 5. Create Foreign Variant (for cross-variant batch mismatch tests)
        foreignVariant = await createVariant({
            productId: batchedProduct.id,
            sku: `SKU-SO-FOREIGN-${Date.now()}`,
            salesPrice: 50,
            configs: [],
        });
        createdVariantIds.push(foreignVariant.id);

        // 6. Create Test Batch
        const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 90)
            .toISOString()
            .split("T")[0];
        testBatch = await createBatch({
            variantId: batchedVariant.id,
            batchNumber: `SO-LOT-${Date.now()}`,
            quantity: 200,
            expiredAt: futureDate,
        });
        createdBatchIds.push(testBatch.id);
    });

    afterAll(async () => {
        // Reverse foreign key dependency teardown
        if (createdOrderIds.length > 0) {
            await supabase
                .from("sales_order_items")
                .delete()
                .in("sales_order_id", createdOrderIds);
            await supabase
                .from("sales_orders")
                .delete()
                .in("id", createdOrderIds);
        }

        if (createdBatchIds.length > 0) {
            await supabase
                .from("batches")
                .delete()
                .in("id", createdBatchIds);
        }

        if (createdVariantIds.length > 0) {
            await supabase
                .from("variants")
                .delete()
                .in("id", createdVariantIds);
        }

        if (createdProductIds.length > 0) {
            await supabase
                .from("products")
                .delete()
                .in("id", createdProductIds);
        }

        if (createdCustomerIds.length > 0) {
            await supabase
                .from("customers")
                .delete()
                .in("id", createdCustomerIds);
        }

        if (createdLocationIds.length > 0) {
            await supabase
                .from("locations")
                .delete()
                .in("id", createdLocationIds);
        }
    });

    // ==========================================
    // 1. CORE CREATION & LINE ITEM INGESTION
    // ==========================================
    describe("Core Creation & Line Item Ingestion", () => {
        it("POST: creates a sales order with default status PENDING and nested items", async () => {
            const payload: CreateSalesOrderPayload = {
                customerId: testCustomer.id,
                locationId: testLocation.id,
                salesOrderItems: [
                    {
                        variantId: unbatchedVariant.id,
                        batchId: null,
                        quantity: 5,
                        pricePerUnit: 20,
                    },
                    {
                        variantId: batchedVariant.id,
                        batchId: testBatch.id,
                        quantity: 2,
                        pricePerUnit: 45,
                    },
                ],
            };

            const order = await createSalesOrder(payload);

            expect(order).toBeDefined();
            expect(order.id).toBeTypeOf("number");
            expect(order.customerId).toBe(testCustomer.id);
            expect(order.locationId).toBe(testLocation.id);
            expect(order.salesOrderStatus).toBe("PENDING");
            expect(order.createdAt).toBeDefined();
            expect(order.updatedAt).toBeDefined();

            expect(Array.isArray(order.salesOrderItems)).toBe(true);
            expect(order.salesOrderItems.length).toBe(2);

            const unbatchedItem = order.salesOrderItems.find((i) => i.variantId === unbatchedVariant.id);
            expect(unbatchedItem).toBeDefined();
            expect(unbatchedItem?.salesOrderId).toBe(order.id);
            expect(unbatchedItem?.batchId).toBeNull();
            expect(unbatchedItem?.quantity).toBe(5);
            expect(unbatchedItem?.pricePerUnit).toBe(20);

            const batchedItem = order.salesOrderItems.find((i) => i.variantId === batchedVariant.id);
            expect(batchedItem).toBeDefined();
            expect(batchedItem?.batchId).toBe(testBatch.id);
            expect(batchedItem?.quantity).toBe(2);

            createdOrderIds.push(order.id);
            sharedOrderId = order.id;
        });

        it("POST: creates a sales order explicitly specifying COMPLETED status", async () => {
            const payload: CreateSalesOrderPayload = {
                customerId: testCustomer.id,
                locationId: testLocation.id,
                salesOrderStatus: "COMPLETED",
                salesOrderItems: [
                    {
                        variantId: unbatchedVariant.id,
                        batchId: null,
                        quantity: 1,
                        pricePerUnit: 20,
                    },
                ],
            };

            const order = await createSalesOrder(payload);

            expect(order.id).toBeTypeOf("number");
            expect(order.salesOrderStatus).toBe("COMPLETED");

            createdOrderIds.push(order.id);
        });
    });

    // ==========================================
    // 2. QUERYING & FILTERING
    // ==========================================
    describe("Querying & Filtering", () => {
        it("GET by ID: retrieves a single order with hydrated line items", async () => {
            const order = await getSalesOrderById(sharedOrderId);

            expect(order).toBeDefined();
            expect(order.id).toBe(sharedOrderId);
            expect(order.customerId).toBe(testCustomer.id);
            expect(order.salesOrderItems.length).toBe(2);
        });

        it("GET by Customer ID: retrieves orders for a specific customer", async () => {
            const orders = await getSalesOrdersByCustomerId(testCustomer.id);

            expect(Array.isArray(orders)).toBe(true);
            expect(orders.length).toBeGreaterThan(0);
            expect(orders.every((o) => o.customerId === testCustomer.id)).toBe(true);
            expect(orders.some((o) => o.id === sharedOrderId)).toBe(true);
        });

        it("GET by Status: filters orders strictly by salesOrderStatus", async () => {
            const pendingOrders = await getSalesOrdersByStatus("PENDING");

            expect(Array.isArray(pendingOrders)).toBe(true);
            expect(pendingOrders.every((o) => o.salesOrderStatus === "PENDING")).toBe(true);
            expect(pendingOrders.some((o) => o.id === sharedOrderId)).toBe(true);
        });
    });

    // ==========================================
    // 3. STATUS TRANSITIONS & UPDATES
    // ==========================================
    describe("Status Transitions & Updates", () => {
        it("PATCH: updates order status from PENDING to COMPLETED and refreshes updatedAt", async () => {
            const before = await getSalesOrderById(sharedOrderId);

            const updated = await updateSalesOrderStatus(sharedOrderId, "COMPLETED");

            expect(updated.id).toBe(sharedOrderId);
            expect(updated.salesOrderStatus).toBe("COMPLETED");
            expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(
                new Date(before.updatedAt).getTime()
            );
        });

        it("PATCH: rejects invalid status string values", async () => {
            await expect(
                updateSalesOrderStatus(sharedOrderId, "CANCELLED" as "PENDING")
            ).rejects.toThrow();
        });
    });

    // ==========================================
    // 4. LINE ITEM & BATCH VALIDATION RULES
    // ==========================================
    describe("Line Item & Batch Validation Rules", () => {
        it("POST: rejects order creation when salesOrderItems array is empty", async () => {
            const payload: CreateSalesOrderPayload = {
                customerId: testCustomer.id,
                locationId: testLocation.id,
                salesOrderItems: [],
            };

            await expect(createSalesOrder(payload)).rejects.toThrow();
        });

        it("POST: rejects line items with quantity <= 0", async () => {
            const payload: CreateSalesOrderPayload = {
                customerId: testCustomer.id,
                locationId: testLocation.id,
                salesOrderItems: [
                    {
                        variantId: unbatchedVariant.id,
                        batchId: null,
                        quantity: 0,
                        pricePerUnit: 10,
                    },
                ],
            };

            await expect(createSalesOrder(payload)).rejects.toThrow();
        });

        it("POST: rejects line items with pricePerUnit < 0", async () => {
            const payload: CreateSalesOrderPayload = {
                customerId: testCustomer.id,
                locationId: testLocation.id,
                salesOrderItems: [
                    {
                        variantId: unbatchedVariant.id,
                        batchId: null,
                        quantity: 1,
                        pricePerUnit: -5,
                    },
                ],
            };

            await expect(createSalesOrder(payload)).rejects.toThrow();
        });

        it("POST: rejects assigning batchId to a non-batch-tracked variant", async () => {
            const payload: CreateSalesOrderPayload = {
                customerId: testCustomer.id,
                locationId: testLocation.id,
                salesOrderItems: [
                    {
                        variantId: unbatchedVariant.id,
                        batchId: testBatch.id,
                        quantity: 1,
                        pricePerUnit: 10,
                    },
                ],
            };

            await expect(createSalesOrder(payload)).rejects.toThrow();
        });

        it("POST: rejects assigning a batchId that does not belong to the line variantId", async () => {
            const payload: CreateSalesOrderPayload = {
                customerId: testCustomer.id,
                locationId: testLocation.id,
                salesOrderItems: [
                    {
                        variantId: foreignVariant.id,
                        batchId: testBatch.id,
                        quantity: 1,
                        pricePerUnit: 10,
                    },
                ],
            };

            await expect(createSalesOrder(payload)).rejects.toThrow();
        });
    });

    // ==========================================
    // 5. FOREIGN KEY & INTEGRITY BOUNDARIES
    // ==========================================
    describe("Foreign Key & Integrity Boundaries", () => {
        it("GET: fails when order ID does not exist", async () => {
            await expect(getSalesOrderById(99999999)).rejects.toThrow();
        });

        it("POST: rejects creation when customerId does not exist", async () => {
            const payload: CreateSalesOrderPayload = {
                customerId: 99999999,
                locationId: testLocation.id,
                salesOrderItems: [
                    {
                        variantId: unbatchedVariant.id,
                        batchId: null,
                        quantity: 1,
                        pricePerUnit: 10,
                    },
                ],
            };

            await expect(createSalesOrder(payload)).rejects.toThrow();
        });

        it("POST: rejects creation when locationId does not exist", async () => {
            const payload: CreateSalesOrderPayload = {
                customerId: testCustomer.id,
                locationId: 99999999,
                salesOrderItems: [
                    {
                        variantId: unbatchedVariant.id,
                        batchId: null,
                        quantity: 1,
                        pricePerUnit: 10,
                    },
                ],
            };

            await expect(createSalesOrder(payload)).rejects.toThrow();
        });

        it("POST: rejects creation when any line item variantId does not exist", async () => {
            const payload: CreateSalesOrderPayload = {
                customerId: testCustomer.id,
                locationId: testLocation.id,
                salesOrderItems: [
                    {
                        variantId: 99999999,
                        batchId: null,
                        quantity: 1,
                        pricePerUnit: 10,
                    },
                ],
            };

            await expect(createSalesOrder(payload)).rejects.toThrow();
        });
    });
});