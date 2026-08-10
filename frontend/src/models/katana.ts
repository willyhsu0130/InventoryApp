// ==========================================
// 1. COMMON & CONFIG TYPES
// ==========================================

export interface KatanaProductConfig {
  id?: number;
  name: string; // e.g., "Size", "Color", "切法"
  values: string[]; // e.g., ["S", "M", "L"] or ["三去", "蝶切"]
}

export interface KatanaVariantConfigAttribute {
  config_name: string; // e.g., "切法"
  config_value: string; // e.g., "三去"
}

export interface KatanaSupplierItemCode {
  supplier_id?: number;
  supplier_item_code: string;
}

export interface KatanaCustomField {
  field_name: string;
  field_value: string;
}

export interface KatanaAddress {
  id: number;
  line_1: string;
  line_2?: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
}

// ==========================================
// 2. PRODUCT & VARIANT MODELS
// ==========================================

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

export type KatanaUpdateProductPayload = Partial<KatanaProductInput>;

export interface KatanaProduct extends KatanaProductInput {
  id: number;
  type: "product" | "material";

  // Timestamps & Soft Deletes
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
  deleted_at?: string | null;

  // Mandatory Arrays
  configs: KatanaProductConfig[];
  variants: KatanaVariant[];
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

export interface KatanaVariant extends KatanaVariantInput {
  id: number;
  product_id: number;
  type: "product" | "material";
  config_attributes: KatanaVariantConfigAttribute[];
  created_at: string;
  updated_at: string;
  abc_classification?: "A" | "B" | "C" | null;
}

// Product Form Drafts
export const UNSAVED_PRODUCT_ID = -1;
export const isUnsavedProduct = (id: number): boolean =>
  id === UNSAVED_PRODUCT_ID;

export interface KatanaProductDraftVariant extends KatanaVariantInput {
  id?: number;
  config_attributes: KatanaVariantConfigAttribute[];
}

export interface KatanaProductDraft extends KatanaProductInput {
  id: number;
  configs: KatanaProductConfig[];
  variants: KatanaProductDraftVariant[];
}

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

export interface KatanaCreateProductPayload {
  name: string;
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

// ==========================================
// 3. SALES ORDER MODELS
// ==========================================

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

// ==========================================
// 4. CUSTOMER MODELS
// ==========================================

export interface KatanaCustomerAddressInput {
  entity_type: "billing" | "shipping";
  default?: boolean;
  first_name?: string | null;
  last_name?: string | null;
  company?: string | null;
  phone?: string | null;
  line_1?: string | null;
  line_2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
}

export interface KatanaCustomerAddress extends KatanaCustomerAddressInput {
  id: number;
  customer_id: number;
  created_at: string;
  updated_at: string;
}

export interface KatanaCustomerInput {
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  currency?: string | null;
  reference_id?: string | null;
  category?: string | null;
  comment?: string | null;
  discount_rate?: number | null;
}

export interface KatanaCustomer extends KatanaCustomerInput {
  id: number;
  default_billing_id?: number | null;
  default_shipping_id?: number | null;
  addresses?: KatanaCustomerAddress[];
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface CreateCustomerAddressPayload {
  entity_type: "billing" | "shipping";
  default?: boolean;
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

export interface CreateCustomerPayload {
  name: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  email?: string;
  phone?: string;
  currency?: string;
  reference_id?: string;
  category?: string;
  comment?: string;
  discount_rate?: number;
  addresses?: CreateCustomerAddressPayload[];
}

export interface UpdateCustomerPayload {
  name?: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  email?: string;
  phone?: string;
  currency?: string;
  reference_id?: string;
  category?: string;
  comment?: string;
  discount_rate?: number;
  default_shipping_id?: number;
}

export interface KatanaCustomerDraft extends KatanaCustomerInput {
  id?: number;
  addresses?: KatanaCustomerAddressInput[];
}

// ==========================================
// 5. LOCATION & INVENTORY MODELS
// ==========================================

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
  reorder_point: string;
  average_cost: string;
  value_in_stock: string;
  quantity_in_stock: string;
  quantity_committed: string;
  quantity_expected: string;
  quantity_missing_or_excess: string;
  quantity_potential: string;

  variant?: KatanaVariant;
  location?: KatanaLocation;
}

// ==========================================
// 6. STOCK ADJUSTMENT & BATCH MODELS
// ==========================================

export interface KatanaTraceabilityEntry {
  batch_id?: number | null;
  serial_number_id?: number | null;
  bin_location_id?: number | null;
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
  cost_per_unit?: number;
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
  batch_barcode?: string | null;
}

export interface KatanaUpdateBatchInput {
  batch_number?: string;
  expiration_date?: string;
  batch_created_date?: string;
  batch_barcode?: string | null;
}

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

export type KatanaUpdateStockAdjustmentPayload = Partial<
  Omit<CreateStockAdjustmentPayload, "stock_adjustment_rows">
>;

export interface KatanaStockAdjustmentRow extends KatanaStockAdjustmentRowInput {
  id: number;
}

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
// 7. PURCHASE ORDER MODELS
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
// 8. FRONTEND VIEW MODELS
// ==========================================

export interface ResolvedVariantInfo {
  product_name: string;
  variant_details: string | null;
  sku: string;
  uom: string;
  category_id: number | null;
}

export interface EnrichedSalesOrderRow
  extends KatanaSalesOrderRow,
    ResolvedVariantInfo {}

export interface EnrichedSalesOrder
  extends Omit<KatanaSalesOrder, "sales_order_rows"> {
  sales_order_rows: EnrichedSalesOrderRow[];
}

// ==========================================
// 9. CONVERTERS & PAYLOAD HELPERS
// ==========================================

// --- Product Converters ---

export const convertProductToPayload = (
  product: KatanaProductDraft
): KatanaUpdateProductPayload => {
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

  const cleanAdditionalInfo =
    additional_info && additional_info.trim().length > 0
      ? additional_info
      : undefined;

  const cleanCategoryName =
    category_name && category_name.trim().length > 0
      ? category_name
      : undefined;

  const cleanPurchaseUom =
    purchase_uom && purchase_uom.trim().length > 0 ? purchase_uom : undefined;

  const cleanConfigs =
    configs && configs.length > 0
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
    ...(cleanCategoryName !== undefined && {
      category_name: cleanCategoryName,
    }),
    ...(cleanAdditionalInfo !== undefined && {
      additional_info: cleanAdditionalInfo,
    }),
    ...(cleanPurchaseUom !== undefined && { purchase_uom: cleanPurchaseUom }),
    ...(cleanConfigs !== undefined && { configs: cleanConfigs }),
  };
};

export const convertVariantToPayload = (
  variant: KatanaVariantInput
): KatanaUpdateVariantPayload => {
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
    ...(purchase_price !== undefined &&
      purchase_price !== null && { purchase_price }),
    ...(lead_time !== undefined && lead_time !== null && { lead_time }),
    ...(minimum_order_quantity !== undefined &&
      minimum_order_quantity !== null && { minimum_order_quantity }),
    ...(cleanSku !== undefined && { sku: cleanSku }),
    ...(cleanInternalBarcode !== undefined && {
      internal_barcode: cleanInternalBarcode,
    }),
    ...(cleanRegisteredBarcode !== undefined && {
      registered_barcode: cleanRegisteredBarcode,
    }),
    ...(cleanSupplierItemCodes &&
      cleanSupplierItemCodes.length > 0 && {
        supplier_item_codes: cleanSupplierItemCodes,
      }),
    ...(cleanConfigAttributes &&
      cleanConfigAttributes.length > 0 && {
        config_attributes: cleanConfigAttributes,
      }),
    ...(cleanCustomFields &&
      cleanCustomFields.length > 0 && { custom_fields: cleanCustomFields }),
  };
};

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
  variants: [{ config_attributes: [] }],
});

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

