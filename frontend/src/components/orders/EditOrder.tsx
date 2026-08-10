import { useImperativeHandle, useEffect, useState, useMemo } from "react";
import { X, Calendar as CalendarIcon } from "lucide-react";
import { katanaFetch } from "@/lib/katanaFetch";
import { KATANA_API_ROUTES } from "@/lib/routes/routes";
import { CONTROL_INPUT, ERROR_PANEL, FIELD_LABEL } from "@/lib/styles";
import {
    useOrdersCatalog,
    useProductCatalog,
    useCustomersCatalog,
} from "@/hooks/useContexts";

import type { KatanaCustomer } from "@/models/katana/customers";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import type { KatanaLocation } from "@/models/katana/common";
import type { KatanaSalesOrderRow } from "@/models/katana/salesOrder";
import type { KatanaVariant } from "@/models/katana/productVariant";

export interface EditOrderHandle {
    /** Persists an unsaved draft. No-op once the order exists. */
    submit: () => Promise<void>;
}

interface EditOrderProps {
    id: number | -1;
    onSavingChange?: (isSaving: boolean) => void;
    /** Called with the new order id once a draft has been created. */
    onCreated?: (orderId: number) => void;
    ref?: React.Ref<EditOrderHandle>;
}

interface OrderDraftRow {
    variantId: number;
    quantity: number;
    pricePerUnit: string;
}
interface CustomerOption {
    id: number;
    displayName: string;
}

