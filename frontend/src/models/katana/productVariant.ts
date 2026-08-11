// ==========================================
// 2. PRODUCT & VARIANT MODELS

import type { KatanaCustomField } from "./common";

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

export interface ResolvedVariantInfo {
    productId: number
    product_name: string;
    variant_details: string | null;
    sku: string;
    uom: string;
    category_id: number | null;
    batch_tracked?: boolean;
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
