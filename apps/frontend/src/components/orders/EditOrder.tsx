import { useImperativeHandle, useEffect, useState, useMemo } from "react";
import { X, Calendar as CalendarIcon } from "lucide-react";
import { katanaFetch } from "@/lib/katanaFetch";
import { KATANA_API_ROUTES } from "@/lib/routes/routes";
import { CONTROL_INPUT, ERROR_PANEL, FIELD_LABEL } from "@/lib/styles";
import {
    useOrdersCatalog,
    useProductCatalog,
    useCustomersCatalog,
    useInventoryCatalog,
} from "@/hooks/useContexts";

import type { KatanaCustomer } from "@/models/katana/customers";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import type { KatanaLocation } from "@/models/katana/common";
import type { KatanaSalesOrderRow, KatanaSalesOrderStatus } from "@/models/katana/salesOrder";
import type { KatanaVariant } from "@/models/katana/productVariant";
import type { KatanaBatch } from "@/models/katana/inventory";
import { formatQuantity } from "@/lib/formatQuantity";


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
    batchAllocations: Array<{ batchId: number; quantity: number }>;
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

    const { orders, createOrder, editOrder, updateOrderRow } = useOrdersCatalog();
    const { products, getVariantDetails } = useProductCatalog();
    const { customers, loading: loadingCustomers, getCustomerName } = useCustomersCatalog();
    const { batch } = useInventoryCatalog();

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
    const [status, setStatus] = useState<KatanaSalesOrderStatus>(
        existingOrder?.status ?? "NOT_SHIPPED"
    );
    const [formError, setFormError] = useState<string | null>(null);

    // Order Rows state
    const [rows, setRows] = useState<OrderDraftRow[]>(() => {
        if (existingOrder?.sales_order_rows) {
            return existingOrder.sales_order_rows.map((row: KatanaSalesOrderRow) => ({
                variantId: row.variant_id,
                quantity: row.quantity,
                pricePerUnit: row.price_per_unit,
                batchAllocations: (row.traceability ?? [])
                    .filter((entry) => entry.batch_id != null)
                    .map((entry) => ({
                        batchId: entry.batch_id as number,
                        quantity: Number(entry.quantity),
                    })),
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
                batchAllocations: [],
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

    const handleRowBatchChange = (index: number, allocationIndex: number, batchId: number | null) => {
        setRows((prev) =>
            prev.map((row, i) => {
                if (i !== index) return row;
                const batchAllocations = [...row.batchAllocations];
                if (batchId === null) {
                    batchAllocations.splice(allocationIndex, 1);
                } else {
                    batchAllocations[allocationIndex] = {
                        batchId,
                        quantity: batchAllocations[allocationIndex]?.quantity ?? row.quantity,
                    };
                }
                return { ...row, batchAllocations };
            })
        );
    };

    const handleBatchAllocationQuantityChange = (
        rowIndex: number,
        allocationIndex: number,
        quantity: number
    ) => {
        setRows((prev) =>
            prev.map((row, index) => {
                if (index !== rowIndex) return row;
                const batchAllocations = [...row.batchAllocations];
                batchAllocations[allocationIndex] = {
                    ...batchAllocations[allocationIndex],
                    quantity: Math.max(0, quantity),
                };
                return { ...row, batchAllocations };
            })
        );
    };

    const addBatchAllocation = (rowIndex: number) => {
        setRows((prev) =>
            prev.map((row, index) =>
                index === rowIndex
                    ? {
                        ...row,
                        batchAllocations: [
                            ...row.batchAllocations,
                            { batchId: 0, quantity: 0 },
                        ],
                    }
                    : row
            )
        );
    };

    const getAvailableBatches = (variantId: number): KatanaBatch[] =>
        Array.from(batch.values()).filter((item) => item.variant_id === variantId);

    const getBatchQuantity = (batchItem: KatanaBatch): number =>
        Math.max(0, parseFloat(batchItem.quantity_in_stock ?? "0") || 0);

    const validateBatchAvailability = () => {
        for (const row of rows) {
            if (row.batchAllocations.length === 0) continue;

            const allocatedQuantity = row.batchAllocations.reduce((sum, allocation) => sum + allocation.quantity, 0);
            if (allocatedQuantity !== row.quantity) {
                return `商品需求 ${formatQuantity(row.quantity)}，但批次分配為 ${formatQuantity(allocatedQuantity)}。`;
            }

            for (const allocation of row.batchAllocations) {
                const selectedBatch = batch.get(allocation.batchId);
                if (!selectedBatch) return `找不到批次 ${allocation.batchId}，請重新選擇批次。`;
                if (getBatchQuantity(selectedBatch) < allocation.quantity) {
                    return `批次 ${selectedBatch.batch_number} 庫存不足：可用 ${formatQuantity(getBatchQuantity(selectedBatch))}，分配 ${formatQuantity(allocation.quantity)}。`;
                }
            }
        }

        return null;
    };

    const buildOrderRowPayload = (row: OrderDraftRow) => ({
        variant_id: row.variantId,
        quantity: row.quantity,
        price_per_unit: parseFloat(row.pricePerUnit) || 0,
    });

    const updateRowTraceability = async (
        orderRows: KatanaSalesOrderRow[],
        draftRows: OrderDraftRow[]
    ) => {
        await Promise.all(
            orderRows.map((orderRow, index) =>
                updateOrderRow(orderRow.id, {
                    traceability:
                        draftRows[index]?.batchAllocations.length === 0
                            ? []
                            : draftRows[index].batchAllocations.map((allocation) => ({
                                batch_id: allocation.batchId,
                                quantity: String(allocation.quantity),
                            })),
                })
            )
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

        const batchError = validateBatchAvailability();
        if (batchError) {
            setFormError(batchError);
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
                    status,
                    sales_order_rows: rows.map(buildOrderRowPayload),
                });

                await updateRowTraceability(created.sales_order_rows, rows);
                onCreated?.(created.id);
            } else {
                // Existing order metadata update (PATCH)
                const updated = await editOrder(id, {
                    customer_id: customerId,
                    location_id: locationId,
                    order_no: orderNo.trim() || undefined,
                    delivery_date: deliveryDate ? deliveryDate.toISOString() : undefined,
                    additional_info: reason.trim() || undefined,
                    status,
                });
                await updateRowTraceability(updated.sales_order_rows, rows);
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                <div className="flex flex-col gap-y-1">
                    <label className={FIELD_LABEL}>訂單狀態</label>
                    <select
                        className={CONTROL_INPUT}
                        value={status}
                        onChange={(event) => setStatus(event.target.value as KatanaSalesOrderStatus)}
                    >
                        <option value="NOT_SHIPPED">未出貨</option>
                        <option value="PENDING">待處理</option>
                        <option value="PARTIALLY_PACKED">部分包裝</option>
                        <option value="PACKED">已包裝</option>
                        <option value="PARTIALLY_DELIVERED">部分交貨</option>
                        <option value="DELIVERED">已交貨 / 完成</option>
                        <option value="CANCELLED">已取消</option>
                    </select>
                </div>

                {/* Delivery Date */}
                <div className="flex flex-col gap-y-1">
                    <label className={FIELD_LABEL}>預計交貨日</label>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <PopoverTrigger
                            render={
                                <Button
                                    variant="outline"
                                    className="w-full justify-start text-left font-normal bg-background border border-input text-foreground hover:bg-muted"
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                                    {deliveryDate ? format(deliveryDate, "yyyy/MM/dd") : <span>選擇日期</span>}
                                </Button>
                            }
                        />
                        <PopoverContent className="w-auto p-0 bg-popover border-border text-popover-foreground" align="start">
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
            <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-left text-sm text-foreground">
                    <thead className="bg-muted text-muted-foreground font-medium text-xs uppercase tracking-wider">
                        <tr>
                            <th className="py-3 px-4 border-b border-slate-800">商品 / 規格</th>
                            <th className="py-3 px-4 border-b border-slate-800 text-right w-28">數量</th>
                            <th className="py-3 px-4 border-b border-slate-800 text-right w-36">單價 ($)</th>
                            <th className="py-3 px-4 border-b border-slate-800 text-right w-36">小計 ($)</th>
                            <th className="py-3 px-4 border-b border-slate-800 min-w-80">批次</th>
                            <th className="py-3 px-4 border-b border-slate-800 w-10" />
                        </tr>
                    </thead>
                    <tbody className="font-mono text-xs">
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-8 text-center text-muted-foreground font-sans">
                                    請在下方選單新增訂單商品。
                                </td>
                            </tr>
                        ) : (
                            rows.map((row, index) => {
                                const details = getVariantDetails(row.variantId);
                                const rowSubtotal = (row.quantity || 0) * (parseFloat(row.pricePerUnit) || 0);
                                const availableBatchesForRow = getAvailableBatches(row.variantId);
                                const allocatedQuantity = row.batchAllocations.reduce(
                                    (sum, allocation) => sum + allocation.quantity,
                                    0
                                );

                                return (
                                    <tr key={`${row.variantId}-${index}`} className="border-b border-border/60">
                                        <td className="py-2.5 px-4 font-sans">
                                            <div className="font-medium text-foreground">
                                                {details?.product_name ?? `Variant #${row.variantId}`}
                                            </div>
                                            {details?.variant_details && (
                                                <div className="text-xs text-muted-foreground mt-0.5">
                                                    {details.variant_details}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-2.5 px-4 text-right">
                                            <input
                                                type="number"
                                                min="1"
                                                className="w-20 text-right bg-background border border-input focus:border-ring rounded px-2 py-1 text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 transition"
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
                                                className="w-28 text-right bg-background border border-input focus:border-ring rounded px-2 py-1 text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 transition"
                                                value={row.pricePerUnit}
                                                onChange={(e) => handleRowPriceChange(index, e.target.value)}
                                                disabled={!isCreating}
                                            />
                                        </td>
                                        <td className="py-2.5 px-4 text-right font-medium text-emerald-400">
                                            ${rowSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-2.5 px-4">
                                            <div className="space-y-2">
                                                {row.batchAllocations.map((allocation, allocationIndex) => {
                                                    const selectedBatch = batch.get(allocation.batchId);
                                                    const availableQuantity = selectedBatch
                                                        ? getBatchQuantity(selectedBatch)
                                                        : 0;
                                                    return (
                                                        <div className="flex min-w-0 flex-col gap-2" key={`${index}-${allocationIndex}`}>
                                                            <select
                                                                className={`${CONTROL_INPUT} w-full`}
                                                                value={allocation.batchId || ""}
                                                                onChange={(event) =>
                                                                    handleRowBatchChange(
                                                                        index,
                                                                        allocationIndex,
                                                                        event.target.value ? Number(event.target.value) : null
                                                                    )
                                                                }
                                                            >
                                                                <option value="">未分配批次</option>
                                                                {availableBatchesForRow.map((availableBatch) => (
                                                                    <option key={availableBatch.id} value={availableBatch.id}>
                                                                        {availableBatch.batch_number}（可用 {formatQuantity(getBatchQuantity(availableBatch))}）
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            {selectedBatch && (
                                                                <div className="break-words rounded-md border border-border/60 bg-muted/40 px-2 py-1 text-xs text-foreground" title={selectedBatch.batch_number}>
                                                                    <span className="font-medium">批號：{selectedBatch.batch_number}</span>
                                                                    <span className="ml-2 text-muted-foreground">
                                                                        剩餘 {formatQuantity(availableQuantity)}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <div className="flex items-center gap-2">
                                                                <label className="text-xs text-muted-foreground">分配</label>
                                                                <input
                                                                    aria-label="批次分配數量"
                                                                    className="w-24 rounded border border-input bg-background px-2 py-1 text-right text-foreground"
                                                                    min="0"
                                                                    step="any"
                                                                    type="number"
                                                                    value={allocation.quantity}
                                                                    onChange={(event) =>
                                                                        handleBatchAllocationQuantityChange(
                                                                            index,
                                                                            allocationIndex,
                                                                            Number(event.target.value) || 0
                                                                        )
                                                                    }
                                                                />
                                                                <button
                                                                    type="button"
                                                                    className="text-xs text-destructive"
                                                                    onClick={() => handleRowBatchChange(index, allocationIndex, null)}
                                                                >
                                                                    移除
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                <button
                                                    type="button"
                                                    className="text-xs text-primary hover:underline"
                                                    onClick={() => addBatchAllocation(index)}
                                                >
                                                    + 新增批次
                                                </button>
                                                <div className={`text-xs ${allocatedQuantity === row.quantity ? "text-muted-foreground" : "text-destructive"}`}>
                                                    已分配 {formatQuantity(allocatedQuantity)} / 訂單需求 {formatQuantity(row.quantity)}
                                                </div>
                                            </div>
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
                        <tfoot className="bg-muted/60 font-semibold text-foreground text-xs">
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