const configAttributesKey = (
  attributes: KatanaVariantConfigAttribute[]
): string =>
  attributes
    .map((attr) => `${attr.config_name}=${attr.config_value}`)
    .join("|");

export const syncDraftVariantsToConfigs = (
  configs: KatanaProductConfig[],
  existing: KatanaProductDraftVariant[]
): KatanaProductDraftVariant[] => {
  const combinations = buildConfigCombinations(configs);

  if (combinations.length === 0) {
    return [{ ...existing[0], config_attributes: [] }];
  }

  const previousByKey = new Map(
    existing.map((variant) => [
      configAttributesKey(variant.config_attributes),
      variant,
    ])
  );

  return combinations.map((config_attributes) => ({
    ...previousByKey.get(configAttributesKey(config_attributes)),
    config_attributes,
  }));
};

const convertDraftVariantToCreatePayload = (
  variant: KatanaProductDraftVariant
): KatanaCreateVariantPayload => {
  const cleanSku = variant.sku?.trim() || undefined;

  const cleanInternalBarcode =
    variant.internal_barcode && variant.internal_barcode.trim().length >= 3
      ? variant.internal_barcode.trim()
      : undefined;

  const cleanRegisteredBarcode =
    variant.registered_barcode &&
    variant.registered_barcode.trim().length >= 3
      ? variant.registered_barcode.trim()
      : undefined;

  const cleanSupplierItemCodes = variant.supplier_item_codes?.filter(
    (code) => code.trim().length > 0
  );

  const cleanCustomFields = variant.custom_fields?.filter(
    (field) => field.field_name.trim().length > 0
  );

  return {
    ...(cleanSku !== undefined && { sku: cleanSku }),
    ...(variant.sales_price != null && { sales_price: variant.sales_price }),
    ...(variant.purchase_price != null && {
      purchase_price: variant.purchase_price,
    }),
    ...(cleanInternalBarcode !== undefined && {
      internal_barcode: cleanInternalBarcode,
    }),
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

export const convertProductToCreatePayload = (
  draft: KatanaProductDraft
): KatanaCreateProductPayload => {
  const cleanUom = draft.uom?.trim() || undefined;
  const cleanCategoryName = draft.category_name?.trim() || undefined;
  const cleanAdditionalInfo = draft.additional_info?.trim() || undefined;

  const cleanPurchaseUom = draft.purchase_uom?.trim() || undefined;
  const hasPurchaseUomPair =
    cleanPurchaseUom !== undefined &&
    draft.purchase_uom_conversion_rate != null;

  const cleanConfigs = draft.configs
    .filter(
      (config) => config.name.trim().length > 0 && config.values.length > 0
    )
    .map((config) => ({ name: config.name.trim(), values: config.values }));

  return {
    name: draft.name.trim(),
    variants: draft.variants.map(convertDraftVariantToCreatePayload),
    ...(cleanUom !== undefined && { uom: cleanUom }),
    ...(cleanCategoryName !== undefined && {
      category_name: cleanCategoryName,
    }),
    ...(cleanAdditionalInfo !== undefined && {
      additional_info: cleanAdditionalInfo,
    }),
    ...(draft.default_supplier_id != null && {
      default_supplier_id: draft.default_supplier_id,
    }),
    ...(hasPurchaseUomPair && {
      purchase_uom: cleanPurchaseUom,
      purchase_uom_conversion_rate: draft.purchase_uom_conversion_rate!,
    }),
    ...(draft.is_sellable !== undefined && { is_sellable: draft.is_sellable }),
    ...(draft.is_purchasable !== undefined && {
      is_purchasable: draft.is_purchasable,
    }),
    ...(draft.is_producible !== undefined && {
      is_producible: draft.is_producible,
    }),
    ...(draft.is_auto_assembly !== undefined && {
      is_auto_assembly: draft.is_auto_assembly,
    }),
    ...(draft.batch_tracked !== undefined && {
      batch_tracked: draft.batch_tracked,
    }),
    ...(draft.serial_tracked !== undefined && {
      serial_tracked: draft.serial_tracked,
    }),
    ...(draft.operations_in_sequence !== undefined && {
      operations_in_sequence: draft.operations_in_sequence,
    }),
    ...(cleanConfigs.length > 0 && { configs: cleanConfigs }),
  };
};

// --- Sales Order Converters ---

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

// --- Customer Converters ---

export const convertCustomerToCreatePayload = (
  draft: KatanaCustomerDraft
): CreateCustomerPayload => {
  const cleanName = draft.name?.trim();
  if (!cleanName) {
    throw new Error("請輸入客戶名稱 (Name is required)。");
  }

  const cleanFirstName = draft.first_name?.trim() || undefined;
  const cleanLastName = draft.last_name?.trim() || undefined;
  const cleanCompany = draft.company?.trim() || undefined;
  const cleanEmail = draft.email?.trim() || undefined;
  const cleanPhone = draft.phone?.trim() || undefined;
  const cleanCurrency = draft.currency?.trim() || undefined;
  const cleanReferenceId = draft.reference_id?.trim() || undefined;
  const cleanCategory = draft.category?.trim() || undefined;
  const cleanComment = draft.comment?.trim() || undefined;

  const cleanAddresses =
    draft.addresses && draft.addresses.length > 0
      ? draft.addresses.map((addr) => ({
          entity_type: addr.entity_type,
          ...(addr.default !== undefined && { default: addr.default }),
          ...(addr.first_name?.trim() && {
            first_name: addr.first_name.trim(),
          }),
          ...(addr.last_name?.trim() && { last_name: addr.last_name.trim() }),
          ...(addr.company?.trim() && { company: addr.company.trim() }),
          ...(addr.phone?.trim() && { phone: addr.phone.trim() }),
          ...(addr.line_1?.trim() && { line_1: addr.line_1.trim() }),
          ...(addr.line_2?.trim() && { line_2: addr.line_2.trim() }),
          ...(addr.city?.trim() && { city: addr.city.trim() }),
          ...(addr.state?.trim() && { state: addr.state.trim() }),
          ...(addr.zip?.trim() && { zip: addr.zip.trim() }),
          ...(addr.country?.trim() && { country: addr.country.trim() }),
        }))
      : undefined;

  return {
    name: cleanName,
    ...(cleanFirstName && { first_name: cleanFirstName }),
    ...(cleanLastName && { last_name: cleanLastName }),
    ...(cleanCompany && { company: cleanCompany }),
    ...(cleanEmail && { email: cleanEmail }),
    ...(cleanPhone && { phone: cleanPhone }),
    ...(cleanCurrency && { currency: cleanCurrency }),
    ...(cleanReferenceId && { reference_id: cleanReferenceId }),
    ...(cleanCategory && { category: cleanCategory }),
    ...(cleanComment && { comment: cleanComment }),
    ...(draft.discount_rate != null && { discount_rate: draft.discount_rate }),
    ...(cleanAddresses && { addresses: cleanAddresses }),
  };
};

export const convertCustomerToUpdatePayload = (
  draft: Partial<KatanaCustomerDraft>
): UpdateCustomerPayload => {
  const cleanName = draft.name?.trim() || undefined;
  const cleanFirstName = draft.first_name?.trim() || undefined;
  const cleanLastName = draft.last_name?.trim() || undefined;
  const cleanCompany = draft.company?.trim() || undefined;
  const cleanEmail = draft.email?.trim() || undefined;
  const cleanPhone = draft.phone?.trim() || undefined;
  const cleanCurrency = draft.currency?.trim() || undefined;
  const cleanReferenceId = draft.reference_id?.trim() || undefined;
  const cleanCategory = draft.category?.trim() || undefined;
  const cleanComment = draft.comment?.trim() || undefined;

  return {
    ...(cleanName && { name: cleanName }),
    ...(cleanFirstName && { first_name: cleanFirstName }),
    ...(cleanLastName && { last_name: cleanLastName }),
    ...(cleanCompany && { company: cleanCompany }),
    ...(cleanEmail && { email: cleanEmail }),
    ...(cleanPhone && { phone: cleanPhone }),
    ...(cleanCurrency && { currency: cleanCurrency }),
    ...(cleanReferenceId && { reference_id: cleanReferenceId }),
    ...(cleanCategory && { category: cleanCategory }),
    ...(cleanComment && { comment: cleanComment }),
    ...(draft.discount_rate != null && { discount_rate: draft.discount_rate }),
  };
};

// --- Stock Adjustment Converters ---

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

  const cleanAdjustmentNumber =
    stock_adjustment_number && stock_adjustment_number.trim().length > 0
      ? stock_adjustment_number
      : undefined;

  const cleanAdjustmentDate =
    stock_adjustment_date && stock_adjustment_date.trim().length > 0
      ? stock_adjustment_date
      : undefined;

  const cleanReason = reason && reason.trim().length > 0 ? reason : undefined;

  const cleanAdditionalInfo =
    additional_info && additional_info.trim().length > 0
      ? additional_info
      : undefined;

  const cleanRows: CreateStockAdjustmentRowPayload[] =
    stock_adjustment_rows.map((row) => {
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
    });

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

  const cleanReason = reason && reason.trim().length > 0 ? reason : undefined;

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