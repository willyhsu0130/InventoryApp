// ==========================================
// 1. KATANA PRODUCT & VARIANT OBJECTS
// Ref: https://developer.katanamrp.com/reference/the-product-object
// ==========================================

export interface KatanaProduct {
    id: number;
    name: string;
    code?: string | null;
    category_id?: number | null;
    default_supplier_id?: number | null;
    uom: string; // Unit of Measure (e.g. "kg", "pcs")
    type: "product" | "material";
    is_sellable: boolean;
    is_purchasable: boolean;
    is_makeable: boolean;
    batch_tracking: boolean;
    serial_number_tracking: boolean;
    created_at: string;
    updated_at: string;
    deleted_at?: string | null;
    variants: KatanaVariant[];
}

export interface KatanaConfigAttribute {
    config_name: string;
    config_value: string;
}

export interface KatanaVariant {
    id: number;
    product_id: number;
    sku: string | null;
    sales_price: number | null;
    purchase_price: number | null;
    internal_barcode: string | null;
    registered_barcode: string | null;
    config_attributes: KatanaConfigAttribute[];
    type: "product" | "material";
    created_at: string;
    updated_at: string;
}

// ==========================================
// 2. KATANA SALES ORDER OBJECTS
// Ref: https://developer.katanamrp.com/reference/the-sales-order-object
// ==========================================

export type KatanaSalesOrderStatus = 
    | "NOT_SHIPPED" 
    | "PARTIALLY_SHIPPED" 
    | "DELIVERED" 
    | "CANCELLED";

export type KatanaSalesOrderRowDeliveryStatus = 
    | "NOT_SHIPPED" 
    | "SHIPPED";

export interface KatanaSalesOrderRow {
    id: number;
    sales_order_id: number;
    variant_id: number;
    quantity: number;
    price_per_unit: number;
    price_per_unit_currency?: number;
    tax_rate_id: number | null;
    delivery_status: KatanaSalesOrderRowDeliveryStatus;
    created_at: string;
    updated_at: string;
}

export interface KatanaSalesOrder {
    id: number;
    order_no: string;
    customer_id: number;
    status: KatanaSalesOrderStatus;
    location_id: number;
    delivery_date: string | null;
    created_at: string;
    updated_at: string;
    currency: string;
    conversion_rate: number;
    total_price: number;
    total_price_in_currency: number;
    tax_rate_id: number | null;
    sales_order_rows: KatanaSalesOrderRow[];
}

// ==========================================
// 3. KATANA PURCHASE ORDER OBJECTS
// Ref: https://developer.katanamrp.com/reference/the-purchase-order-object
// ==========================================

export type KatanaPurchaseOrderStatus = 
    | "NOT_RECEIVED" 
    | "PARTIALLY_RECEIVED" 
    | "RECEIVED" 
    | "CANCELLED";

export interface KatanaPurchaseOrderRow {
    id: number;
    purchase_order_id: number;
    variant_id: number;
    quantity: number;
    price_per_unit: number;
    received_quantity: number;
    created_at: string;
    updated_at: string;
}

export interface KatanaPurchaseOrder {
    id: number;
    order_no: string;
    supplier_id: number;
    status: KatanaPurchaseOrderStatus;
    location_id: number;
    expected_arrival_date: string | null;
    created_at: string;
    updated_at: string;
    currency: string;
    purchase_order_rows: KatanaPurchaseOrderRow[];
}

// ==========================================
// 4. FRONTEND RESOLVED / VIEW MODELS
// ==========================================

export interface ResolvedVariantInfo {
    product_name: string;
    variant_details: string | null;
    sku: string;
    uom: string;
    category_id: number | null;
}

export interface EnrichedSalesOrderRow extends KatanaSalesOrderRow, ResolvedVariantInfo {}

export interface EnrichedSalesOrder extends Omit<KatanaSalesOrder, "sales_order_rows"> {
    sales_order_rows: EnrichedSalesOrderRow[];
}