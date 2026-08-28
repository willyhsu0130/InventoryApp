// src/services/salesOrderService.ts
import { supabase, unwrap } from "@/lib/supabase";
import type {
    SalesOrder,
    SalesOrderItem,
    CreateSalesOrderPayload,
    Database,
    SalesOrderStatus,
} from "@my-inventory-app/shared";
import { getProductById } from "./productService";
import { getVariantById } from "./variantService";
import { getBatchById } from "./batchService";

type SalesOrderRow = Database["public"]["Tables"]["sales_orders"]["Row"];
type SalesOrderItemRow = Database["public"]["Tables"]["sales_order_items"]["Row"];

function toSalesOrderItemDomain(row: SalesOrderItemRow): SalesOrderItem {
    return {
        id: row.id,
        salesOrderId: row.sales_order_id,
        variantId: row.variant_id,
        batchId: row.batch_id ?? null,
        quantity: Number(row.quantity),
        pricePerUnit: Number(row.price_per_unit),
        fulfilledQuantity: Number(row.fulfilled_quantity ?? 0),
        notes: row.notes ?? null,
    };
}

function toSalesOrderDomain(
    row: SalesOrderRow,
    items: SalesOrderItemRow[] = []
): SalesOrder {
    return {
        id: row.id,
        customerId: row.customer_id,
        locationId: row.location_id,
        shippingLocationId: row.shipping_location_id ?? null,
        salesOrderStatus: row.sales_order_status as SalesOrderStatus,
        expectedDeliveryDate: row.expected_delivery_date ?? null,
        notes: row.notes ?? null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        salesOrderItems: items.map(toSalesOrderItemDomain),
    };
}

/**
 * Creates a new Sales Order with its child line items in atomic sequence.
 * Enforces line constraints, batch quantities, inventory availability,
 * and committed stock allocation.
 */
