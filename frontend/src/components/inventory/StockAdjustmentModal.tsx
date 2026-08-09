// src/components/inventory/StockAdjustmentModal.tsx
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { EditModal } from "../EditModal";
import { katanaFetch } from "../../lib/katanaFetch";
import { KATANA_API_ROUTES } from "../../lib/routes/routes";
import { CONTROL_INPUT, ERROR_PANEL, FIELD_LABEL } from "../../lib/styles";
import { useProductCatalog } from "../../hooks/useContexts";
import {
    convertStockAdjustmentToCreatePayload,
    type KatanaInventoryItem,
    type KatanaLocation,
    type KatanaStockAdjustment,
    type KatanaStockAdjustmentRowInput,
} from "../../models/katana";

interface StockAdjustmentModalProps {
    onClose: () => void;
    /** Called once Katana accepts the adjustment, so the page can refetch. */
    onAdjusted: () => void;
    items: KatanaInventoryItem[];
    /** Pre-selects a single variant when opened from a table row. */
    initialVariantId?: number | null;
}

/**
 * One editable line. The user enters the counted total; Katana wants the
 * difference, so `quantity` is derived at submit time.
 */
interface AdjustmentDraftRow {
    variantId: number;
    /** Kept as raw text so the field can be emptied mid-typing. */
    targetQuantity: string;
}

const todayInputValue = (): string => new Date().toISOString().slice(0, 10);

/** Trims binary-float noise from a subtraction (e.g. 3.0000000000000004). */
const roundQuantity = (value: number): number => Math.round(value * 1e6) / 1e6;

export const StockAdjustmentModal = ({
    onClose,
    onAdjusted,
    items,
    initialVariantId,
}: StockAdjustmentModalProps) => {
    const { getVariantDetails } = useProductCatalog();

    const [locations, setLocations] = useState<KatanaLocation[]>([]);
    const [locationId, setLocationId] = useState<number | null>(
        // Opened from a row: adopt that row's location so the numbers line up.
        initialVariantId != null
            ? items.find((item) => item.variant_id === initialVariantId)?.location_id ?? null
            : null
    );
    const [rows, setRows] = useState<AdjustmentDraftRow[]>(() =>
        initialVariantId != null
            ? [{ variantId: initialVariantId, targetQuantity: "" }]
            : []
    );
    const [reason, setReason] = useState("");
    const [adjustmentDate, setAdjustmentDate] = useState(todayInputValue);
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // location_id is required by the API, so resolve the list up front.
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

    // Seed each row with its current count so an untouched row means "no change".
    // `items` is fixed while the modal is mounted, so this only fires on
    // location switches and newly added rows.
    useEffect(() => {
        setRows((prev) =>
            prev.map((row) =>
                row.targetQuantity === ""
                    ? { ...row, targetQuantity: String(stockByVariant.get(row.variantId) ?? 0) }
                    : row
            )
        );
    }, [stockByVariant]);

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
                return {
                    variantId: item.variant_id,
                    label: details.variant_details
                        ? `${details.product_name} - ${details.variant_details}`
                        : details.product_name,
                };
            })
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [items, locationId, rows, getVariantDetails]);

    const handleAddRow = (variantId: number) => {
        setFormError(null);
        setRows((prev) => [...prev, { variantId, targetQuantity: "" }]);
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

    /** Delta for a row, or null when the field is blank/unparseable. */
    const deltaFor = (row: AdjustmentDraftRow): number | null => {
        if (row.targetQuantity.trim() === "") return null;
        const target = Number(row.targetQuantity);
        if (Number.isNaN(target)) return null;
        return roundQuantity(target - (stockByVariant.get(row.variantId) ?? 0));
    };

    const handleSave = async () => {
        if (locationId == null) {
            setFormError("請選擇倉庫。");
            return;
        }

        // Katana applies `quantity` as a delta: positive adds, negative removes.
        const adjustmentRows: KatanaStockAdjustmentRowInput[] = [];

        for (const row of rows) {
            if (row.targetQuantity.trim() === "") continue;

            const target = Number(row.targetQuantity);
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

            adjustmentRows.push({ variant_id: row.variantId, quantity: delta });
        }

        // stock_adjustment_rows is minItems: 1 — an all-zero form is a no-op.
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
        // Mounted only while open, so every open starts from a clean form.
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
                                <th className="py-3 px-4 border-b border-slate-800 text-right">變動</th>
                                <th className="py-3 px-4 border-b border-slate-800 w-10" />
                            </tr>
                        </thead>
                        <tbody className="font-mono text-xs">
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">
                                        請在下方新增要調整的商品。
                                    </td>
                                </tr>
                            ) : (
                                rows.map((row) => {
                                    const details = getVariantDetails(row.variantId);
                                    const current = stockByVariant.get(row.variantId) ?? 0;
                                    const delta = deltaFor(row);

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
                                                    value={row.targetQuantity}
                                                    onChange={(e) =>
                                                        handleTargetChange(row.variantId, e.target.value)
                                                    }
                                                />
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
