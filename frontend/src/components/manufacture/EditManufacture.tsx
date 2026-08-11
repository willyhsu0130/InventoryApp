// src/components/manufacture/EditManufacture.tsx
import { useImperativeHandle, useEffect, useMemo, useState, useRef } from "react";
import { CONTROL_INPUT, ERROR_PANEL, FIELD_LABEL, PRIMARY_BUTTON } from "@/lib/styles";
import { useInventoryCatalog, useManufactureCatalog, useProductCatalog } from "@/hooks/useContexts";
import { EditModal } from "@/components/EditModal";
import { BatchAssign, type BatchAssignHandle } from "./BatchAssign";
import { katanaFetch } from "@/lib/katanaFetch";
import { KATANA_API_ROUTES } from "@/lib/routes/routes";
import type { KatanaLocation } from "@/models/katana/common";
import type {
    KatanaManufacturingOrderDraft,
    KatanaManufacturingOrderStatus,
    KatanaMOTraceabilityPayload,
} from "@/models/katana/manufacture";
import { Calendar as CalendarIcon, Layers } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import type { KatanaVariant } from "@/models/katana/productVariant";
import { InlineInput } from "../InlineInput";

export interface EditManufactureHandle {
    submit: () => Promise<void>;
}

interface EditManufactureProps {
    id: number | -1;
    onSavingChange?: (isSaving: boolean) => void;
    onSuccess: () => void;
    ref?: React.Ref<EditManufactureHandle>;
}

