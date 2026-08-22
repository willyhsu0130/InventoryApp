import { supabase, unwrap } from "@/lib/supabase";
import type {
    SalesOrder,
    SalesOrderItem,
    CreateSalesOrderPayload,
    Database,
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
        salesOrderStatus: row.sales_order_status as "PENDING" | "COMPLETED",
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        salesOrderItems: items.map(toSalesOrderItemDomain),
    };
}

/**
 * Creates a new Sales Order with its child line items in atomic sequence.
 * Enforces non-empty line items, positive quantities/prices, and batch-variant consistency.
 */
export async function createSalesOrder(
    payload: CreateSalesOrderPayload
): Promise<SalesOrder> {
    if (!payload.salesOrderItems || payload.salesOrderItems.length === 0) {
        throw new Error("Sales order must contain at least one line item.");
    }

    // 1. Line Item Validations
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

        if (item.batchId) {
            const batch = await getBatchById(item.batchId);
            if (batch.variantId !== item.variantId) {
                throw new Error("Assigned batch does not belong to the line variant.");
            }
        }
    }

    // 2. Insert Parent Sales Order
    const orderRow = await unwrap(
        supabase
            .from("sales_orders")
            .insert({
                customer_id: payload.customerId,
                location_id: payload.locationId,
                sales_order_status: payload.salesOrderStatus ?? "PENDING",
            })
            .select()
            .single()
    );

    // 3. Insert Child Line Items
    const itemsToInsert = payload.salesOrderItems.map((item) => ({
        sales_order_id: orderRow.id,
        variant_id: item.variantId,
        batch_id: item.batchId ?? null,
        quantity: item.quantity,
        price_per_unit: item.pricePerUnit,
    }));

    const itemRows = await unwrap(
        supabase
            .from("sales_order_items")
            .insert(itemsToInsert)
            .select()
    );

    return toSalesOrderDomain(orderRow, itemRows);
}

/**
 * Retrieves a single sales order by ID with all hydrated line items.
 */
export async function getSalesOrderById(id: number): Promise<SalesOrder> {
    const orderRow = await unwrap(
        supabase
            .from("sales_orders")
            .select("*")
            .eq("id", id)
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
    status: "PENDING" | "COMPLETED"
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
 * Updates the sales order status and sets updated_at timestamp.
 */
export async function updateSalesOrderStatus(
    id: number,
    status: "PENDING" | "COMPLETED"
): Promise<SalesOrder> {
    if (status !== "PENDING" && status !== "COMPLETED") {
        throw new Error(`Invalid sales order status: ${status}`);
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