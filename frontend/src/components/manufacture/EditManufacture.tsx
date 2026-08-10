import { useImperativeHandle, useState, useEffect, useMemo } from "react";
import { CONTROL_INPUT, ERROR_PANEL, FIELD_LABEL } from "@/lib/styles";
import { useManufactureCatalog, useProductCatalog } from "@/hooks/useContexts";
import { katanaFetch } from "@/lib/katanaFetch";
import { KATANA_API_ROUTES } from "@/lib/routes/routes";
import type { KatanaLocation } from "@/models/katana/common";
import type {
    KatanaManufacturingOrderDraft,
    KatanaManufacturingOrderStatus,
} from "@/models/katana/manufacture";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import type { KatanaVariant } from "@/models/katana/productVariant";

export interface EditManufactureHandle {
    submit: () => Promise<void>;
}

interface EditManufactureProps {
    id: number | -1;
    onSavingChange?: (isSaving: boolean) => void;
    onCreated?: (moId: number) => void;
    ref?: React.Ref<EditManufactureHandle>;
}

export const EditManufacture = ({
    id,
    onSavingChange,
    onCreated,
    ref,
}: EditManufactureProps) => {
    const isCreating = id === -1;

    const { manufactureOrders, createMO, editMO } = useManufactureCatalog();
    const { products, getVariantDetails } = useProductCatalog();

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
                production_deadline_date: deadlineDate ? deadlineDate.toISOString() : undefined,
                additional_info: additionalInfo.trim() || undefined,
            };

            if (isCreating) {
                const created = await createMO(draftPayload);
                onCreated?.(created.id);
            } else {
                await editMO(id, draftPayload);
            }
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
                        <option value="NOT_STARTED">未開始 (NOT_STARTED)</option>
                        <option value="IN_PROGRESS">進行中 (IN_PROGRESS)</option>
                        <option value="BLOCKED">已阻塞 (BLOCKED)</option>
                        <option value="DONE">已完工 (DONE)</option>
                    </select>
                </div>

                <div className="flex flex-col gap-y-1 col-span-2">
                    <label className={FIELD_LABEL}>目標生產商品 / 規格 *</label>
                    <select
                        className={CONTROL_INPUT}
                        value={variantId ?? ""}
                        onChange={(e) => setVariantId(e.target.value ? Number(e.target.value) : null)}
                        disabled={!isCreating}
                    >
                        <option value="">選擇要生產的產品款式...</option>
                        {availableVariants.map((v) => (
                            <option key={v.variantId} value={v.variantId}>
                                {v.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col gap-y-1">
                    <label className={FIELD_LABEL}>計畫生產數量 *</label>
                    <input
                        type="number"
                        min="1"
                        className={CONTROL_INPUT}
                        value={plannedQuantity}
                        onChange={(e) => setPlannedQuantity(Math.max(1, parseInt(e.target.value) || 1))}
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
        </div>
    );
};