export const EditManufacture = ({
    id,
    onSavingChange,
    onSuccess,
    ref,
}: EditManufactureProps) => {
    const isCreating = id === -1;

    const { manufactureOrders, createMO, editMO } = useManufactureCatalog();
    const { products, getVariantDetails } = useProductCatalog();
    const { batch } = useInventoryCatalog()

    const existingMO = !isCreating ? manufactureOrders.get(id) : null;

    const [locations, setLocations] = useState<KatanaLocation[]>([]);
    const [locationId, setLocationId] = useState<number | null>(existingMO?.location_id ?? null);
    const [variantId, setVariantId] = useState<number | null>(existingMO?.variant_id ?? null);
    const [orderNo, setOrderNo] = useState<string>(existingMO?.order_no ?? "");
    const [plannedQuantity, setPlannedQuantity] = useState<number>(
        existingMO?.planned_quantity ?? 1
    );
    const [status, setStatus] = useState<KatanaManufacturingOrderStatus>(
        existingMO?.status ?? "NOT_STARTED"
    );
    const [deadlineDate, setDeadlineDate] = useState<Date | undefined>(
        existingMO?.production_deadline_date
            ? new Date(existingMO.production_deadline_date)
            : undefined
    );
    const [calendarOpen, setCalendarOpen] = useState<boolean>(false);
    const [additionalInfo, setAdditionalInfo] = useState<string>(
        existingMO?.additional_info ?? ""
    );
    const [formError, setFormError] = useState<string | null>(null);

    // Batch Assignment
    const batchAssignRef = useRef<BatchAssignHandle>(null);
    const [batchModalOpen, setBatchModalOpen] = useState(false);
    const [isSavingBatch, setIsSavingBatch] = useState(false);
    const [traceability, setTraceability] = useState<KatanaMOTraceabilityPayload[]>(
        existingMO?.traceability ?? []
    );

    // Check if selected variant is batch tracked
    const isBatchTracked = useMemo(() => {
        if (!variantId) return false;
        const details = getVariantDetails(variantId);
        return details?.batch_tracked ?? false;
    }, [variantId, getVariantDetails]);

    useEffect(() => {
        let isMounted = true;
        const loadLocations = async () => {
            const res = await katanaFetch<KatanaLocation[]>(KATANA_API_ROUTES.LOCATIONS);
            if (!isMounted) return;

            if (res.success && Array.isArray(res.data)) {
                const mfgLocations = res.data.filter((loc) => loc.manufacturing_allowed);
                setLocations(mfgLocations.length > 0 ? mfgLocations : res.data);

                const preferred = mfgLocations.find((loc) => loc.is_primary) ?? mfgLocations[0];
                setLocationId((current) => current ?? preferred?.id ?? null);
            }
        };

        loadLocations();
        return () => {
            isMounted = false;
        };
    }, []);

    const availableVariants = useMemo(() => {
        const list: Array<{ variantId: number; label: string }> = [];

        products.forEach((product) => {
            product.variants?.forEach((variant: KatanaVariant) => {
                const details = getVariantDetails(variant.id);
                const label = details.variant_details
                    ? `${details.product_name} - ${details.variant_details}`
                    : details.product_name;

                list.push({ variantId: variant.id, label });
            });
        });

        return list.sort((a, b) => a.label.localeCompare(b.label));
    }, [products, getVariantDetails]);

    const handleSubmit = async () => {
        if (!variantId) {
            setFormError("請選擇要生產的商品款式。");
            return;
        }

        if (!locationId) {
            setFormError("請選擇生產工廠倉庫。");
            return;
        }

        if (plannedQuantity <= 0) {
            setFormError("計畫生產數量必須大於 0。");
            return;
        }

        setFormError(null);
        onSavingChange?.(true);

        try {
            const draftPayload: KatanaManufacturingOrderDraft = {
                variant_id: variantId,
                location_id: locationId,
                planned_quantity: plannedQuantity,
                order_no: orderNo.trim() || undefined,
                status,
                // Only include deadline date if user explicitly picked one AND we aren't restricted
                // Omit production_deadline_date when automatic deadline management is enabled in Katana
                // production_deadline_date: deadlineDate ? deadlineDate.toISOString() : undefined,
                additional_info: additionalInfo.trim() || undefined,
                traceability: traceability.length > 0 ? traceability : undefined,
            };

            // If creating a new order, drop production_deadline_date to prevent 422 error
            if (isCreating) {
                delete draftPayload.production_deadline_date;
                await createMO(draftPayload);
            } else {
                await editMO(id, draftPayload);
            }

            onSuccess();
        } catch (err) {
            console.error("Failed to save manufacture order:", err);
            setFormError(err instanceof Error ? err.message : "儲存製造工單失敗。");
        } finally {
            onSavingChange?.(false);
        }
    };

    useImperativeHandle(ref, () => ({ submit: handleSubmit }));

    return (
        <div className="flex flex-col gap-y-5">
            {formError && <div className={ERROR_PANEL}>{formError}</div>}

            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-y-1">
                    <label className={FIELD_LABEL}>工單編號 (選填)</label>
                    <input
                        type="text"
                        className={CONTROL_INPUT}
                        placeholder="例: MO-1 (留空自動生成)"
                        value={orderNo}
                        onChange={(e) => setOrderNo(e.target.value)}
                    />
                </div>

                <div className="flex flex-col gap-y-1">
                    <label className={FIELD_LABEL}>工單狀態</label>
                    <select
                        className={CONTROL_INPUT}
                        value={status}
                        onChange={(e) => setStatus(e.target.value as KatanaManufacturingOrderStatus)}
                    >
                        <option value="NOT_STARTED">未開始</option>
                        <option value="IN_PROGRESS">進行中</option>
                        <option value="BLOCKED">已阻塞</option>
                        <option value="DONE">已完工</option>
                    </select>
                </div>

                <div className="flex flex-col gap-y-1 col-span-2">
                    <label className={FIELD_LABEL}>目標生產商品 / 規格 *</label>
                    <select
                        className={CONTROL_INPUT}
                        value={variantId ?? ""}
                        onChange={(e) => {
                            setVariantId(e.target.value ? Number(e.target.value) : null);
                            setTraceability([]);
                        }}
                    >
                        <option value="">選擇要生產的產品款式...</option>
                        {availableVariants.map((v) => (
                            <option key={v.variantId} value={v.variantId}>
                                {v.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* FIX 3: Batch Assign Banner / Trigger Button */}
                {isBatchTracked && (
                    <div className="col-span-2 bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-x-2 text-xs text-slate-300">
                            <Layers className="w-4 h-4 text-emerald-400" />
                            <span>
                                {traceability.length > 0 && traceability[0].batch_id
                                    ? `已指派批號名稱: ${batch.get(traceability[0].batch_id)?.batch_number}`
                                    : "此商品需追蹤批號 (Batch Tracked)"}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setBatchModalOpen(true)}
                            className={PRIMARY_BUTTON}
                        >
                            {traceability.length > 0 ? "變更批號" : "指派 / 建立批號"}
                        </button>
                    </div>
                )}

                <div className="flex flex-col gap-y-1">
                    <label className={FIELD_LABEL}>計畫生產數量 *</label>
                    <InlineInput<number>
                        type="number"
                        value={plannedQuantity}
                        className={CONTROL_INPUT}
                        onCommit={(newValue) => setPlannedQuantity(Math.max(1, newValue))}
                        formatter={(val) => `${val}`}
                    />
                </div>

                <div className="flex flex-col gap-y-1">
                    <label className={FIELD_LABEL}>生產工廠倉庫 *</label>
                    <select
                        className={CONTROL_INPUT}
                        value={locationId ?? ""}
                        onChange={(e) => setLocationId(Number(e.target.value))}
                    >
                        {locations.length === 0 && <option value="">讀取中...</option>}
                        {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                                {loc.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col gap-y-1 col-span-2">
                    <label className={FIELD_LABEL}>預計生產截止日</label>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <PopoverTrigger className="w-full justify-start text-left font-normal bg-slate-900 border border-slate-700 text-slate-100 hover:bg-slate-800 rounded-md px-3 py-2 text-sm inline-flex items-center">
                            <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                            {deadlineDate ? format(deadlineDate, "yyyy/MM/dd") : <span>選擇日期</span>}
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-800 text-slate-100" align="start">
                            <Calendar
                                mode="single"
                                selected={deadlineDate}
                                onSelect={(date) => {
                                    setDeadlineDate(date);
                                    setCalendarOpen(false);
                                }}
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="flex flex-col gap-y-1 col-span-2">
                    <label className={FIELD_LABEL}>製造指示 / 備註資訊</label>
                    <textarea
                        rows={3}
                        className={CONTROL_INPUT}
                        placeholder="輸入關於此工單的特殊生產指示或注意事項..."
                        value={additionalInfo}
                        onChange={(e) => setAdditionalInfo(e.target.value)}
                    />
                </div>
            </div>

            {/* Batch Assign Modal */}
            <EditModal
                isOpen={batchModalOpen}
                title="指派 / 建立批號"
                showSaveButton={true}
                isSaving={isSavingBatch}
                onClose={() => setBatchModalOpen(false)}
                onSave={async () => {
                    setIsSavingBatch(true);
                    try {
                        await batchAssignRef.current?.submit();
                        setBatchModalOpen(false);
                    } finally {
                        setIsSavingBatch(false);
                    }
                }}
            >
                {variantId && (
                    <BatchAssign
                        ref={batchAssignRef}
                        variantId={variantId}
                        quantity={plannedQuantity}
                        onAssignBatch={(assignedTraceability) => {
                            setTraceability(assignedTraceability);
                            setFormError(null);
                        }}
                    />
                )}
            </EditModal>
        </div>
    );
};