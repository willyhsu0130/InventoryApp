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
// 3. PRODUCT DOMAIN
// ==========================================
export type {
  KatanaProductConfig,
  KatanaProductInput,
  KatanaProduct,
  KatanaProductDraft,
  KatanaCreateProductPayload,
  KatanaUpdateProductPayload,
} from "./models/product";

export {
  UNSAVED_PRODUCT_ID,
  isUnsavedProduct,
  createEmptyProductDraft,
  convertProductToPayload,
  convertProductToCreatePayload,
} from "./models/product";

// ==========================================
// 4. VARIANT DOMAIN
// ==========================================
export type {
  VariantConfigAttribute,
  VariantRow,
  VariantInsert,
  VariantUpdate,
  ProductVariant,
  CreateVariantInput,
  UpdateVariantInput,
} from "./models/variant";

// ==========================================
// 5. SALES ORDER DOMAIN
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

// ==========================================
// 6. SUPABASE & DATABASE TYPES
// ==========================================
export * from "./models/database.types";
export type { Database } from "./models/database.types";