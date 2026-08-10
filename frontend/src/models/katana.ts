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

export const convertProductToPayload = (product: KatanaProductDraft): KatanaUpdateProductPayload => {
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
export const convertVariantToPayload = (variant: KatanaVariantInput): KatanaUpdateVariantPayload => {
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
// PRODUCT DRAFTS (shared by the create + edit form)
// ==========================================

/** Sentinel id for a product that exists only in the form, not yet in Katana. */
export const UNSAVED_PRODUCT_ID = -1;

export const isUnsavedProduct = (id: number): boolean => id === UNSAVED_PRODUCT_ID;

/**
 * A variant row in the product form. Unsaved rows have no `id` yet — Katana
 * assigns one when the parent product is POSTed.
 */
export interface KatanaProductDraftVariant extends KatanaVariantInput {
    id?: number;
    config_attributes: KatanaVariantConfigAttribute[];
}

/**
 * Form state for the product editor. A saved `KatanaProduct` is assignable to
 * this, so one component can edit both saved and unsaved products. Unsaved
 * drafts carry `id === UNSAVED_PRODUCT_ID` and lack the server-only metadata
 * (`type`, `created_at`, `updated_at`) that `KatanaProduct` requires.
 */
export interface KatanaProductDraft extends KatanaProductInput {
    id: number;
    configs: KatanaProductConfig[];
    variants: KatanaProductDraftVariant[];
}

export const createEmptyProductDraft = (): KatanaProductDraft => ({
    id: UNSAVED_PRODUCT_ID,
    name: "",
    uom: "pcs",
    category_name: null,
    default_supplier_id: null,
    additional_info: null,
    purchase_uom: null,
    purchase_uom_conversion_rate: null,
    is_sellable: true,
    is_purchasable: true,
    is_producible: false,
    is_auto_assembly: false,
    batch_tracked: false,
    serial_tracked: false,
    operations_in_sequence: false,
    configs: [],
    // POST /products requires minItems: 1, so a config-less product still ships one row.
    variants: [{ config_attributes: [] }],
});

/**
 * Every combination of the given config options, in config order.
 * Returns [] when there is nothing usable to combine.
 */
export const buildConfigCombinations = (
    configs: KatanaProductConfig[]
): KatanaVariantConfigAttribute[][] => {
    const usable = configs.filter(
        (config) => config.name.trim().length > 0 && config.values.length > 0
    );

    if (usable.length === 0) return [];

    return usable.reduce<KatanaVariantConfigAttribute[][]>(
        (combinations, config) =>
            combinations.flatMap((combination) =>
                config.values.map((value) => [
                    ...combination,
                    { config_name: config.name, config_value: value },
                ])
            ),
        [[]]
    );
};

const configAttributesKey = (attributes: KatanaVariantConfigAttribute[]): string =>
    attributes.map((attr) => `${attr.config_name}=${attr.config_value}`).join("|");

/**
 * Rebuild a draft's variant rows for a new set of configs, carrying over the
 * SKU/prices already typed for any combination that still exists.
 */
export const syncDraftVariantsToConfigs = (
    configs: KatanaProductConfig[],
    existing: KatanaProductDraftVariant[]
): KatanaProductDraftVariant[] => {
    const combinations = buildConfigCombinations(configs);

    // No usable configs — collapse back to the single unconfigured row.
    if (combinations.length === 0) {
        return [{ ...existing[0], config_attributes: [] }];
    }

    const previousByKey = new Map(
        existing.map((variant) => [configAttributesKey(variant.config_attributes), variant])
    );

    return combinations.map((config_attributes) => ({
        ...previousByKey.get(configAttributesKey(config_attributes)),
        config_attributes,
    }));
};

// ==========================================
// PRODUCT CREATE PAYLOAD
// Ref: https://developer.katanamrp.com/reference/create-product
// ==========================================

/**
 * Variant fields accepted by POST /products. Deliberately narrower than
 * KatanaUpdateVariantPayload: on create, `lead_time` and
 * `minimum_order_quantity` are product-level, and product_id/material_id are
 * implied by the parent product.
 */
export interface KatanaCreateVariantPayload {
    sku?: string;
    sales_price?: number;
    purchase_price?: number;
    internal_barcode?: string;
    registered_barcode?: string;
    supplier_item_codes?: string[];
    config_attributes?: KatanaVariantConfigAttribute[];
    custom_fields?: KatanaCustomField[];
}

/** Body for POST /products. Only `name` and `variants` are required. */
export interface KatanaCreateProductPayload {
    name: string;
    /** Required by the API, minItems: 1. */
    variants: KatanaCreateVariantPayload[];
    uom?: string;
    category_name?: string;
    additional_info?: string;
    default_supplier_id?: number;
    purchase_uom?: string;
    purchase_uom_conversion_rate?: number;
    is_sellable?: boolean;
    is_purchasable?: boolean;
    is_producible?: boolean;
    is_auto_assembly?: boolean;
    batch_tracked?: boolean;
    serial_tracked?: boolean;
    operations_in_sequence?: boolean;
    configs?: KatanaProductConfig[];
    custom_field_collection_id?: number;
    lead_time?: number;
    minimum_order_quantity?: number;
}

const convertDraftVariantToCreatePayload = (
    variant: KatanaProductDraftVariant
): KatanaCreateVariantPayload => {
    const cleanSku = variant.sku?.trim() || undefined;

    // Both barcode fields are minLength: 3.
    const cleanInternalBarcode =
        variant.internal_barcode && variant.internal_barcode.trim().length >= 3
            ? variant.internal_barcode.trim()
            : undefined;

    const cleanRegisteredBarcode =
        variant.registered_barcode && variant.registered_barcode.trim().length >= 3
            ? variant.registered_barcode.trim()
            : undefined;

    // supplier_item_codes / config_attributes / custom_fields are all minItems: 1,
    // so an empty array is a 422 — omit the key instead.
    const cleanSupplierItemCodes = variant.supplier_item_codes?.filter(
        (code) => code.trim().length > 0
    );

    const cleanCustomFields = variant.custom_fields?.filter(
        (field) => field.field_name.trim().length > 0
    );

    return {
        ...(cleanSku !== undefined && { sku: cleanSku }),
        ...(variant.sales_price != null && { sales_price: variant.sales_price }),
        ...(variant.purchase_price != null && { purchase_price: variant.purchase_price }),
        ...(cleanInternalBarcode !== undefined && { internal_barcode: cleanInternalBarcode }),
        ...(cleanRegisteredBarcode !== undefined && {
            registered_barcode: cleanRegisteredBarcode,
        }),
        ...(cleanSupplierItemCodes?.length && {
            supplier_item_codes: cleanSupplierItemCodes,
        }),
        ...(variant.config_attributes.length > 0 && {
            config_attributes: variant.config_attributes,
        }),
        ...(cleanCustomFields?.length && { custom_fields: cleanCustomFields }),
    };
};

/**
 * Build the POST /products body from form state.
 *
 * Blank/null optionals are omitted rather than sent: `default_supplier_id` and
 * `purchase_uom_conversion_rate` are non-nullable in the schema, so sending
 * null returns 422. `purchase_uom` and its conversion rate are only valid as a
 * pair.
 */
export const convertProductToCreatePayload = (
    draft: KatanaProductDraft
): KatanaCreateProductPayload => {
    const cleanUom = draft.uom?.trim() || undefined;
    const cleanCategoryName = draft.category_name?.trim() || undefined;
    const cleanAdditionalInfo = draft.additional_info?.trim() || undefined;

    const cleanPurchaseUom = draft.purchase_uom?.trim() || undefined;
    const hasPurchaseUomPair =
        cleanPurchaseUom !== undefined && draft.purchase_uom_conversion_rate != null;

    const cleanConfigs = draft.configs
        .filter((config) => config.name.trim().length > 0 && config.values.length > 0)
        .map((config) => ({ name: config.name.trim(), values: config.values }));

    return {
        name: draft.name.trim(),
        variants: draft.variants.map(convertDraftVariantToCreatePayload),
        ...(cleanUom !== undefined && { uom: cleanUom }),
        ...(cleanCategoryName !== undefined && { category_name: cleanCategoryName }),
        ...(cleanAdditionalInfo !== undefined && { additional_info: cleanAdditionalInfo }),
        ...(draft.default_supplier_id != null && {
            default_supplier_id: draft.default_supplier_id,
        }),
        ...(hasPurchaseUomPair && {
            purchase_uom: cleanPurchaseUom,
            purchase_uom_conversion_rate: draft.purchase_uom_conversion_rate!,
        }),
        ...(draft.is_sellable !== undefined && { is_sellable: draft.is_sellable }),
        ...(draft.is_purchasable !== undefined && { is_purchasable: draft.is_purchasable }),
        ...(draft.is_producible !== undefined && { is_producible: draft.is_producible }),
        ...(draft.is_auto_assembly !== undefined && {
            is_auto_assembly: draft.is_auto_assembly,
        }),
        ...(draft.batch_tracked !== undefined && { batch_tracked: draft.batch_tracked }),
        ...(draft.serial_tracked !== undefined && { serial_tracked: draft.serial_tracked }),
        ...(draft.operations_in_sequence !== undefined && {
            operations_in_sequence: draft.operations_in_sequence,
        }),
        // configs is minItems: 1 — omit rather than send [].
        ...(cleanConfigs.length > 0 && { configs: cleanConfigs }),
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
    cost_per_unit?: number ;
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

export interface KatanaBatch {
    id: number;
    batch_number: string;
    variant_id: number;
    expiration_date?: string | null;
    batch_created_date?: string | null;
    batch_barcode?: string | null;
    created_at: string;
    updated_at: string;
}

export interface KatanaCreateBatchInput {
    batch_number: string;
    variant_id: number;
    expiration_date?: string;
    batch_created_date?: string;
    /** minLength: 3, maxLength: 40 */
    batch_barcode?: string | null;
}

export interface KatanaUpdateBatchInput {
    batch_number?: string;
    expiration_date?: string;
    batch_created_date?: string;
    /** minLength: 3, maxLength: 40 */
    batch_barcode?: string | null;
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