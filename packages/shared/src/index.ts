// packages/shared/src/index.ts

// ==========================================
// 1. INVENTORY DOMAIN
// ==========================================
export type {
    KatanaInventoryItem,
    KatanaTraceabilityEntry,
    KatanaBatchTransaction,
    KatanaBatch,
    KatanaBatchStock,
    KatanaCreateBatchInput,
    KatanaUpdateBatchInput,
    KatanaStockAdjustmentRowInput,
    KatanaStockAdjustmentInput,
    CreateStockAdjustmentRowPayload,
    CreateStockAdjustmentPayload,
    KatanaUpdateStockAdjustmentPayload,
    KatanaStockAdjustmentRow,
    KatanaStockAdjustment,
} from "./models/inventory";

export {
    convertStockAdjustmentToCreatePayload,
    convertStockAdjustmentToUpdatePayload,
} from "./models/inventory";

// ==========================================
// 2. CUSTOMER DOMAIN
// ==========================================
export type {
    KatanaCustomerAddressInput,
    KatanaCustomerAddress,
    KatanaCustomerInput,
    KatanaCustomer,
    CreateCustomerAddressPayload,
    CreateCustomerPayload,
    UpdateCustomerPayload,
    KatanaCustomerDraft,
} from "./models/customers";

export {
    convertCustomerToCreatePayload,
    convertCustomerToUpdatePayload,
} from "./models/customers";

// ==========================================
// 3. PRODUCT & VARIANT DOMAIN
// ==========================================
export type {
    KatanaProduct,
    KatanaProductDraft,
    KatanaProductDraftVariant,
    KatanaProductConfig,
    KatanaVariant,
    ResolvedVariantInfo,
    KatanaCreateProductPayload,
    KatanaCreateVariantPayload,
    KatanaUpdateProductPayload,
    KatanaUpdateVariantPayload,
} from "./models/productVariant";

export {
    UNSAVED_PRODUCT_ID,
    isUnsavedProduct,
    createEmptyProductDraft,
    buildConfigCombinations,
    syncDraftVariantsToConfigs,
    convertProductToPayload,
    convertVariantToPayload,
    convertProductToCreatePayload,
    convertVariantToCreatePayload,
} from "./models/productVariant";

// ==========================================
// 4. SALES ORDER DOMAIN
// ==========================================
export type {
    KatanaSalesOrderStatus,
    KatanaProductAvailability,
    KatanaIngredientAvailability,
    KatanaProductionStatus,
    KatanaSalesOrder,
    KatanaSalesOrderRow,
    KatanaSalesOrderRowAttribute,
    KatanaSalesOrderAddress,
    KatanaSalesOrderShippingFee,
    EnrichedSalesOrder,
    EnrichedSalesOrderRow,
    KatanaSalesOrderDraft,
    CreateSalesOrderPayload,
    CreateSalesOrderRowPayload,
    CreateSalesOrderAddressPayload,
    UpdateSalesOrderPayload,
    UpdateSalesOrderRowPayload,
} from "./models/salesOrder";

export {
    convertSalesOrderToCreatePayload,
    convertSalesOrderToUpdatePayload,
} from "./models/salesOrder";

// Supabase
// packages/shared/src/index.ts
export * from "./models/database.types";
// You can also export convenient table alias helpers
export type { Database } from "./models/database.types";