export const EditOrder = ({
    id,
    onSavingChange,
    onCreated,
    ref,
}: EditOrderProps) => {
    // -1 means "not in Katana yet": stays local until handleCreate (POST).
    const isCreating = id === -1;

    const { orders, createOrder, editOrder } = useOrdersCatalog();
    const { products, getVariantDetails } = useProductCatalog();
    const { customers, loading: loadingCustomers, getCustomerName } = useCustomersCatalog();

    const existingOrder = !isCreating ? orders.get(id) : null;

    // Form state
    const [locations, setLocations] = useState<KatanaLocation[]>([]);
    const [locationId, setLocationId] = useState<number | null>(existingOrder?.location_id ?? null);
    const [orderNo, setOrderNo] = useState<string>(existingOrder?.order_no ?? "");
    const [customerId, setCustomerId] = useState<number | null>(existingOrder?.customer_id ?? null);
    const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(
        existingOrder?.delivery_date ? new Date(existingOrder.delivery_date) : undefined
    );
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [reason, setReason] = useState<string>(existingOrder?.additional_info ?? "");
    const [formError, setFormError] = useState<string | null>(null);

    // Order Rows state
    const [rows, setRows] = useState<OrderDraftRow[]>(() => {
        if (existingOrder?.sales_order_rows) {
            return existingOrder.sales_order_rows.map((row: KatanaSalesOrderRow) => ({
                variantId: row.variant_id,
                quantity: row.quantity,
                pricePerUnit: row.price_per_unit,
            }));
        }
        return [];
    });

    // Load available locations on mount
    useEffect(() => {
        let isMounted = true;
        const loadLocations = async () => {
            const res = await katanaFetch<KatanaLocation[]>(KATANA_API_ROUTES.LOCATIONS);
            if (!isMounted) return;

            if (res.success && Array.isArray(res.data)) {
                setLocations(res.data);
                const preferred = res.data.find((loc) => loc.is_primary) ?? res.data[0];
                setLocationId((current) => current ?? preferred?.id ?? null);
            }
        };

        loadLocations();
        return () => {
            isMounted = false;
        };
    }, []);

    // Flatten customer map into array for select input options
    const customerOptions = useMemo<CustomerOption[]>(() => {
        const customerArray: KatanaCustomer[] = Array.from(customers.values());

        return customerArray
            .map((cust: KatanaCustomer): CustomerOption => ({
                id: cust.id,
                displayName: getCustomerName(cust.id),
            }))
            .sort((a: CustomerOption, b: CustomerOption) =>
                a.displayName.localeCompare(b.displayName)
            );
    }, [customers, getCustomerName]);

    // Flatten available product variants for the dropdown selector
    const availableVariants = useMemo(() => {
        const list: Array<{ variantId: number; label: string; price: number }> = [];

        products.forEach((product) => {
            const variants = product?.variants
            variants?.forEach((variant: KatanaVariant) => {
                const details = getVariantDetails(variant.id);
                const label = details.variant_details
                    ? `${details.product_name} - ${details.variant_details}`
                    : details.product_name;

                list.push({
                    variantId: variant.id,
                    label,
                    price: variant.sales_price ?? 0,
                });
            });
        });

        return list.sort((a, b) => a.label.localeCompare(b.label));
    }, [products, getVariantDetails]);

    const handleAddRow = (variantId: number) => {
        setFormError(null);
        const match = availableVariants.find((v) => v.variantId === variantId);
        setRows((prev) => [
            ...prev,
            {
                variantId,
                quantity: 1,
                pricePerUnit: (match?.price ?? 0).toString(),
            },
        ]);
    };

    const handleRemoveRow = (index: number) => {
        setRows((prev) => prev.filter((_, i) => i !== index));
    };

    const handleRowQuantityChange = (index: number, quantity: number) => {
        setRows((prev) =>
            prev.map((row, i) => (i === index ? { ...row, quantity } : row))
        );
    };

    const handleRowPriceChange = (index: number, pricePerUnit: string) => {
        setRows((prev) =>
            prev.map((row, i) => (i === index ? { ...row, pricePerUnit } : row))
        );
    };

    const calculatedTotal = useMemo(() => {
        return rows.reduce((sum, row) => {
            const qty = row.quantity || 0;
            const price = parseFloat(row.pricePerUnit) || 0;
            return sum + qty * price;
        }, 0);
    }, [rows]);

    const handleSubmit = async () => {
        if (!customerId) {
            setFormError("請選擇客戶 (Customer is required)。");
            return;
        }

        if (!locationId) {
            setFormError("請選擇出貨倉庫。");
            return;
        }

        if (rows.length === 0) {
            setFormError("請至少新增一項訂單商品。");
            return;
        }

        setFormError(null);
        onSavingChange?.(true);

        try {
            if (isCreating) {
                // Draft creation (POST)
                const created = await createOrder({
                    customer_id: customerId,
                    location_id: locationId,
                    order_no: orderNo.trim() || undefined,
                    delivery_date: deliveryDate ? deliveryDate.toISOString() : undefined,
                    additional_info: reason.trim() || undefined,
                    sales_order_rows: rows.map((r) => ({
                        variant_id: r.variantId,
                        quantity: r.quantity,
                        price_per_unit: parseFloat(r.pricePerUnit) || 0,
                    })),
                });

                onCreated?.(created.id);
            } else {
                // Existing order metadata update (PATCH)
                await editOrder(id, {
                    customer_id: customerId,
                    location_id: locationId,
                    order_no: orderNo.trim() || undefined,
                    delivery_date: deliveryDate ? deliveryDate.toISOString() : undefined,
                    additional_info: reason.trim() || undefined,
                });
            }
        } catch (err) {
            console.error("Failed to save order:", err);
            setFormError(err instanceof Error ? err.message : "儲存訂單失敗。");
        } finally {
            onSavingChange?.(false);
        }
    };

    useImperativeHandle(ref, () => ({ submit: handleSubmit }));

    return (
        <div className="flex flex-col gap-y-5">
            {formError && <div className={ERROR_PANEL}>{formError}</div>}

            <div className="grid grid-cols-3 gap-4">
                {/* Order No */}
                <div className="flex flex-col gap-y-1">
                    <label className={FIELD_LABEL}>訂單編號 (選填)</label>
                    <input
                        type="text"
                        className={CONTROL_INPUT}
                        placeholder="例: SO-1 (留空自動生成)"
                        value={orderNo}
                        onChange={(e) => setOrderNo(e.target.value)}
                    />
                </div>

                {/* Customer Dropdown */}
                <div className="flex flex-col gap-y-1">
                    <label className={FIELD_LABEL}>客戶</label>
                    <select
                        className={CONTROL_INPUT}
                        value={customerId ?? ""}
                        onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : null)}
                    >
                        <option value="">
                            {loadingCustomers ? "載入客戶清單中..." : "選擇客戶..."}
                        </option>
                        {customerOptions.map((cust) => (
                            <option key={cust.id} value={cust.id}>
                                {cust.displayName}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Location */}
                <div className="flex flex-col gap-y-1">
                    <label className={FIELD_LABEL}>出貨倉庫</label>
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

                {/* Delivery Date */}
                <div className="flex flex-col gap-y-1">
                    <label className={FIELD_LABEL}>預計交貨日</label>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <PopoverTrigger>
                            <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal bg-slate-900 border-slate-700 text-slate-100 hover:bg-slate-800"
                            >
                                <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                                {deliveryDate ? format(deliveryDate, "yyyy/MM/dd") : <span>選擇日期</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-800 text-slate-100" align="start">
                            <Calendar
                                mode="single"
                                selected={deliveryDate}
                                onSelect={(date) => {
                                    setDeliveryDate(date);
                                    setCalendarOpen(false);
                                }}
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Note/Reason */}
                <div className="flex flex-col gap-y-1 col-span-2">
                    <label className={FIELD_LABEL}>備註 / 附加資訊 (選填)</label>
                    <input
                        type="text"
                        className={CONTROL_INPUT}
                        placeholder="例: 客戶指定上午送達"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                    />
                </div>
            </div>

            {/* Order Items Table */}
            <div className="rounded-lg border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 font-medium text-xs uppercase tracking-wider">
                        <tr>
                            <th className="py-3 px-4 border-b border-slate-800">商品 / 規格</th>
                            <th className="py-3 px-4 border-b border-slate-800 text-right w-28">數量</th>
                            <th className="py-3 px-4 border-b border-slate-800 text-right w-36">單價 ($)</th>
                            <th className="py-3 px-4 border-b border-slate-800 text-right w-36">小計 ($)</th>
                            <th className="py-3 px-4 border-b border-slate-800 w-10" />
                        </tr>
                    </thead>
                    <tbody className="font-mono text-xs">
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">
                                    請在下方選單新增訂單商品。
                                </td>
                            </tr>
                        ) : (
                            rows.map((row, index) => {
                                const details = getVariantDetails(row.variantId);
                                const rowSubtotal = (row.quantity || 0) * (parseFloat(row.pricePerUnit) || 0);

                                return (
                                    <tr key={`${row.variantId}-${index}`} className="border-b border-slate-800/40">
                                        <td className="py-2.5 px-4 font-sans">
                                            <div className="font-medium text-slate-100">
                                                {details?.product_name ?? `Variant #${row.variantId}`}
                                            </div>
                                            {details?.variant_details && (
                                                <div className="text-xs text-slate-400 mt-0.5">
                                                    {details.variant_details}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-2.5 px-4 text-right">
                                            <input
                                                type="number"
                                                min="1"
                                                className="w-20 text-right bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded px-2 py-1 text-slate-100 focus:outline-none transition"
                                                value={row.quantity}
                                                onChange={(e) =>
                                                    handleRowQuantityChange(index, Math.max(1, parseInt(e.target.value) || 1))
                                                }
                                                disabled={!isCreating}
                                            />
                                        </td>
                                        <td className="py-2.5 px-4 text-right">
                                            <input
                                                type="number"
                                                step="any"
                                                min="0"
                                                className="w-28 text-right bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded px-2 py-1 text-slate-100 focus:outline-none transition"
                                                value={row.pricePerUnit}
                                                onChange={(e) => handleRowPriceChange(index, e.target.value)}
                                                disabled={!isCreating}
                                            />
                                        </td>
                                        <td className="py-2.5 px-4 text-right font-medium text-emerald-400">
                                            ${rowSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-2.5 px-4 text-right">
                                            {isCreating && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveRow(index)}
                                                    className="text-slate-500 hover:text-red-400 p-1"
                                                    title="移除"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                    {rows.length > 0 && (
                        <tfoot className="bg-slate-950/60 font-semibold text-slate-200 text-xs">
                            <tr>
                                <td colSpan={3} className="py-3 px-4 text-right font-sans">
                                    訂單總計：
                                </td>
                                <td className="py-3 px-4 text-right text-emerald-400 font-mono text-sm">
                                    ${calculatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td />
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            {/* Add Product Selector (Only active in creation mode) */}
            {isCreating && (
                <div className="flex flex-col gap-y-1">
                    <label className={FIELD_LABEL}>新增訂單商品</label>
                    <select
                        className={CONTROL_INPUT}
                        value=""
                        onChange={(e) => {
                            if (e.target.value) handleAddRow(Number(e.target.value));
                        }}
                    >
                        <option value="">選擇要新增的商品款式...</option>
                        {availableVariants.map((v) => (
                            <option key={v.variantId} value={v.variantId}>
                                {v.label} (單價: ${v.price})
                            </option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );
};