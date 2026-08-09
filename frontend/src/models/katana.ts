export interface KatanaProductConfig {
    id?: number;
    name: string;      // e.g., "Size", "Color", "切法"
    values: string[];  // e.g., ["S", "M", "L"] or ["三去", "蝶切"]
}

export interface KatanaVariantConfigAttribute {
    config_name: string;  // e.g., "切法"
    config_value: string; // e.g., "三去"
}

export interface KatanaSupplierItemCode {
    supplier_id?: number;
    supplier_item_code: string;
}


// ==========================================
// 2. PRODUCT INPUT, UPDATE PAYLOAD & MODEL
// ==========================================

/**
 * Base writable fields for Product operations.
 * Used as the foundation for creating and updating products.
 */
export interface KatanaProductInput {
    name: string;
    uom: string; // Base Unit of Measure (e.g., "pcs", "kg", max 7 chars)
    category_name?: string | null;
    default_supplier_id?: number | null;
    additional_info?: string | null;

    // Purchasing & Unit Conversions
    purchase_uom?: string | null; // Max 7 chars
    purchase_uom_conversion_rate?: number | null;

    // Operational & Manufacturing Flags
    is_sellable?: boolean;
    is_purchasable?: boolean;
    is_producible?: boolean;
    is_auto_assembly?: boolean;
    is_archived?: boolean;

    // Tracking & Sequence Flags
    batch_tracked?: boolean;
    serial_tracked?: boolean;
    operations_in_sequence?: boolean;

    // Configurations & Custom Fields
    configs?: KatanaProductConfig[];
    custom_field_collection_id?: number | null;
}

export const convertProductToPayload = (product: KatanaProduct): KatanaUpdateProductPayload => {
    const {
        name,
        uom,
        category_name,
        default_supplier_id,
        additional_info,
        purchase_uom,
        purchase_uom_conversion_rate,
        is_sellable,
        is_purchasable,
        is_producible,
        is_auto_assembly,
        batch_tracked,
        serial_tracked,
        operations_in_sequence,
        configs,
    } = product;

    // 1. Enforce minLength >= 1 for optional strings (prevent "" triggering 422 minLength)
    const cleanAdditionalInfo = additional_info && additional_info.trim().length > 0
        ? additional_info
        : undefined;

    const cleanCategoryName = category_name && category_name.trim().length > 0
        ? category_name
        : undefined;

    const cleanPurchaseUom = purchase_uom && purchase_uom.trim().length > 0
        ? purchase_uom
        : undefined;

    // 2. Enforce minItems >= 1 for configs array (prevent [] triggering 422 minItems)
    const cleanConfigs = configs && configs.length > 0
        ? configs.map((cfg) => ({
            ...(cfg.id ? { id: cfg.id } : {}),
            name: cfg.name,
            values: cfg.values,
        }))
        : undefined;

    return {
        name,
        uom,
        is_sellable,
        is_purchasable,
        is_producible,
        is_auto_assembly,
        batch_tracked,
        serial_tracked,
        operations_in_sequence,
        default_supplier_id,
        purchase_uom_conversion_rate,
        ...(cleanCategoryName !== undefined && { category_name: cleanCategoryName }),
        ...(cleanAdditionalInfo !== undefined && { additional_info: cleanAdditionalInfo }),
        ...(cleanPurchaseUom !== undefined && { purchase_uom: cleanPurchaseUom }),
        ...(cleanConfigs !== undefined && { configs: cleanConfigs }),
    };
};



/**
 * Payload type for PATCH /products/{id}.
 * Automatically extracts all optional writable fields from KatanaProductInput.
 */
export type KatanaUpdateProductPayload = Partial<KatanaProductInput>;

/**
 * Full Product object returned by GET /products and local cache Map.
 * Extends KatanaProductInput with read-only server metadata and variants.
 */
export interface KatanaProduct extends KatanaProductInput {
    id: number;
    type: "product" | "material";

    // Timestamps & Soft Deletes
    created_at: string;
    updated_at: string;
    archived_at?: string | null;
    deleted_at?: string | null;

