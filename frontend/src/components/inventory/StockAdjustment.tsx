// src/components/inventory/StockAdjustment.tsx
import { useImperativeHandle, useEffect, useMemo, useState } from "react";
import { X, Calendar as CalendarIcon } from "lucide-react";
import { katanaFetch } from "../../lib/katanaFetch";
import { KATANA_API_ROUTES } from "../../lib/routes/routes";
import { CONTROL_INPUT, ERROR_PANEL, FIELD_LABEL } from "../../lib/styles";
import { useInventoryCatalog, useProductCatalog } from "../../hooks/useContexts";
import {
    type KatanaBatch,
    type KatanaInventoryItem,
    type KatanaLocation,
    type KatanaStockAdjustmentRowInput,
    type KatanaTraceabilityEntry,
} from "../../models/katana";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

const NEW_BATCH_VALUE = "__new__";

export interface StockAdjustmentHandle {
    submit: () => Promise<void>;
}

interface StockAdjustmentProps {
    items: KatanaInventoryItem[];
    initialVariantId?: number | null;
    onSavingChange?: (isSaving: boolean) => void;
    onSuccess: () => void;
    ref?: React.Ref<StockAdjustmentHandle>;
}

interface AdjustmentDraftRow {
    variantId: number;
    targetQuantity?: string;
    batchId?: number | "new";
    newBatchNumber?: string;
    expirationDate?: Date;
}

const roundQuantity = (value: number): number => Math.round(value * 1e6) / 1e6;

export const StockAdjustment = ({
    items,
    initialVariantId,
    onSavingChange,
    onSuccess,
    ref,
}: StockAdjustmentProps) => {
    const { products, getVariantDetails } = useProductCatalog();
    const { batch, createBatch, createStockAdjustment } = useInventoryCatalog();

    const [locations, setLocations] = useState<KatanaLocation[]>([]);
    const [locationId, setLocationId] = useState<number | null>(
        initialVariantId != null
            ? items.find((item) => item.variant_id === initialVariantId)?.location_id ?? null
            : null
    );

    const [rows, setRows] = useState<AdjustmentDraftRow[]>(() =>
        initialVariantId != null
            ? [{ variantId: initialVariantId, targetQuantity: undefined }]
            : []
    );
    const [reason, setReason] = useState("");
    const [adjustmentDate, setAdjustmentDate] = useState<Date | undefined>(() => new Date());
    const [adjustmentCalendarOpen, setAdjustmentCalendarOpen] = useState(false);
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

    const stockByVariant = useMemo(() => {
        const byVariant = new Map<number, number>();
        for (const item of items) {
            if (locationId != null && item.location_id !== locationId) continue;
            byVariant.set(item.variant_id, parseFloat(item.quantity_in_stock) || 0);
        }
        return byVariant;
    }, [items, locationId]);

    const batchesByVariant = useMemo(() => {
        const byVariant = new Map<number, KatanaBatch[]>();
        for (const b of batch.values()) {
            const list = byVariant.get(b.variant_id) ?? [];
            list.push(b);
            byVariant.set(b.variant_id, list);
        }
        return byVariant;
    }, [batch]);

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
            .filter((variant) => !variant.isParentVariant)
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
                    return { ...row, batchId: undefined, newBatchNumber: undefined, expirationDate: undefined };
                }
                if (value === NEW_BATCH_VALUE) {
                    return { ...row, batchId: "new" };
                }
                return { ...row, batchId: Number(value), newBatchNumber: undefined, expirationDate: undefined };
            })
        );
    };

    const handleNewBatchNumberChange = (variantId: number, newBatchNumber: string) => {
        setFormError(null);
        setRows((prev) =>
            prev.map((row) => (row.variantId === variantId ? { ...row, newBatchNumber } : row))
        );
    };

    const handleAdjustmentDateSelect = (date: Date | undefined) => {
        setAdjustmentDate(date);
        setAdjustmentCalendarOpen(false);
    };

    const handleExpirationDateChange = (variantId: number, date: Date | undefined) => {
        setFormError(null);
        setRows((prev) =>
            prev.map((row) => (row.variantId === variantId ? { ...row, expirationDate: date } : row))
        );
    };

    const getEffectiveQuantityString = (row: AdjustmentDraftRow): string => {
        if (row.targetQuantity !== undefined) return row.targetQuantity;
        return String(stockByVariant.get(row.variantId) ?? 0);
    };

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
                            expiration_date: row.expirationDate ? row.expirationDate.toISOString() : undefined,
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
        onSavingChange?.(true);

        try {
            const data = await createStockAdjustment({
                location_id: locationId,
                stock_adjustment_date: adjustmentDate ? adjustmentDate.toISOString() : undefined,
                reason,
                stock_adjustment_rows: adjustmentRows,
            });

            if (data) {
                onSuccess();
            } else {
                setFormError("庫存調整失敗。");
            }
        } catch (err) {
            console.error("Failed to save stock adjustment:", err);
            setFormError(err instanceof Error ? err.message : "庫存調整失敗。");
        } finally {
            onSavingChange?.(false);
        }
    };

    useImperativeHandle(ref, () => ({ submit: handleSave }));

    return (
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
                    <Popover open={adjustmentCalendarOpen} onOpenChange={setAdjustmentCalendarOpen}>
                        <PopoverTrigger>
                            <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal bg-slate-900 border-slate-700 text-slate-100 hover:bg-slate-800"
                            >
                                <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                                {adjustmentDate ? format(adjustmentDate, "yyyy/MM/dd") : <span>選擇日期</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-800 text-slate-100" align="start">
                            <Calendar
                                mode="single"
                                selected={adjustmentDate}
                                onSelect={handleAdjustmentDateSelect}

                            />
                        </PopoverContent>
                    </Popover>
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

            <div className="rounded-lg border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 font-medium text-xs uppercase tracking-wider">
                        <tr>
                            <th className="py-3 px-4 border-b border-slate-800">商品 / 規格</th>
                            <th className="py-3 px-4 border-b border-slate-800 text-right">目前庫存</th>
                            <th className="py-3 px-4 border-b border-slate-800 text-right">調整後數量</th>
                            <th className="py-3 px-4 border-b border-slate-800">批次與有效日期</th>
                            <th className="py-3 px-4 border-b border-slate-800 text-right">變動</th>
                            {/* 刪除鍵 */}
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
                                        <td className="py-2.5 px-4 gap-x-3">
                                            {batchTracked ? (
                                                <div className="flex gap-x-3 items-center w-full">
                                                    <div className="flex flex-col gap-y-1 w-full">
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
                                                            <option value="">選擇批次...</option>
                                                            {variantBatches
                                                                .filter((b) => b.batch_number !== "Unbatched") // Exclude Katana's fallback row if present
                                                                .map((b) => (
                                                                    <option key={b.id} value={b.id}>
                                                                        {b.batch_number}
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

                                                    {row.batchId === "new" && (
                                                        <div>
                                                            <Popover>
                                                                <PopoverTrigger >
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 text-xs px-2.5"
                                                                    >
                                                                        <CalendarIcon className="h-3.5 w-3.5 mr-1 text-slate-400" />
                                                                        {row.expirationDate
                                                                            ? format(row.expirationDate, "yyyy/MM/dd")
                                                                            : "有效日期"}
                                                                    </Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-800 text-slate-100" align="start">
                                                                    <Calendar
                                                                        mode="single"
                                                                        selected={row.expirationDate}
                                                                        onSelect={(date) => handleExpirationDateChange(row.variantId, date)}

                                                                    />
                                                                </PopoverContent>
                                                            </Popover>
                                                        </div>
                                                    )}
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
    );
};