import { supabase, unwrap } from "@/lib/supabase";
import type { Database } from "@my-inventory-app/shared";
import {
    convertStockAdjustmentToCreatePayload,
    convertStockAdjustmentToUpdatePayload,
    type KatanaStockAdjustmentInput,
    type KatanaStockAdjustment,
    type KatanaBatch,
    type KatanaCreateBatchInput,
    type KatanaUpdateBatchInput,
    type KatanaInventoryItem,
} from "@my-inventory-app/shared";

type InventoryLevelRow = Database["public"]["Tables"]["inventory_levels"]["Row"];
type InventoryLevelUpdate = Database["public"]["Tables"]["inventory_levels"]["Update"];
type BatchInsert = Database["public"]["Tables"]["batches"]["Insert"];
type BatchUpdate = Database["public"]["Tables"]["batches"]["Update"];
type StockAdjustmentInsert = Database["public"]["Tables"]["stock_adjustments"]["Insert"];
type StockAdjustmentRowInsert = Database["public"]["Tables"]["stock_adjustment_rows"]["Insert"];

export const inventoryService = {
    // ==========================================
    // 1. INVENTORY LEVELS
    // ==========================================

    // apps/frontend/src/services/inventoryService.ts

    async getInventoryLevels(locationId?: number): Promise<KatanaInventoryItem[]> {
        let query = supabase
            .from("inventory_levels")
            .select("*, variant:product_variants(*)")
            .order("updated_at", { ascending: false }); // <-- Changed from created_at to updated_at

        if (locationId) {
            query = query.eq("location_id", locationId);
        }

        const data = await unwrap(query);
        return data as unknown as KatanaInventoryItem[];
    },

    async updateInventoryLevel(
        variantId: number,
        locationId: number,
        updates: InventoryLevelUpdate
    ): Promise<InventoryLevelRow> {
        const data = await unwrap(
            supabase
                .from("inventory_levels")
                .update(updates)
                .match({ variant_id: variantId, location_id: locationId })
                .select()
                .single()
        );
        return data;
    },

    // ==========================================
    // 2. BATCHES
    // ==========================================

    async getBatches(variantId?: number): Promise<KatanaBatch[]> {
        let query = supabase
            .from("batches")
            .select("*")
            .order("batch_created_date", { ascending: false });

        if (variantId) {
            query = query.eq("variant_id", variantId);
        }

        const data = await unwrap(query);
        return data as unknown as KatanaBatch[];
    },

    async createBatch(input: KatanaCreateBatchInput): Promise<KatanaBatch> {
        const batchData: BatchInsert = {
            batch_number: input.batch_number.trim(),
            variant_id: input.variant_id,
            expiration_date: input.expiration_date ?? null,
            batch_created_date: input.batch_created_date ?? new Date().toISOString(),
            batch_barcode: input.batch_barcode ?? null,
        };

        const data = await unwrap(
            supabase.from("batches").insert(batchData).select().single()
        );
        return data as unknown as KatanaBatch;
    },

    async updateBatch(batchId: number, input: KatanaUpdateBatchInput): Promise<KatanaBatch> {
        const updateData: BatchUpdate = {
            ...(input.batch_number !== undefined && { batch_number: input.batch_number.trim() }),
            ...(input.expiration_date !== undefined && { expiration_date: input.expiration_date }),
            ...(input.batch_created_date !== undefined && { batch_created_date: input.batch_created_date }),
            ...(input.batch_barcode !== undefined && { batch_barcode: input.batch_barcode }),
        };

        const data = await unwrap(
            supabase.from("batches").update(updateData).eq("id", batchId).select().single()
        );
        return data as unknown as KatanaBatch;
    },

    async deleteBatch(batchId: number): Promise<void> {
        await unwrap(supabase.from("batches").delete().eq("id", batchId));
    },

    // ==========================================
    // 3. STOCK ADJUSTMENTS
    // ==========================================

    async getStockAdjustments(): Promise<KatanaStockAdjustment[]> {
        const data = await unwrap(
            supabase
                .from("stock_adjustments")
                .select("*, stock_adjustment_rows(*)")
                .is("deleted_at", null)
                .order("created_at", { ascending: false })
        );
        return data as unknown as KatanaStockAdjustment[];
    },

    async createStockAdjustment(
        adjustment: KatanaStockAdjustmentInput
    ): Promise<KatanaStockAdjustment> {
        const payload = convertStockAdjustmentToCreatePayload(adjustment);

        const adjustmentData: StockAdjustmentInsert = {
            location_id: payload.location_id,
            stock_adjustment_number: payload.stock_adjustment_number ?? `SA-${Date.now()}`,
            stock_adjustment_date: payload.stock_adjustment_date ?? new Date().toISOString(),
            reason: payload.reason ?? null,
            additional_info: payload.additional_info ?? null,
        };

        // 1. Insert header
        const createdAdjustment = await unwrap(
            supabase.from("stock_adjustments").insert(adjustmentData).select().single()
        );

        const adjustmentId = createdAdjustment?.id;
        if (!adjustmentId) {
            throw new Error("Failed to retrieve created stock adjustment ID.");
        }

        // 2. Insert rows if present
        if (payload.stock_adjustment_rows?.length) {
            const rowsData: StockAdjustmentRowInsert[] = payload.stock_adjustment_rows.map((row) => ({
                stock_adjustment_id: adjustmentId,
                variant_id: row.variant_id,
                quantity: row.quantity,
                cost_per_unit: row.cost_per_unit ?? null,
            }));

            await unwrap(supabase.from("stock_adjustment_rows").insert(rowsData));
        }

        // 3. Return full adjustment record
        const fullData = await unwrap(
            supabase
                .from("stock_adjustments")
                .select("*, stock_adjustment_rows(*)")
                .eq("id", adjustmentId)
                .single()
        );

        return fullData as unknown as KatanaStockAdjustment;
    },
    async updateStockAdjustment(
        id: number,
        adjustment: Partial<KatanaStockAdjustment>
    ): Promise<KatanaStockAdjustment> {
        const payload = convertStockAdjustmentToUpdatePayload(adjustment);

        const data = await unwrap(
            supabase
                .from("stock_adjustments")
                .update(payload)
                .eq("id", id)
                .select("*, stock_adjustment_rows(*)")
                .single()
        );

        return data as unknown as KatanaStockAdjustment;
    },

    async deleteStockAdjustment(id: number): Promise<void> {
        await unwrap(
            supabase
                .from("stock_adjustments")
                .update({ deleted_at: new Date().toISOString() })
                .eq("id", id)
        );
    },
};