    // Mandatory Arrays in API response
    configs: KatanaProductConfig[];
    variants: KatanaVariant[];
}

export interface KatanaCustomField {
    field_name: string;
    field_value: string;
}

export interface KatanaVariantInput {
    sku?: string | null;
    sales_price?: number | null;
    purchase_price?: number | null;
    product_id?: number;
    material_id?: number | null;
    internal_barcode?: string | null;
    registered_barcode?: string | null;
    supplier_item_codes?: string[] | null;
    lead_time?: number | null;
    minimum_order_quantity?: number | null;
    config_attributes?: KatanaVariantConfigAttribute[];
    custom_fields?: KatanaCustomField[];
}
export type KatanaUpdateVariantPayload = Partial<KatanaVariantInput>;

/**
 * Full Variant object returned by GET /variants and embedded in KatanaProduct.
 * Extends KatanaVariantInput with read-only server metadata.
 */
export interface KatanaVariant extends KatanaVariantInput {
    id: number;
    product_id: number;
    type: "product" | "material";
    config_attributes: KatanaVariantConfigAttribute[];
    created_at: string;
    updated_at: string;
    abc_classification?: "A" | "B" | "C" | null;
}
export const convertVariantToPayload = (variant: KatanaVariant): KatanaUpdateVariantPayload => {
    const {
        sku,
        sales_price,
        purchase_price,
        internal_barcode,
        registered_barcode,
        supplier_item_codes,
        lead_time,
        minimum_order_quantity,
        config_attributes,
        custom_fields,
    } = variant;

    const cleanSku = sku && sku.trim().length > 0 ? sku : undefined;

    const cleanInternalBarcode =
        internal_barcode && internal_barcode.trim().length >= 3
            ? internal_barcode
            : undefined;

    const cleanRegisteredBarcode =
        registered_barcode && registered_barcode.trim().length > 0
            ? registered_barcode
            : undefined;

    const cleanSupplierItemCodes =
        supplier_item_codes && supplier_item_codes.length > 0
            ? supplier_item_codes.filter((code) => code.trim().length > 0)
            : undefined;

    // 🔑 Map variant attributes using `config_name` and `config_value`
    const cleanConfigAttributes =
        config_attributes && config_attributes.length > 0
            ? config_attributes.map((attr) => ({
                config_name: attr.config_name,
                config_value: attr.config_value,
            }))
            : undefined;

    const cleanCustomFields =
        custom_fields && custom_fields.length > 0
            ? custom_fields.map((field) => ({
                field_name: field.field_name,
                field_value: field.field_value,
            }))
            : undefined;

    return {
        ...(sales_price !== undefined && sales_price !== null && { sales_price }),
        ...(purchase_price !== undefined && purchase_price !== null && { purchase_price }),
        ...(lead_time !== undefined && lead_time !== null && { lead_time }),
        ...(minimum_order_quantity !== undefined && minimum_order_quantity !== null && { minimum_order_quantity }),
        ...(cleanSku !== undefined && { sku: cleanSku }),
        ...(cleanInternalBarcode !== undefined && { internal_barcode: cleanInternalBarcode }),
        ...(cleanRegisteredBarcode !== undefined && { registered_barcode: cleanRegisteredBarcode }),
        ...(cleanSupplierItemCodes && cleanSupplierItemCodes.length > 0 && { supplier_item_codes: cleanSupplierItemCodes }),
        ...(cleanConfigAttributes && cleanConfigAttributes.length > 0 && { config_attributes: cleanConfigAttributes }),
        ...(cleanCustomFields && cleanCustomFields.length > 0 && { custom_fields: cleanCustomFields }),
    };
};

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
// 3. KATANA LOCATIONS
// Ref: https://developer.katanamrp.com/reference/the-purchase-order-object
// ==========================================

export interface KatanaAddress {
    id: number;
    line_1: string;
    line_2?: string | null;
    city: string;
    state: string;
    zip: string;
    country: string;
}