export async function createSalesOrder(
    payload: CreateSalesOrderPayload
): Promise<SalesOrder> {
    if (!payload.salesOrderItems || payload.salesOrderItems.length === 0) {
        throw new Error("Sales order must contain at least one line item.");
    }

    const orderStatus: SalesOrderStatus = payload.salesOrderStatus ?? "PENDING";
    const batchDemandMap = new Map<number, number>();
    const variantDemandMap = new Map<number, number>();

    // 1. Line Item Validations & Demand Aggregation
    for (const item of payload.salesOrderItems) {
        if (item.quantity <= 0) {
            throw new Error("Item quantity must be greater than zero.");
        }
        if (item.pricePerUnit < 0) {
            throw new Error("Item price per unit cannot be negative.");
        }

        const variant = await getVariantById(item.variantId);
        const parentProduct = await getProductById(variant.productId);

        if (!parentProduct.batchTracked && item.batchId !== null && item.batchId !== undefined) {
            throw new Error("Cannot assign a batch to a non-batch-tracked variant.");
        }

        if (parentProduct.batchTracked && !item.batchId) {
            throw new Error(`Batch ID is required for batch-tracked variant "${variant.sku || variant.id}".`);
        }

        // Aggregate demand per variant
        const currentVariantDemand = variantDemandMap.get(item.variantId) ?? 0;
        variantDemandMap.set(item.variantId, currentVariantDemand + item.quantity);

        // Aggregate demand per batch
        if (item.batchId) {
            const batch = await getBatchById(item.batchId);
            if (batch.variantId !== item.variantId) {
                throw new Error("Assigned batch does not belong to the line variant.");
            }

            const currentBatchDemand = batchDemandMap.get(item.batchId) ?? 0;
            const totalBatchDemand = currentBatchDemand + item.quantity;

            if (totalBatchDemand > batch.quantity) {
                throw new Error(
                    ` "${batch.batchNumber}"的庫存量不足 需要: ${totalBatchDemand}, 庫存: ${batch.quantity}.`
                );
            }

            batchDemandMap.set(item.batchId, totalBatchDemand);
        }
    }

    // 2. Check Available Inventory Levels per Variant (Physical - Committed >= Demanded)
    for (const [variantId, demandedQty] of variantDemandMap.entries()) {
        const { data: level } = await supabase
            .from("inventory_levels")
            .select("quantity, committed_quantity")
            .eq("variant_id", variantId)
            .eq("location_id", payload.locationId)
            .maybeSingle();

        const currentQty = Number(level?.quantity ?? 0);
        const currentCommitted = Number(level?.committed_quantity ?? 0);
        const availableQty = currentQty - currentCommitted;

        if (demandedQty > availableQty) {
            throw new Error(
                `庫存不足 (Variant ID: ${variantId})。可用庫存: ${availableQty}, 需求數量: ${demandedQty}`
            );
        }
    }

    // 3. Insert Parent Sales Order
    const orderRow = await unwrap(
        supabase
            .from("sales_orders")
            .insert({
                customer_id: payload.customerId,
                location_id: payload.locationId,
                shipping_location_id: payload.shippingLocationId ?? null,
                sales_order_status: orderStatus,
                expected_delivery_date: payload.expectedDeliveryDate ?? null,
                notes: payload.notes ?? null,
            })
            .select()
            .single()
    );

    // 4. Insert Child Line Items
    const itemsToInsert = payload.salesOrderItems.map((item) => ({
        sales_order_id: orderRow.id,
        variant_id: item.variantId,
        batch_id: item.batchId ?? null,
        quantity: item.quantity,
        fulfilled_quantity: orderStatus === "COMPLETED" ? item.quantity : (item.fulfilledQuantity ?? 0),
        price_per_unit: item.pricePerUnit,
        notes: item.notes ?? null,
    }));

    const itemRows = await unwrap(
        supabase
            .from("sales_order_items")
            .insert(itemsToInsert)
            .select()
    );

    // 5. Update Inventory Levels & Movements Based on Initial Status
    for (const [variantId, demandedQty] of variantDemandMap.entries()) {
        const { data: level } = await supabase
            .from("inventory_levels")
            .select("quantity, committed_quantity")
            .eq("variant_id", variantId)
            .eq("location_id", payload.locationId)
            .single();

        const currentQty = Number(level?.quantity ?? 0);
        const currentCommitted = Number(level?.committed_quantity ?? 0);

        if (orderStatus === "PENDING") {
            await supabase
                .from("inventory_levels")
                .update({ committed_quantity: currentCommitted + demandedQty })
                .eq("variant_id", variantId)
                .eq("location_id", payload.locationId);
        } else if (orderStatus === "COMPLETED") {
            await supabase
                .from("inventory_levels")
                .update({ quantity: currentQty - demandedQty })
                .eq("variant_id", variantId)
                .eq("location_id", payload.locationId);

            const matchedItems = payload.salesOrderItems.filter((i) => i.variantId === variantId);
            for (const item of matchedItems) {
                await supabase.from("inventory_movements").insert({
                    variant_id: variantId,
                    location_id: payload.locationId,
                    batch_id: item.batchId ?? null,
                    quantity_adjusted: -item.quantity,
                    reference_type: "OUTBOUND_SALE",
                    reference_id: String(orderRow.id),
                });
            }
        }
    }

    return toSalesOrderDomain(orderRow, itemRows);
}

/**
 * Retrieves a single sales order by ID with all hydrated line items.
 */
export async function getSalesOrderById(id: number): Promise<SalesOrder> {
    if (!id || Number.isNaN(Number(id))) {
        throw new Error(`Invalid sales order ID provided: ${id}`);
    }

    const orderRow = await unwrap(
        supabase
            .from("sales_orders")
            .select("*")
            .eq("id", Number(id))
            .single()
    );

    const itemRows = await unwrap(
        supabase
            .from("sales_order_items")
            .select("*")
            .eq("sales_order_id", Number(id))
            .order("id", { ascending: true })
    );

    return toSalesOrderDomain(orderRow, itemRows);
}

/**
 * Retrieves all sales orders for a specific customer.
 */
export async function getSalesOrdersByCustomerId(
    customerId: number
): Promise<SalesOrder[]> {
    const orderRows = await unwrap(
        supabase
            .from("sales_orders")
            .select("*")
            .eq("customer_id", customerId)
            .order("id", { ascending: true })
    );

    if (orderRows.length === 0) return [];

    const orderIds = orderRows.map((o) => o.id);
    const itemRows = await unwrap(
        supabase
            .from("sales_order_items")
            .select("*")
            .in("sales_order_id", orderIds)
            .order("id", { ascending: true })
    );

    return orderRows.map((order) =>
        toSalesOrderDomain(
            order,
            itemRows.filter((i) => i.sales_order_id === order.id)
        )
    );
}

