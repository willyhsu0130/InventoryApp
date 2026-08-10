

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
