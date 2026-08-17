export * from "./common";
export * from "./customers";
export * from "./inventory";
export * from "./manufacture";
export * from "./product";
export * from "./salesOrder";

// Purchase order models remain defined in this compatibility barrel.

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

// ==========================================
// 9. CONVERTERS & PAYLOAD HELPERS
// ==========================================

// --- Product Converters ---

