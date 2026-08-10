// src/components/inventory/StockAdjustmentModal.tsx
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { EditModal } from "../EditModal";
import { katanaFetch } from "../../lib/katanaFetch";
import { KATANA_API_ROUTES } from "../../lib/routes/routes";
import { CONTROL_INPUT, ERROR_PANEL, FIELD_LABEL } from "../../lib/styles";
import { useInventoryCatalog, useProductCatalog } from "../../hooks/useContexts";
import {
    convertStockAdjustmentToCreatePayload,
    type KatanaBatch,
    type KatanaInventoryItem,
    type KatanaLocation,
    type KatanaStockAdjustment,
    type KatanaStockAdjustmentRowInput,
    type KatanaTraceabilityEntry,
} from "../../models/katana/katana";

import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarIcon } from 'lucide-react';

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"



interface StockAdjustmentModalProps {
    onClose: () => void;
    onAdjusted: () => void;
    items: KatanaInventoryItem[];
    initialVariantId?: number | null;
}

/** Sentinel used in the batch <select> to mean "create a new batch". */
const NEW_BATCH_VALUE = "__new__";

interface AdjustmentDraftRow {
    variantId: number;
    /** undefined = defaulted to current stock level */
    targetQuantity?: string;
    /** undefined = untraced, "new" = create a batch on save, number = existing batch id */
    batchId?: number | "new";
    /** Only used while batchId === "new" */
    newBatchNumber?: string;
}

const todayInputValue = (): string => new Date().toISOString().slice(0, 10);
const roundQuantity = (value: number): number => Math.round(value * 1e6) / 1e6;