/**
 * Retrieves all sales orders filtered by status.
 */
export async function getSalesOrdersByStatus(
    status: SalesOrderStatus
): Promise<SalesOrder[]> {
    const orderRows = await unwrap(
        supabase
            .from("sales_orders")
            .select("*")
            .eq("sales_order_status", status)
            .order("id", { ascending: true })
    );

    if (orderRows.length === 0) return [];

    const orderIds = orderRows.map((o) => o.id);
    const itemRows = await unwrap(
        supabase
            .from("sales_order_items")
            .select("*")
            .in("sales_order_id", orderIds)
            .order("id", { ascending: true })
    );

    return orderRows.map((order) =>
        toSalesOrderDomain(
            order,
            itemRows.filter((i) => i.sales_order_id === order.id)
        )
    );
}

/**
 * Updates sales order status and manages physical inventory and committed stock transitions:
 * - PENDING -> COMPLETED: Deducts physical stock, releases committed stock, and logs OUTBOUND movements.
 * - PENDING -> CANCELLED: Releases committed stock without altering physical stock.
 */
export async function updateSalesOrderStatus(
    id: number,
    status: SalesOrderStatus
): Promise<SalesOrder> {
    const validStatuses: SalesOrderStatus[] = ["PENDING", "COMPLETED", "CANCELLED" as SalesOrderStatus];
    if (!validStatuses.includes(status)) {
        throw new Error(`Invalid sales order status: ${status}`);
    }

    const currentOrder = await getSalesOrderById(id);
    const previousStatus = currentOrder.salesOrderStatus;

    if (previousStatus === status) {
        return currentOrder;
    }

    // Handle inventory state transitions
    if (previousStatus === "PENDING" && status === "COMPLETED") {
        for (const item of currentOrder.salesOrderItems) {
            const { data: level } = await supabase
                .from("inventory_levels")
                .select("quantity, committed_quantity")
                .eq("variant_id", item.variantId)
                .eq("location_id", currentOrder.locationId)
                .single();

            const currentQty = Number(level?.quantity ?? 0);
            const currentCommitted = Number(level?.committed_quantity ?? 0);

            // Deduct physical stock and release committed stock
            await supabase
                .from("inventory_levels")
                .update({
                    quantity: Math.max(0, currentQty - item.quantity),
                    committed_quantity: Math.max(0, currentCommitted - item.quantity),
                })
                .eq("variant_id", item.variantId)
                .eq("location_id", currentOrder.locationId);

            // Create OUTBOUND inventory movement record
            await supabase.from("inventory_movements").insert({
                variant_id: item.variantId,
                location_id: currentOrder.locationId,
                batch_id: item.batchId ?? null,
                quantity_adjusted: -item.quantity,
                reference_type: "OUTBOUND_SALE",
                reference_id: String(currentOrder.id),
            });
        }
    } else if (previousStatus === "PENDING" && (status as string) === "CANCELLED") {
        // Release committed allocation only
        for (const item of currentOrder.salesOrderItems) {
            const { data: level } = await supabase
                .from("inventory_levels")
                .select("committed_quantity")
                .eq("variant_id", item.variantId)
                .eq("location_id", currentOrder.locationId)
                .single();

            const currentCommitted = Number(level?.committed_quantity ?? 0);

            await supabase
                .from("inventory_levels")
                .update({
                    committed_quantity: Math.max(0, currentCommitted - item.quantity),
                })
                .eq("variant_id", item.variantId)
                .eq("location_id", currentOrder.locationId);
        }
    }

    const orderRow = await unwrap(
        supabase
            .from("sales_orders")
            .update({
                sales_order_status: status,
                updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .select()
            .single()
    );

    const itemRows = await unwrap(
        supabase
            .from("sales_order_items")
            .select("*")
            .eq("sales_order_id", id)
            .order("id", { ascending: true })
    );

    return toSalesOrderDomain(orderRow, itemRows);
}