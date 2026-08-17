import type { KatanaLocation } from "./common";
import type { KatanaVariant } from "./productVariant";

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
    location_id?: number;
    quantity_in_stock?: string;
    expiration_date?: string | null;
    batch_created_date?: string | null;
    batch_barcode?: string | null;
    created_at: string;
    updated_at: string;
}

export interface KatanaBatchStock extends Omit<KatanaBatch, "id"> {
    batch_id: number;
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