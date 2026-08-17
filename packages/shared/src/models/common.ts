

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


/**
 * Safely compares two date representations (ISO strings, Date objects, or undefined/null).
 * Returns true if both represent the exact same calendar date/timestamp.
 */
export function isSameDate(
    dateA?: string | null,
    dateB?: string | null
): boolean {
    // Both empty / null / undefined -> considered identical
    if (!dateA && !dateB) return true;
    if (!dateA || !dateB) return false;

    // Fast string match
    if (dateA === dateB) return true;

    // Parse and compare timestamps
    const timeA = new Date(dateA).getTime();
    const timeB = new Date(dateB).getTime();

    // If either parsed to NaN (invalid date), fall back to strict inequality
    if (isNaN(timeA) || isNaN(timeB)) return dateA === dateB;

    return timeA === timeB;
}