export interface KatanaLocation {
    id: number;
    name: string;
    legal_name?: string | null;
    address_id: number;
    address?: KatanaAddress;
    is_primary: boolean;
    sales_allowed: boolean;
    manufacturing_allowed: boolean;
    purchase_allowed: boolean;
    created_at: string;
    updated_at: string;
    deleted_at?: string | null;
}

export interface KatanaInventoryItem {
    variant_id: number;
    location_id: number;
    reorder_point: string;             // Decimal string (e.g. "5.00000")
    average_cost: string;              // Decimal string (e.g. "10.0000000000")
    value_in_stock: string;            // Decimal string (e.g. "70.0000000000")
    quantity_in_stock: string;         // Decimal string
    quantity_committed: string;        // Decimal string
    quantity_expected: string;         // Decimal string
    quantity_missing_or_excess: string;// Decimal string
    quantity_potential: string;        // Decimal string

    // Included when using query parameter: extend=["variant"]
    variant?: KatanaVariant;

    // Included when using query parameter: extend=["location"]
    location?: KatanaLocation;
}

// ==========================================
// 4. KATANA STOCK ADJUSTMENTS
// Ref: https://developer.katanamrp.com/reference/the-stock-adjustment-object
// ==========================================

export interface KatanaTraceabilityEntry {
    batch_id?: number | null;
    serial_number_id?: number | null;
    bin_location_id?: number | null;
    /** Decimal string quantity required by Katana API (e.g., "50" or "1.5") */
    quantity: string;
}

/** @deprecated Use KatanaTraceabilityEntry instead */
export interface KatanaBatchTransaction {
    batch_id: number | null;
    quantity: number;
}

export interface KatanaStockAdjustmentRowInput {
    variant_id: number;
    quantity: number;
    cost_per_unit?: number | null;
    traceability?: KatanaTraceabilityEntry[];
    /** @deprecated Use traceability */
    batch_transactions?: KatanaBatchTransaction[];
}

export interface KatanaStockAdjustmentInput {
    location_id: number;
    stock_adjustment_number?: string | null;
    stock_adjustment_date?: string | null;
    reason?: string | null;
    additional_info?: string | null;
    stock_adjustment_rows: KatanaStockAdjustmentRowInput[];
}

/**
 * Payload type for POST /stock_adjustments.
 */
export interface CreateStockAdjustmentPayload {
    location_id: number;
    stock_adjustment_number?: string;
    stock_adjustment_date?: string;
    reason?: string;
    additional_info?: string;
    stock_adjustment_rows: CreateStockAdjustmentRowPayload[];
}

export interface CreateStockAdjustmentRowPayload {
    variant_id: number;
    quantity: number;
    cost_per_unit?: number;
    traceability?: KatanaTraceabilityEntry[];
    /** @deprecated Use traceability */
    batch_transactions?: KatanaBatchTransaction[];
}

/**
 * Payload type for PATCH /stock_adjustments/{id}.
 * Only top-level fields can be updated per Katana OpenAPI definition.
 */
export type KatanaUpdateStockAdjustmentPayload = Partial<
    Omit<CreateStockAdjustmentPayload, "stock_adjustment_rows">
>;

export interface KatanaStockAdjustmentRow extends KatanaStockAdjustmentRowInput {
    id: number;
}

/**
 * Full Stock Adjustment object returned by GET/POST/PATCH /stock_adjustments.
 * Extends KatanaStockAdjustmentInput with server metadata and row identifiers.
 */
export interface KatanaStockAdjustment extends KatanaStockAdjustmentInput {
    id: number;
    stock_adjustment_number: string;
    stock_adjustment_date: string;
    stock_adjustment_rows: KatanaStockAdjustmentRow[];
    created_at: string;
    updated_at: string;
    deleted_at?: string | null;
}

// ==========================================
// CONVERTERS & PAYLOAD HELPERS
// ==========================================