export const StockAdjustmentModal = ({
    onClose,
    onAdjusted,
    items,
    initialVariantId,
}: StockAdjustmentModalProps) => {
    const { products, getVariantDetails } = useProductCatalog();
    const { batch, createBatch } = useInventoryCatalog();

    const [locations, setLocations] = useState<KatanaLocation[]>([]);
    const [locationId, setLocationId] = useState<number | null>(
        initialVariantId != null
            ? items.find((item) => item.variant_id === initialVariantId)?.location_id ?? null
            : null
    );

    // Default targetQuantity to undefined so it dynamically defaults to stock
    const [rows, setRows] = useState<AdjustmentDraftRow[]>(() =>
        initialVariantId != null
            ? [{ variantId: initialVariantId, targetQuantity: undefined }]
            : []
    );
    const [reason, setReason] = useState("");
    const [adjustmentDate, setAdjustmentDate] = useState(todayInputValue);
    const [adjustmentCalendarOpen, setAdjustmentCalendarOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // Fetch locations on mount
    useEffect(() => {
        let isMounted = true;

        const loadLocations = async () => {
            const res = await katanaFetch<KatanaLocation[]>(KATANA_API_ROUTES.LOCATIONS);
            if (!isMounted) return;

            if (!res.success || !Array.isArray(res.data)) {
                setFormError(res.success ? "無法讀取倉庫列表。" : res.message);
                return;
            }

            setLocations(res.data);
            const preferred = res.data.find((loc) => loc.is_primary) ?? res.data[0];
            setLocationId((current) => current ?? preferred?.id ?? null);
        };

        loadLocations();
        return () => {
            isMounted = false;
        };
    }, []);

    /** Stock on hand at the selected location, keyed by variant. */
    const stockByVariant = useMemo(() => {
        const byVariant = new Map<number, number>();
        for (const item of items) {
            if (locationId != null && item.location_id !== locationId) continue;
            byVariant.set(item.variant_id, parseFloat(item.quantity_in_stock) || 0);
        }
        return byVariant;
    }, [items, locationId]);

    /** Existing batches, grouped by the variant they belong to. */
    const batchesByVariant = useMemo(() => {
        const byVariant = new Map<number, KatanaBatch[]>();
        for (const b of batch.values()) {
            const list = byVariant.get(b.variant_id) ?? [];
            list.push(b);
            byVariant.set(b.variant_id, list);
        }
        return byVariant;
    }, [batch]);

    /** Only batch-tracked products can have adjustment rows assigned to a batch. */
    const isBatchTrackedVariant = (variantId: number): boolean => {
        const details = getVariantDetails(variantId);
        return products.get(details.productId)?.batch_tracked ?? false;
    };

    const selectableVariants = useMemo(() => {
        const alreadyAdded = new Set(rows.map((row) => row.variantId));

        return items
            .filter(
                (item) =>
                    (locationId == null || item.location_id === locationId) &&
                    !alreadyAdded.has(item.variant_id)
            )
            .map((item) => {
                const details = getVariantDetails(item.variant_id);
                const product = products.get(details.productId);
                const isParentVariant =
                    (product?.configs?.length ?? 0) > 0 && !details.variant_details;

                return {
                    variantId: item.variant_id,
                    label: details.variant_details
                        ? `${details.product_name} - ${details.variant_details}`
                        : details.product_name,
                    isParentVariant,
                };
            })
            .filter((variant) => !variant.isParentVariant) // exclude the parent/default row
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [items, locationId, rows, getVariantDetails, products]);

    const handleAddRow = (variantId: number) => {
        setFormError(null);
        setRows((prev) => [...prev, { variantId, targetQuantity: undefined }]);
    };

    const handleRemoveRow = (variantId: number) => {
        setRows((prev) => prev.filter((row) => row.variantId !== variantId));
    };

    const handleTargetChange = (variantId: number, targetQuantity: string) => {
        setFormError(null);
        setRows((prev) =>
            prev.map((row) => (row.variantId === variantId ? { ...row, targetQuantity } : row))
        );
    };

    const handleBatchChange = (variantId: number, value: string) => {
        setFormError(null);
        setRows((prev) =>
            prev.map((row) => {
                if (row.variantId !== variantId) return row;

                if (value === "") {
                    return { ...row, batchId: undefined, newBatchNumber: undefined };
                }
                if (value === NEW_BATCH_VALUE) {
                    return { ...row, batchId: "new" };
                }
                return { ...row, batchId: Number(value), newBatchNumber: undefined };
            })
        );
    };

    const handleNewBatchNumberChange = (variantId: number, newBatchNumber: string) => {
        setFormError(null);
        setRows((prev) =>
            prev.map((row) => (row.variantId === variantId ? { ...row, newBatchNumber } : row))
        );
    };

    /** Helper to resolve target quantity string or fallback to current stock. */
    const getEffectiveQuantityString = (row: AdjustmentDraftRow): string => {
        if (row.targetQuantity !== undefined) return row.targetQuantity;
        return String(stockByVariant.get(row.variantId) ?? 0);
    };

    /** Delta for a row, or null when the field is blank/unparseable. */
    const deltaFor = (row: AdjustmentDraftRow): number | null => {
        const rawStr = getEffectiveQuantityString(row);
        if (rawStr.trim() === "") return null;

        const target = Number(rawStr);
        if (Number.isNaN(target)) return null;

        return roundQuantity(target - (stockByVariant.get(row.variantId) ?? 0));
    };

    const handleSave = async () => {
        if (locationId == null) {
            setFormError("請選擇倉庫。");
            return;
        }

        const adjustmentRows: KatanaStockAdjustmentRowInput[] = [];

        for (const row of rows) {
            const rawStr = getEffectiveQuantityString(row);
            if (rawStr.trim() === "") continue;

            const target = Number(rawStr);
            if (Number.isNaN(target)) {
                setFormError("調整後數量必須是數字。");
                return;
            }
            if (target < 0) {
                setFormError("調整後數量不可小於 0。");
                return;
            }

            const delta = roundQuantity(target - (stockByVariant.get(row.variantId) ?? 0));
            if (delta === 0) continue;

            let traceability: KatanaTraceabilityEntry[] | undefined;

            if (isBatchTrackedVariant(row.variantId) && row.batchId !== undefined) {
                let resolvedBatchId: number;

                if (row.batchId === "new") {
                    const trimmed = row.newBatchNumber?.trim();
                    if (!trimmed) {
                        setFormError("請輸入新批次編號。");
                        return;
                    }
                    try {
                        const created = await createBatch({
                            batch_number: trimmed,
                            variant_id: row.variantId,
                        });
                        resolvedBatchId = created.id;
                    } catch (err) {
                        console.error("Failed to create batch:", err);
                        setFormError(err instanceof Error ? err.message : "建立批次失敗。");
                        return;
                    }
                } else {
                    resolvedBatchId = row.batchId;
                }

                traceability = [{ batch_id: resolvedBatchId, quantity: String(delta) }];
            }

            adjustmentRows.push({
                variant_id: row.variantId,
                quantity: delta,
                ...(traceability && { traceability }),
            });
        }

        if (adjustmentRows.length === 0) {
            setFormError("沒有任何數量變動。");
            return;
        }

        setFormError(null);
        setIsSaving(true);

        try {
            const payload = convertStockAdjustmentToCreatePayload({
                location_id: locationId,
                stock_adjustment_date: adjustmentDate
                    ? new Date(adjustmentDate).toISOString()
                    : null,
                reason,
                stock_adjustment_rows: adjustmentRows,
            });

            const res = await katanaFetch<KatanaStockAdjustment>(
                KATANA_API_ROUTES.STOCK_ADJUSTMENTS,
                { method: "POST", body: JSON.stringify(payload) }
            );

            if (!res.success) throw new Error(res.message);

            onAdjusted();
            onClose();
        } catch (err) {
            console.error("Failed to create stock adjustment:", err);
            setFormError(err instanceof Error ? err.message : "庫存調整失敗。");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <EditModal
            isOpen
            title="調整庫存"
            onClose={onClose}
            onSave={handleSave}
            isSaving={isSaving}
        >
            <div className="flex flex-col gap-y-5">
                {formError && <div className={ERROR_PANEL}>{formError}</div>}

                <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col gap-y-1">
                        <label className={FIELD_LABEL}>倉庫</label>
                        <select
                            className={CONTROL_INPUT}
                            value={locationId ?? ""}
                            onChange={(e) => setLocationId(Number(e.target.value))}
                        >
                            {locations.length === 0 && <option value="">讀取中...</option>}
                            {locations.map((location) => (
                                <option key={location.id} value={location.id}>
                                    {location.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-y-1">
                        <label className={FIELD_LABEL}>調整日期</label>
                        <input
                            type="date"
                            className={CONTROL_INPUT}
                            value={adjustmentDate}
                            onChange={(e) => setAdjustmentDate(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col gap-y-1">
                        <label className={FIELD_LABEL}>原因 (選填)</label>
                        <input
                            type="text"
                            className={CONTROL_INPUT}
                            placeholder="例如: 盤點差異、耗損"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>
                </div>

                {/* Adjustment lines */}
                <div className="rounded-lg border border-slate-800 overflow-hidden">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-950 text-slate-400 font-medium text-xs uppercase tracking-wider">
                            <tr>
                                <th className="py-3 px-4 border-b border-slate-800">商品 / 規格</th>
                                <th className="py-3 px-4 border-b border-slate-800 text-right">目前庫存</th>
                                <th className="py-3 px-4 border-b border-slate-800 text-right">調整後數量</th>
                                <th className="py-3 px-4 border-b border-slate-800">批次</th>
                                <th className="py-3 px-4 border-b border-slate-800 text-right">變動</th>
                                <th className="py-3 px-4 border-b border-slate-800 w-10" />
                            </tr>
                        </thead>
                        <tbody className="font-mono text-xs">
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                                        請在下方新增要調整的商品。
                                    </td>
                                </tr>
                            ) : (
                                rows.map((row) => {
                                    const details = getVariantDetails(row.variantId);
                                    const current = stockByVariant.get(row.variantId) ?? 0;
                                    const effectiveQtyStr = getEffectiveQuantityString(row);
                                    const delta = deltaFor(row);
                                    const batchTracked = isBatchTrackedVariant(row.variantId);
                                    const variantBatches = batchesByVariant.get(row.variantId) ?? [];

                                    return (
                                        <tr key={row.variantId} className="border-b border-slate-800/40">
                                            <td className="py-2.5 px-4 font-sans">
                                                <div className="font-medium text-slate-100">
                                                    {details.product_name}
                                                </div>
                                                {details.variant_details && (
                                                    <div className="text-xs text-slate-400 mt-0.5">
                                                        {details.variant_details}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-4 text-right text-slate-400">
                                                {current}
                                            </td>
                                            <td className="py-2.5 px-4 text-right">
                                                <input
                                                    type="number"
                                                    step="any"
                                                    min="0"
                                                    className="w-28 text-right bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded px-2 py-1 text-slate-100 focus:outline-none transition"
                                                    value={effectiveQtyStr}
                                                    onChange={(e) =>
                                                        handleTargetChange(row.variantId, e.target.value)
                                                    }
                                                />
                                            </td>
                                            <td className="py-2.5 px-4">
                                                {batchTracked ? (
                                                    <div className="flex gap-x-3">
                                                        <div className="flex flex-col gap-y-1">
                                                            <select
                                                                className="bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded px-2 py-1 text-slate-100 focus:outline-none transition"
                                                                value={
                                                                    row.batchId === "new"
                                                                        ? NEW_BATCH_VALUE
                                                                        : row.batchId ?? ""
                                                                }
                                                                onChange={(e) =>
                                                                    handleBatchChange(row.variantId, e.target.value)
                                                                }
                                                            >
                                                                {variantBatches.map((b) => (
                                                                    <option key={b.id} value={b.id}>
                                                                        {b.batch_number === "Unbatched" ? "不需要批次" : b.batch_number}
                                                                    </option>
                                                                ))}
                                                                <option value={NEW_BATCH_VALUE}>+ 新增批次...</option>
                                                            </select>
                                                            {row.batchId === "new" && (
                                                                <input
                                                                    type="text"
                                                                    placeholder="新批次編號"
                                                                    className="bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded px-2 py-1 text-slate-100 focus:outline-none transition"
                                                                    value={row.newBatchNumber ?? ""}
                                                                    onChange={(e) =>
                                                                        handleNewBatchNumberChange(
                                                                            row.variantId,
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                />
                                                            )}

                                                        </div>

                                                        <div>
                                                            {/* calendar */}
                                                            <Popover>
                                                                <PopoverTrigger render={<Button variant="secondary"><CalendarIcon /></Button>} />
                                                                <PopoverContent className="">
                                                                    <Calendar />
                                                                </PopoverContent>
                                                            </Popover>
                                                        </div>

                                                    </div>

                                                ) : (
                                                    <span className="text-slate-600">—</span>
                                                )}
                                            </td>
                                            <td
                                                className={`py-2.5 px-4 text-right font-medium ${delta === null || delta === 0
                                                    ? "text-slate-500"
                                                    : delta > 0
                                                        ? "text-emerald-400"
                                                        : "text-amber-400"
                                                    }`}
                                            >
                                                {delta === null ? "—" : delta > 0 ? `+${delta}` : delta}
                                            </td>
                                            <td className="py-2.5 px-4 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveRow(row.variantId)}
                                                    className="text-slate-500 hover:text-red-400 p-1"
                                                    title="移除"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col gap-y-1">
                    <label className={FIELD_LABEL}>新增商品</label>
                    <select
                        className={CONTROL_INPUT}
                        value=""
                        onChange={(e) => {
                            if (e.target.value) handleAddRow(Number(e.target.value));
                        }}
                    >
                        <option value="">選擇要調整的商品...</option>
                        {selectableVariants.map((variant) => (
                            <option key={variant.variantId} value={variant.variantId}>
                                {variant.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </EditModal>
    );
};