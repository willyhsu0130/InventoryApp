// ==========================================
// 3. SALES ORDER MODELS
// ==========================================

import type { KatanaBatchTransaction, KatanaTraceabilityEntry } from "./inventory";
import type { ResolvedVariantInfo } from "./productVariant";

export type KatanaSalesOrderStatus =
    | "NOT_SHIPPED"
    | "PARTIALLY_PACKED"
    | "PARTIALLY_DELIVERED"
    | "PACKED"
    | "DELIVERED"
    | "PENDING"
    | "CANCELLED";

export type KatanaProductAvailability =
    | "IN_STOCK"
    | "EXPECTED"
    | "PICKED"
    | "NOT_AVAILABLE"
    | "NOT_APPLICABLE";

export type KatanaIngredientAvailability =
    | "PROCESSED"
    | "IN_STOCK"
    | "NOT_AVAILABLE"
    | "EXPECTED"
    | "NO_RECIPE"
    | "NOT_APPLICABLE";

export type KatanaProductionStatus =
    | "NOT_STARTED"
    | "NONE"
    | "NOT_APPLICABLE"
    | "IN_PROGRESS"
    | "BLOCKED"
    | "DONE";

export interface KatanaSalesOrderRowAttribute {
    key: string;
    value: string;
}

export interface KatanaSalesOrderRow {
    id: number;
    sales_order_id: number;
    variant_id: number;
    quantity: number;
    price_per_unit: string; // Decimal string
    price_per_unit_in_base_currency?: number;
    tax_rate_id: number | null;
    tax_rate?: number;
    location_id?: number | null;
    total?: number;
    total_in_base_currency?: number;
    cogs_value?: number | null;
    product_availability?: KatanaProductAvailability;
    product_expected_date?: string | null;
    linked_manufacturing_order_id?: number | null;
    conversion_rate?: number;
    conversion_date?: string | null;
    attributes?: KatanaSalesOrderRowAttribute[];
    traceability?: KatanaTraceabilityEntry[];
    /** @deprecated Use traceability */
    batch_transactions?: KatanaBatchTransaction[];
    created_at: string;
    updated_at: string;
    deleted_at?: string | null;
}

export interface KatanaSalesOrderAddress {
    id: number;
    sales_order_id: number;
    entity_type: "billing" | "shipping";
    first_name?: string;
    last_name?: string;
    company?: string;
    phone?: string;
    line_1: string;
    line_2?: string | null;
    city: string;
    state: string;
    zip: string;
    country: string;
    created_at: string;
    updated_at: string;
}

export interface KatanaSalesOrderShippingFee {
    id: number;
    sales_order_id: number;
    description?: string;
    amount: string;
    tax_rate_id: number | null;
}

export interface KatanaSalesOrder {
    id: number;
    order_no: string;
    customer_id: number;
    source?: string;
    status: KatanaSalesOrderStatus;
    location_id: number;
    order_created_date?: string;
    delivery_date: string | null;
    picked_date?: string | null;
    invoicing_status?: string;
    customer_ref?: string | null;
    currency: string;
    conversion_rate?: number | null;
    conversion_date?: string | null;
    total: number;
    total_in_base_currency?: number;
    product_availability?: KatanaProductAvailability;
    product_expected_date?: string | null;
    ingredient_availability?: KatanaIngredientAvailability;
    ingredient_expected_date?: string | null;
    production_status?: KatanaProductionStatus;
    additional_info?: string;
    ecommerce_order_type?: string | null;
    ecommerce_store_name?: string | null;
    ecommerce_order_id?: string | null;
    billing_address_id?: number | null;
    shipping_address_id?: number | null;
    addresses?: KatanaSalesOrderAddress[];
    shipping_fee?: KatanaSalesOrderShippingFee | null;
    sales_order_rows: KatanaSalesOrderRow[];
    created_at: string;
    updated_at: string;
    deleted_at?: string | null;
}

export interface CreateSalesOrderRowPayload {
    variant_id: number;
    quantity: number;
    price_per_unit?: number;
    tax_rate_id?: number;
    location_id?: number;
    total_discount?: number;
    attributes?: KatanaSalesOrderRowAttribute[];
}

export interface CreateSalesOrderAddressPayload {
    entity_type: "billing" | "shipping";
    first_name?: string;
    last_name?: string;
    company?: string;
    phone?: string;
    line_1?: string;
    line_2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
}

export interface CreateSalesOrderPayload {
    customer_id: number;
    sales_order_rows: CreateSalesOrderRowPayload[];
    order_no?: string;
    order_created_date?: string;
    delivery_date?: string;
    currency?: string;
    location_id?: number;
    status?: "NOT_SHIPPED" | "PENDING";
    additional_info?: string;
    customer_ref?: string;
    ecommerce_order_type?: string;
    ecommerce_store_name?: string;
    ecommerce_order_id?: string;
    tracking_number?: string;
    tracking_number_url?: string;
    addresses?: CreateSalesOrderAddressPayload[];
    custom_fields?: Record<string, object>;
}