export const convertStockAdjustmentToCreatePayload = (
    adjustment: KatanaStockAdjustmentInput
): CreateStockAdjustmentPayload => {
    const {
        location_id,
        stock_adjustment_number,
        stock_adjustment_date,
        reason,
        additional_info,
        stock_adjustment_rows,
    } = adjustment;

    // 1. Enforce minLength >= 1 for optional strings (prevent "" triggering 422 minLength)
    const cleanAdjustmentNumber =
        stock_adjustment_number && stock_adjustment_number.trim().length > 0
            ? stock_adjustment_number
            : undefined;

    const cleanAdjustmentDate =
        stock_adjustment_date && stock_adjustment_date.trim().length > 0
            ? stock_adjustment_date
            : undefined;

    const cleanReason =
        reason && reason.trim().length > 0 ? reason : undefined;

    const cleanAdditionalInfo =
        additional_info && additional_info.trim().length > 0
            ? additional_info
            : undefined;

    // 2. Map and clean row items
    const cleanRows: CreateStockAdjustmentRowPayload[] = stock_adjustment_rows.map(
        (row) => {
            const cleanTraceability =
                row.traceability && row.traceability.length > 0
                    ? row.traceability.map((t) => ({
                        ...(t.batch_id !== undefined && { batch_id: t.batch_id }),
                        ...(t.serial_number_id !== undefined && {
                            serial_number_id: t.serial_number_id,
                        }),
                        ...(t.bin_location_id !== undefined && {
                            bin_location_id: t.bin_location_id,
                        }),
                        quantity: String(t.quantity),
                    }))
                    : undefined;

            const cleanBatchTransactions =
                row.batch_transactions && row.batch_transactions.length > 0
                    ? row.batch_transactions
                    : undefined;

            return {
                variant_id: row.variant_id,
                quantity: row.quantity,
                ...(row.cost_per_unit !== undefined &&
                    row.cost_per_unit !== null && { cost_per_unit: row.cost_per_unit }),
                ...(cleanTraceability && { traceability: cleanTraceability }),
                ...(cleanBatchTransactions && {
                    batch_transactions: cleanBatchTransactions,
                }),
            };
        }
    );

    return {
        location_id,
        stock_adjustment_rows: cleanRows,
        ...(cleanAdjustmentNumber !== undefined && {
            stock_adjustment_number: cleanAdjustmentNumber,
        }),
        ...(cleanAdjustmentDate !== undefined && {
            stock_adjustment_date: cleanAdjustmentDate,
        }),
        ...(cleanReason !== undefined && { reason: cleanReason }),
        ...(cleanAdditionalInfo !== undefined && {
            additional_info: cleanAdditionalInfo,
        }),
    };
};

export const convertStockAdjustmentToUpdatePayload = (
    adjustment: Partial<KatanaStockAdjustment>
): KatanaUpdateStockAdjustmentPayload => {
    const {
        location_id,
        stock_adjustment_number,
        stock_adjustment_date,
        reason,
        additional_info,
    } = adjustment;

    const cleanAdjustmentNumber =
        stock_adjustment_number && stock_adjustment_number.trim().length > 0
            ? stock_adjustment_number
            : undefined;

    const cleanAdjustmentDate =
        stock_adjustment_date && stock_adjustment_date.trim().length > 0
            ? stock_adjustment_date
            : undefined;

    const cleanReason =
        reason && reason.trim().length > 0 ? reason : undefined;

    const cleanAdditionalInfo =
        additional_info && additional_info.trim().length > 0
            ? additional_info
            : undefined;

    return {
        ...(location_id !== undefined && { location_id }),
        ...(cleanAdjustmentNumber !== undefined && {
            stock_adjustment_number: cleanAdjustmentNumber,
        }),
        ...(cleanAdjustmentDate !== undefined && {
            stock_adjustment_date: cleanAdjustmentDate,
        }),
        ...(cleanReason !== undefined && { reason: cleanReason }),
        ...(cleanAdditionalInfo !== undefined && {
            additional_info: cleanAdditionalInfo,
        }),
    };
};

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

export interface EnrichedSalesOrderRow extends KatanaSalesOrderRow, ResolvedVariantInfo { }

export interface EnrichedSalesOrder extends Omit<KatanaSalesOrder, "sales_order_rows"> {
    sales_order_rows: EnrichedSalesOrderRow[];
}