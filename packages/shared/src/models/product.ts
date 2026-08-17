// ==========================================
// PRODUCT MODELS
// ==========================================

export interface KatanaProductConfig {
  id?: number;
  name: string; // e.g., "Size", "Color", "切法"
  values: string[]; // e.g., ["S", "M", "L"] or ["三去", "蝶切"]
}

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
}

// Product Form Drafts
export const UNSAVED_PRODUCT_ID = -1;
export const isUnsavedProduct = (id: number): boolean =>
  id === UNSAVED_PRODUCT_ID;

export interface KatanaProductDraft extends KatanaProductInput {
  id: number;
  configs: KatanaProductConfig[];
}

export interface KatanaCreateProductPayload {
  name: string;
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
});

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