export interface KatanaSalesOrderDraft {
    customer_id: number | null;
    order_no?: string;
    location_id?: number | null;
    delivery_date?: string | null;
    order_created_date?: string | null;
    additional_info?: string | null;
    customer_ref?: string | null;
    currency?: string;
    status?: "NOT_SHIPPED" | "PENDING";
    sales_order_rows: Array<{
        variant_id: number;
        quantity: number;
        price_per_unit?: number | string;
        tax_rate_id?: number | null;
        location_id?: number | null;
    }>;
}

export interface UpdateSalesOrderPayload {
    order_no?: string;
    customer_id?: number;
    location_id?: number;
    delivery_date?: string | null;
    order_created_date?: string;
    currency?: string;
    status?: KatanaSalesOrderStatus;
    additional_info?: string;
    customer_ref?: string;
    tracking_number?: string | null;
    tracking_number_url?: string | null;
    custom_fields?: Record<string, object>;
}

export interface EnrichedSalesOrderRow
    extends KatanaSalesOrderRow,
    ResolvedVariantInfo { }

export interface EnrichedSalesOrder
    extends Omit<KatanaSalesOrder, "sales_order_rows"> {
    sales_order_rows: EnrichedSalesOrderRow[];
}

export const convertSalesOrderToCreatePayload = (
    draft: KatanaSalesOrderDraft
): CreateSalesOrderPayload => {
    if (!draft.customer_id) {
        throw new Error("Customer ID is required to create a sales order.");
    }

    if (!draft.sales_order_rows || draft.sales_order_rows.length === 0) {
        throw new Error("At least one item row is required.");
    }

    const cleanOrderNo = draft.order_no?.trim() || undefined;
    const cleanAdditionalInfo = draft.additional_info?.trim() || undefined;
    const cleanCustomerRef = draft.customer_ref?.trim() || undefined;
    const cleanDeliveryDate = draft.delivery_date?.trim() || undefined;
    const cleanOrderCreatedDate = draft.order_created_date?.trim() || undefined;
    const cleanCurrency = draft.currency?.trim() || undefined;

    const cleanRows: CreateSalesOrderRowPayload[] = draft.sales_order_rows.map(
        (row) => {
            const parsedPrice =
                typeof row.price_per_unit === "string"
                    ? parseFloat(row.price_per_unit)
                    : row.price_per_unit;

            return {
                variant_id: row.variant_id,
                quantity: row.quantity,
                ...(parsedPrice != null &&
                    !Number.isNaN(parsedPrice) && { price_per_unit: parsedPrice }),
                ...(row.tax_rate_id != null && { tax_rate_id: row.tax_rate_id }),
                ...(row.location_id != null && { location_id: row.location_id }),
            };
        }
    );

    return {
        customer_id: draft.customer_id,
        sales_order_rows: cleanRows,
        ...(cleanOrderNo && { order_no: cleanOrderNo }),
        ...(cleanAdditionalInfo && { additional_info: cleanAdditionalInfo }),
        ...(cleanCustomerRef && { customer_ref: cleanCustomerRef }),
        ...(cleanDeliveryDate && { delivery_date: cleanDeliveryDate }),
        ...(cleanOrderCreatedDate && {
            order_created_date: cleanOrderCreatedDate,
        }),
        ...(cleanCurrency && { currency: cleanCurrency }),
        ...(draft.location_id != null && { location_id: draft.location_id }),
        ...(draft.status && { status: draft.status }),
    };
};

export const convertSalesOrderToUpdatePayload = (
    draft: Partial<KatanaSalesOrderDraft>
): UpdateSalesOrderPayload => {
    const cleanOrderNo = draft.order_no?.trim() || undefined;
    const cleanAdditionalInfo = draft.additional_info?.trim() || undefined;
    const cleanCustomerRef = draft.customer_ref?.trim() || undefined;
    const cleanDeliveryDate = draft.delivery_date?.trim() || undefined;
    const cleanCurrency = draft.currency?.trim() || undefined;

    return {
        ...(draft.customer_id != null && { customer_id: draft.customer_id }),
        ...(draft.location_id != null && { location_id: draft.location_id }),
        ...(cleanOrderNo !== undefined && { order_no: cleanOrderNo }),
        ...(cleanAdditionalInfo !== undefined && {
            additional_info: cleanAdditionalInfo,
        }),
        ...(cleanCustomerRef !== undefined && { customer_ref: cleanCustomerRef }),
        ...(cleanDeliveryDate !== undefined && {
            delivery_date: cleanDeliveryDate,
        }),
        ...(cleanCurrency !== undefined && { currency: cleanCurrency }),
        ...(draft.status && { status: draft.status }),
    };
};
