import type { KatanaBatchTransaction, KatanaTraceabilityEntry } from "./inventory";

// ==========================================
// 1. ENUMS & STATUS TYPES
// ==========================================

export type KatanaManufacturingOrderStatus =
    | "NOT_STARTED"
    | "BLOCKED"
    | "IN_PROGRESS"
    | "DONE";

export type KatanaRecipeIngredientAvailability =
    | "PROCESSED"
    | "IN_STOCK"
    | "NOT_AVAILABLE"
    | "EXPECTED"
    | "NO_RECIPE"
    | "NOT_APPLICABLE";

export interface KatanaMOSerialNumber {
    id: number;
    transaction_id: number | null;
    serial_number: string;
    resource_type: "ManufacturingOrder";
    resource_id: number;
    transaction_date: string;
    quantity_change: number;
}

// ==========================================
// 2. MAIN MANUFACTURING ORDER OBJECT
// Ref: https://developer.katanamrp.com/reference/the-manufacturing-order-object
// ==========================================

export interface KatanaManufacturingOrder {
    id: number;
    status: KatanaManufacturingOrderStatus;
    order_no: string;
    variant_id: number;
    location_id: number;
    planned_quantity: number;
    actual_quantity: number | null;
    order_created_date?: string;
    done_date?: string | null;
    production_deadline_date?: string | null;
    additional_info?: string | null;

    // Sales Order Link (Make-To-Order / MTO)
    is_linked_to_sales_order?: boolean;
    sales_order_id?: number | null;
    sales_order_row_id?: number | null;
    sales_order_delivery_deadline?: string | null;

    // Stock & Costing
    ingredient_availability?: KatanaRecipeIngredientAvailability;
    total_cost?: number;
    total_planned_time?: number; // seconds
    total_actual_time?: number; // seconds
    material_cost?: number;
    subassemblies_cost?: number;
    operations_cost?: number;

    // Tracking
    traceability?: KatanaTraceabilityEntry[];
    serial_numbers?: KatanaMOSerialNumber[];
    /** @deprecated Deprecated in favor of traceability */
    batch_transactions?: KatanaBatchTransaction[];

    // Timestamps
    created_at: string;
    updated_at: string;
    deleted_at?: string | null;
}

// ==========================================
// 3. CREATE & UPDATE PAYLOADS
// ==========================================

export interface KatanaMOTraceabilityPayload {
    batch_id?: number | null;
    serial_number_id?: number | null;
    quantity?: string;
}

/** Body for POST /manufacturing_orders */
export interface CreateManufacturingOrderPayload {
    variant_id: number;
    location_id: number;
    planned_quantity: number;
    status?: "NOT_STARTED";
    order_no?: string;
    actual_quantity?: number;
    order_created_date?: string;
    production_deadline_date?: string;
    additional_info?: string;
    traceability?: KatanaMOTraceabilityPayload[];
    /** @deprecated Use traceability */
    batch_transactions?: KatanaBatchTransaction[];
}

/** Body for PATCH /manufacturing_orders/{id} */
export interface UpdateManufacturingOrderPayload {
    status?: KatanaManufacturingOrderStatus;
    order_no?: string;
    variant_id?: number;
    location_id?: number;
    planned_quantity?: number;
    actual_quantity?: number;
    order_created_date?: string;
    production_deadline_date?: string;
    done_date?: string;
    additional_info?: string;
    traceability?: KatanaMOTraceabilityPayload[];
    /** @deprecated Use traceability */
    batch_transactions?: KatanaBatchTransaction[];
}

// ==========================================
// 4. FORM DRAFT STATE
// ==========================================

export interface KatanaManufacturingOrderDraft {
    variant_id: number | null;
    location_id: number | null;
    planned_quantity: number;
    order_no?: string;
    status?: KatanaManufacturingOrderStatus;
    actual_quantity?: number;
    done_date?: string;
    production_deadline_date?: string | null;
    additional_info?: string | null;
    traceability?: KatanaMOTraceabilityPayload[];
}

// ==========================================
// 5. CONVERTERS & PAYLOAD HELPERS
// ==========================================

/**
 * Sanitizes form draft into a POST /manufacturing_orders payload.
 * Prevents 422 errors by stripping invalid/empty optional fields.
 */
export const convertMOToCreatePayload = (
    draft: KatanaManufacturingOrderDraft
): CreateManufacturingOrderPayload => {
    if (!draft.variant_id) {
        throw new Error("請選擇要製造的產品款式 (Variant ID is required)。");
    }

    if (!draft.location_id) {
        throw new Error("請選擇生產倉庫 (Location ID is required)。");
    }

    if (!draft.planned_quantity || draft.planned_quantity <= 0) {
        throw new Error("計畫生產數量必須大於 0 (Planned quantity must be > 0)。");
    }

    const cleanOrderNo = draft.order_no?.trim() || undefined;
    const cleanAdditionalInfo = draft.additional_info?.trim() || undefined;
    const cleanDeadline = draft.production_deadline_date?.trim() || undefined;

    const cleanTraceability = draft.traceability?.filter(
        (t) => t.batch_id != null || t.serial_number_id != null
    );

    return {
        variant_id: draft.variant_id,
        location_id: draft.location_id,
        planned_quantity: draft.planned_quantity,
        ...(draft.status === "NOT_STARTED" && { status: "NOT_STARTED" }),
        ...(cleanOrderNo && { order_no: cleanOrderNo }),
        ...(cleanAdditionalInfo && { additional_info: cleanAdditionalInfo }),
        ...(cleanDeadline && { production_deadline_date: cleanDeadline }),
        ...(cleanTraceability?.length && { traceability: cleanTraceability }),
    };
};

