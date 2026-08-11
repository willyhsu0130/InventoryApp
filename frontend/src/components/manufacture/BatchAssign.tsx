// src/components/manufacture/BatchAssign.tsx
import { useImperativeHandle, useState, useMemo } from "react";
import { CONTROL_INPUT, ERROR_PANEL, FIELD_LABEL } from "@/lib/styles";
import { useInventoryCatalog } from "@/hooks/useContexts";
import type { KatanaCreateBatchInput } from "@/models/katana/inventory";
import type { KatanaMOTraceabilityPayload } from "@/models/katana/manufacture";
import { Calendar as CalendarIcon, Plus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addYears, format, subDays } from "date-fns";

export interface BatchAssignHandle {
    submit: () => Promise<void>;
}

interface BatchAssignProps {
    variantId: number;
    quantity: number;
    onAssignBatch: (traceability: KatanaMOTraceabilityPayload[]) => void;
    ref?: React.Ref<BatchAssignHandle>;
}

export const BatchAssign = ({
    variantId,
    quantity,
    onAssignBatch,
    ref,
}: BatchAssignProps) => {
    // 1. Use the built-in catalog methods and state from InventoryContext
    const { batch, createBatch, loading } = useInventoryCatalog();

    // Filter available batches from context for the selected variantId
    const existingBatches = useMemo(() => {
        return Array.from(batch.values()).filter(
            (b) => b.variant_id === variantId
        );
    }, [batch, variantId]);

    const [selectedBatchId, setSelectedBatchId] = useState<number | null>(
        existingBatches.length > 0 ? existingBatches[0].id : null
    );
    const [error, setError] = useState<string | null>(null);

    // Toggle for creating a new batch vs selecting existing
    const [isCreatingNewBatch, setIsCreatingNewBatch] = useState<boolean>(false);
    const [batchCreatedDate] = useState(() => new Date());
    const defaultExpirationDate = subDays(addYears(batchCreatedDate, 2), 1);
    const [expirationDate, setExpirationDate] = useState<Date | undefined>(defaultExpirationDate);
    const [newBatchNumber, setNewBatchNumber] = useState(() =>
        `${format(batchCreatedDate, "yyyy/MM/dd")} - ${format(defaultExpirationDate, "yyyy/MM/dd")}`
    );
    const [isBatchNumberCustomized, setIsBatchNumberCustomized] = useState(false);

    // Calendar state for Expiration Date
    const [calendarOpen, setCalendarOpen] = useState<boolean>(false);

    const handleExpirationDateChange = (date: Date | undefined) => {
        setExpirationDate(date);
        setCalendarOpen(false);
        if (!isBatchNumberCustomized) {
            setNewBatchNumber(
                `${format(batchCreatedDate, "yyyy/MM/dd")} - ${date ? format(date, "yyyy/MM/dd") : "未設定"}`
            );
        }
    };

    const handleSubmit = async () => {
        setError(null);

        // Option A: Creating a new batch via built-in context function
        if (isCreatingNewBatch) {
            if (!newBatchNumber.trim()) {
                setError("請輸入新批號 (Batch number is required)。");
                return;
            }

            try {
                const payload: KatanaCreateBatchInput = {
                    batch_number: newBatchNumber.trim(),
                    variant_id: variantId,
                    batch_created_date: format(batchCreatedDate, "yyyy-MM-dd"),
                    expiration_date: expirationDate ? expirationDate.toISOString() : undefined,
                };

                const createdBatch = await createBatch(payload);

                if (!createdBatch) {
                    throw new Error("建立批號失敗。");
                }

                onAssignBatch([{ batch_id: createdBatch.id, quantity: String(quantity) }]);
                return;
            } catch (err) {
                const msg = err instanceof Error ? err.message : "建立批號失敗。";
                setError(msg);

            }
        }

        // Option B: Selected an existing batch
        if (!selectedBatchId) {
            setError("請選擇一個批號。");
            return;
        }

        onAssignBatch([{ batch_id: selectedBatchId, quantity: String(quantity) }]);
    };

    useImperativeHandle(ref, () => ({ submit: handleSubmit }));

    return (
        <div className="flex flex-col gap-y-4">
            {error && <div className={ERROR_PANEL}>{error}</div>}

            {!isCreatingNewBatch ? (
                <>
                    <div className="flex flex-col gap-y-1">
                        <label className={FIELD_LABEL}>選擇現有批號</label>
                        <select
                            className={CONTROL_INPUT}
                            value={selectedBatchId ?? ""}
                            onChange={(e) => setSelectedBatchId(Number(e.target.value))}
                            disabled={loading}
                        >
                            {loading && <option value="">讀取批號中...</option>}
                            {!loading && existingBatches.length === 0 && (
                                <option value="">尚無可用批號，請點擊下方新增</option>
                            )}
                            {existingBatches.map((b) => (
                                <option key={b.id} value={b.id}>
                                    批號: {b.batch_number}{" "}
                                    {b.expiration_date
                                        ? `(有效期限: ${b.expiration_date.split("T")[0]})`
                                        : ""}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsCreatingNewBatch(true)}
                        className="flex items-center gap-x-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium self-start"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        建立新批號 (Create New Batch)
                    </button>
                </>
            ) : (
                <>
                    <div className="flex flex-col gap-y-1">
                        <label className={FIELD_LABEL}>新批號號碼 *</label>
                        <input
                            type="text"
                            className={CONTROL_INPUT}
                            placeholder="例: BATCH-2026-001"
                            value={newBatchNumber}
                            onChange={(e) => {
                                setIsBatchNumberCustomized(true);
                                setNewBatchNumber(e.target.value);
                            }}
                        />
                    </div>

                    <div className="flex flex-col gap-y-1">
                        <label className={FIELD_LABEL}>有效期限 (Expiration Date)</label>
                        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                            <PopoverTrigger className="w-full justify-start text-left font-normal bg-background border border-input text-foreground hover:bg-muted rounded-md px-3 py-2 text-sm inline-flex items-center">
                                <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                {expirationDate ? format(expirationDate, "yyyy/MM/dd") : <span>選擇日期</span>}
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-popover border-border text-popover-foreground" align="start">
                                <Calendar
                                    mode="single"
                                    selected={expirationDate}
                                    onSelect={handleExpirationDateChange}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsCreatingNewBatch(false)}
                        className="text-xs text-slate-400 hover:text-slate-200 underline self-start mt-1"
                    >
                        ← 返回選擇現有批號
                    </button>
                </>
            )}
        </div>
    );
};