/**
 * Sanitizes draft state into a PATCH /manufacturing_orders/{id} payload.
 */
export const convertMOToUpdatePayload = (
    draft: Partial<KatanaManufacturingOrderDraft>
): UpdateManufacturingOrderPayload => {
    const cleanOrderNo = draft.order_no?.trim() || undefined;
    const cleanAdditionalInfo = draft.additional_info?.trim() || undefined;
    const cleanDeadline = draft.production_deadline_date?.trim() || undefined;

    const cleanTraceability = draft.traceability?.filter(
        (t) => t.batch_id != null || t.serial_number_id != null
    );

    return {
        ...(draft.status && { status: draft.status }),
        ...(draft.status === "DONE" && {
            actual_quantity: draft.actual_quantity,
            // done_date: draft.done_date,
        }),
        ...(draft.variant_id != null && { variant_id: draft.variant_id }),
        ...(draft.location_id != null && { location_id: draft.location_id }),
        ...(draft.planned_quantity != null && { planned_quantity: draft.planned_quantity }),
        ...(cleanOrderNo !== undefined && { order_no: cleanOrderNo }),
        ...(cleanAdditionalInfo !== undefined && { additional_info: cleanAdditionalInfo }),
        ...(cleanDeadline !== undefined && { production_deadline_date: cleanDeadline }),
        ...(cleanTraceability?.length && { traceability: cleanTraceability }),
    };
};

/**
 * Compares an existing KatanaManufacturingOrder against an incoming draft
 * and extracts ONLY the fields that have actually changed.
 */
/**
 * Compares an existing KatanaManufacturingOrder against an incoming draft
 * and extracts ONLY the fields that have actually changed.
 */
/**
 * Compares an existing KatanaManufacturingOrder against an incoming draft
 * and extracts ONLY the fields that have actually changed.
 */
export function getMODiffPayload(
    original: KatanaManufacturingOrder,
    draft: Partial<KatanaManufacturingOrderDraft>
): UpdateManufacturingOrderPayload {
    const diff: UpdateManufacturingOrderPayload = {};

    // 1. Variant ID
    if (draft.variant_id != null && draft.variant_id !== original.variant_id) {
        diff.variant_id = draft.variant_id;
    }

    // 2. Location ID
    if (draft.location_id != null && draft.location_id !== original.location_id) {
        diff.location_id = draft.location_id;
    }

    // 3. Planned Quantity
    if (draft.planned_quantity !== undefined && draft.planned_quantity !== original.planned_quantity) {
        diff.planned_quantity = draft.planned_quantity;
    }

    // 4. Actual Quantity (null check / non-null conversion)
    if (draft.actual_quantity !== undefined && draft.actual_quantity !== original.actual_quantity) {
        if (draft.actual_quantity !== null) {
            diff.actual_quantity = draft.actual_quantity;
        }
    }

    // 5. Status
    if (draft.status !== undefined && draft.status !== original.status) {
        diff.status = draft.status;
    }

    // 6. Order Number
    if (draft.order_no !== undefined) {
        const cleanDraftOrderNo = draft.order_no?.trim() ?? "";
        const cleanOrigOrderNo = original.order_no?.trim() ?? "";
        if (cleanDraftOrderNo !== cleanOrigOrderNo) {
            diff.order_no = cleanDraftOrderNo;
        }
    }

    // 7. Production Deadline Date
    if (draft.production_deadline_date !== undefined) {
        const cleanDraftDate = draft.production_deadline_date || undefined;
        const cleanOrigDate = original.production_deadline_date || undefined;
        if (cleanDraftDate !== cleanOrigDate) {
            if (cleanDraftDate) {
                diff.production_deadline_date = cleanDraftDate;
            }
        }
    }

    // 8. Done Date
    if (draft.done_date !== undefined && draft.done_date !== original.done_date) {
        if (draft.done_date) {
            diff.done_date = draft.done_date;
        }
    }

    // 9. Additional Info (Safely handle null + trim)
    if (draft.additional_info !== undefined) {
        const cleanDraftInfo = typeof draft.additional_info === "string" ? draft.additional_info.trim() : "";
        const cleanOrigInfo = original.additional_info?.trim() ?? "";
        if (cleanDraftInfo !== cleanOrigInfo) {
            diff.additional_info = cleanDraftInfo;
        }
    }

    // 10. Traceability
    if (draft.traceability !== undefined) {
        const draftTraceability = JSON.stringify(draft.traceability);
        const originalTraceability = JSON.stringify(original.traceability ?? []);
        if (draftTraceability !== originalTraceability) {
            diff.traceability = draft.traceability;
        }
    }

    return diff;
}