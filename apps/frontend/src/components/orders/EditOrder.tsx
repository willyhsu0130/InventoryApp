// src/components/orders/EditOrder.tsx
import {
    useImperativeHandle,
    useEffect,
    useState,
    useMemo,
    type FC,
    type Ref,
} from "react";
import { X, Loader2 } from "lucide-react";
import { CONTROL_INPUT, ERROR_PANEL, FIELD_LABEL } from "@/lib/styles";
import type {
    Customer,
    Location,
    Product,
    Variant,
    Batch,
    CreateSalesOrderPayload,
} from "@my-inventory-app/shared";
import {
    createSalesOrder,
    getSalesOrderById,
    updateSalesOrderStatus,
} from "@/services/salesOrderService";
import { getCustomers } from "@/services/customerService";
import { getLocations } from "@/services/locationService";
import { getActiveProducts } from "@/services/productService";
import { getActiveVariants } from "@/services/variantService";
import { getBatchesByVariantId } from "@/services/batchService";

export interface EditOrderHandle {
    submit: () => Promise<void>;
}

interface EditOrderProps {
    id: number;
    onSavingChange?: (isSaving: boolean) => void;
    onCreated?: (orderId: number) => void;
    ref?: Ref<EditOrderHandle>;
}

interface OrderDraftRow {
    variantId: number;
    batchId: number | null;
    quantity: number;
    pricePerUnit: string;
}

interface VariantSelectOption {
    variantId: number;
    productId: number;
    label: string;
    price: number;
    isBatchTracked: boolean;
}

export const EditOrder: FC<EditOrderProps> = ({
    id,
    onSavingChange,
    onCreated,
    ref,
}) => {
    const isCreating = id <= 0;

    // Loading & Error States
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [formError, setFormError] = useState<string | null>(null);

    // Metadata Collections
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [variants, setVariants] = useState<Variant[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [variantBatchesMap, setVariantBatchesMap] = useState<Record<number, Batch[]>>({});

    // Form Header State
    const [customerId, setCustomerId] = useState<number | null>(null);
    const [locationId, setLocationId] = useState<number | null>(null);
    const [status, setStatus] = useState<"PENDING" | "COMPLETED">("PENDING");
    const [initialStatus, setInitialStatus] = useState<"PENDING" | "COMPLETED">("PENDING");

    // Line Items State
    const [rows, setRows] = useState<OrderDraftRow[]>([]);

    // 1. Initial Data Fetching (Entities & Existing Order)
    useEffect(() => {
        let isMounted = true;

        const loadInitialData = async () => {
            setIsLoading(true);
            setFormError(null);

            try {
                const [
                    customersData,
                    locationsData,
                    variantsData,
                    productsData,
                    orderData,
                ] = await Promise.all([
                    getCustomers().catch(() => [] as Customer[]),
                    getLocations().catch(() => [] as Location[]),
                    getActiveVariants().catch(() => [] as Variant[]),
                    getActiveProducts().catch(() => [] as Product[]),
                    !isCreating ? getSalesOrderById(id).catch(() => null) : Promise.resolve(null),
                ]);

                if (!isMounted) return;

                setCustomers(customersData);
                setLocations(locationsData);
                setVariants(variantsData);
                setProducts(productsData);

                if (isCreating) {
                    if (locationsData.length > 0) {
                        setLocationId(locationsData[0].id);
                    }
                    if (customersData.length > 0) {
                        setCustomerId(customersData[0].id);
                    }
                } else if (orderData) {
                    setCustomerId(orderData.customerId);
                    setLocationId(orderData.locationId);
                    setStatus(orderData.salesOrderStatus);
                    setInitialStatus(orderData.salesOrderStatus);

                    const existingRows: OrderDraftRow[] = (orderData.salesOrderItems ?? []).map((item) => ({
                        variantId: item.variantId,
                        batchId: item.batchId ?? null,
                        quantity: item.quantity,
                        pricePerUnit: String(item.pricePerUnit),
                    }));
                    setRows(existingRows);

                    // Fetch batches for batched line items in edit mode
                    for (const item of existingRows) {
                        if (item.batchId) {
                            getBatchesByVariantId(item.variantId)
                                .then((batches) => {
                                    if (isMounted) {
                                        setVariantBatchesMap((prev) => ({
                                            ...prev,
                                            [item.variantId]: batches,
                                        }));
                                    }
                                })
                                .catch(() => { });
                        }
                    }
                }

                setIsLoading(false);
            } catch (err) {
                if (isMounted) {
                    setFormError(err instanceof Error ? err.message : "載入訂單資料失敗。");
                    setIsLoading(false);
                }
            }
        };

        loadInitialData();

        return () => {
            isMounted = false;
        };
    }, [id, isCreating]);

    // Lookup Maps
    const productMap = useMemo(() => {
        const map = new Map<number, Product>();
        products.forEach((p) => map.set(p.id, p));
        return map;
    }, [products]);

    const variantMap = useMemo(() => {
        const map = new Map<number, Variant>();
        variants.forEach((v) => map.set(v.id, v));
        return map;
    }, [variants]);

    // Dropdown list of all selectable variants
    const availableVariants = useMemo<VariantSelectOption[]>(() => {
        return variants
            .map((variant) => {
                const product = productMap.get(variant.productId);
                const productName = product?.name ?? `款式 #${variant.id}`;
                const configStr = (variant.configs ?? [])
                    .map((c) => c.value)
                    .filter(Boolean)
                    .join(" / ");

                const label = configStr ? `${productName} - ${configStr}` : productName;

                return {
                    variantId: variant.id,
                    productId: variant.productId,
                    label,
                    price: variant.salesPrice ?? 0,
                    isBatchTracked: product?.batchTracked ?? false,
                };
            })
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [variants, productMap]);

    // Row Operations
    const handleAddRow = async (variantId: number) => {
        setFormError(null);
        const match = availableVariants.find((v) => v.variantId === variantId);

        setRows((prev) => [
            ...prev,
            {
                variantId,
                batchId: null,
                quantity: 1,
                pricePerUnit: String(match?.price ?? 0),
            },
        ]);

        // Prefetch batches if this variant is batch-tracked
        if (match?.isBatchTracked && !variantBatchesMap[variantId]) {
            try {
                const batches = await getBatchesByVariantId(variantId);
                setVariantBatchesMap((prev) => ({ ...prev, [variantId]: batches }));
            } catch {
                setVariantBatchesMap((prev) => ({ ...prev, [variantId]: [] }));
            }
        }
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

    const handleRowBatchChange = (index: number, batchId: number | null) => {
        setRows((prev) =>
            prev.map((row, i) => (i === index ? { ...row, batchId } : row))
        );
    };

    const calculatedTotal = useMemo(() => {
        return rows.reduce((sum, row) => {
            const qty = row.quantity || 0;
            const price = parseFloat(row.pricePerUnit) || 0;
            return sum + qty * price;
        }, 0);
    }, [rows]);

    // Submit Handler
    const handleSubmit = async () => {
        if (!customerId) {
            setFormError("請選擇客戶。");
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

        // Validate line items
        for (const row of rows) {
            if (row.quantity <= 0) {
                setFormError("商品數量必須大於 0。");
                return;
            }

            const price = parseFloat(row.pricePerUnit);
            if (Number.isNaN(price) || price < 0) {
                setFormError("單價不能為負數。");
                return;
            }

            const variantMeta = availableVariants.find((v) => v.variantId === row.variantId);
            if (variantMeta?.isBatchTracked && !row.batchId) {
                setFormError(`「${variantMeta.label}」為批次追蹤商品，請指定出貨批次。`);
                return;
            }
        }

        setFormError(null);
        onSavingChange?.(true);

        try {
            if (isCreating) {
                const payload: CreateSalesOrderPayload = {
                    customerId,
                    locationId,
                    salesOrderStatus: status,
                    salesOrderItems: rows.map((r) => ({
                        variantId: r.variantId,
                        batchId: r.batchId,
                        quantity: r.quantity,
                        pricePerUnit: parseFloat(r.pricePerUnit) || 0,
                    })),
                };

                const created = await createSalesOrder(payload);
                onCreated?.(created.id);
            } else {
                // In Edit Mode, update status if changed
                if (status !== initialStatus) {
                    await updateSalesOrderStatus(id, status);
                    setInitialStatus(status);
                }
            }
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "儲存訂單失敗。");
        } finally {
            onSavingChange?.(false);
        }
    };

    useImperativeHandle(ref, () => ({ submit: handleSubmit }));

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-sm font-medium">載入訂單資料中...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-y-5">
            {formError && <div className={ERROR_PANEL}>{formError}</div>}

            {/* Top Form Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Customer */}
                <div className="flex flex-col gap-y-1">
                    <label className={FIELD_LABEL}>客戶</label>
                    <select
                        className={CONTROL_INPUT}
                        value={customerId ?? ""}
                        onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : null)}
                        disabled={!isCreating}
                    >
                        <option value="">選擇客戶...</option>
                        {customers.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.firstName} {c.lastName} {c.company ? `(${c.company})` : ""}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Warehouse Location */}
                <div className="flex flex-col gap-y-1">
                    <label className={FIELD_LABEL}>出貨倉庫</label>
                    <select
                        className={CONTROL_INPUT}
                        value={locationId ?? ""}
                        onChange={(e) => setLocationId(Number(e.target.value))}
                        disabled={!isCreating}
                    >
                        <option value="">選擇出貨倉庫...</option>
                        {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                                {loc.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Order Status */}
                <div className="flex flex-col gap-y-1">
                    <label className={FIELD_LABEL}>訂單狀態</label>
                    <select
                        className={CONTROL_INPUT}
                        value={status}
                        onChange={(e) => setStatus(e.target.value as "PENDING" | "COMPLETED")}
                    >
                        <option value="PENDING">待處理 (Pending)</option>
                        <option value="COMPLETED">已完成 (Completed)</option>
                    </select>
                </div>
            </div>

            {/* Line Items Table */}
            <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-left text-sm text-foreground">
                    <thead className="bg-muted text-muted-foreground font-medium text-xs uppercase tracking-wider border-b border-border">
                        <tr>
                            <th className="py-3 px-4">商品 / 款式</th>
                            <th className="py-3 px-4 text-right w-24">數量</th>
                            <th className="py-3 px-4 text-right w-32">單價 ($)</th>
                            <th className="py-3 px-4 text-right w-32">小計 ($)</th>
                            <th className="py-3 px-4 min-w-48">出貨批次</th>
                            <th className="py-3 px-4 text-right w-10" />
                        </tr>
                    </thead>
                    <tbody className="font-mono text-xs">
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-8 text-center text-muted-foreground font-sans">
                                    {isCreating ? "請在下方選單新增商品。" : "此訂單無品項。"}
                                </td>
                            </tr>
                        ) : (
                            rows.map((row, index) => {
                                const variant = variantMap.get(row.variantId);
                                const product = variant ? productMap.get(variant.productId) : undefined;
                                const isBatchTracked = product?.batchTracked ?? false;
                                const batches = variantBatchesMap[row.variantId] ?? [];
                                const rowSubtotal = (row.quantity || 0) * (parseFloat(row.pricePerUnit) || 0);

                                const configStr = (variant?.configs ?? [])
                                    .map((c) => c.value)
                                    .filter(Boolean)
                                    .join(" / ");

                                return (
                                    <tr key={`${row.variantId}-${index}`} className="border-b border-border/60">
                                        <td className="py-2.5 px-4 font-sans">
                                            <div className="font-medium text-foreground">
                                                {product?.name ?? `款式 #${row.variantId}`}
                                            </div>
                                            {configStr && (
                                                <div className="text-xs text-muted-foreground mt-0.5">
                                                    {configStr}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-2.5 px-4 text-right">
                                            <input
                                                type="number"
                                                min="1"
                                                className="w-20 text-right bg-background border border-input focus:border-ring rounded px-2 py-1 text-foreground focus:outline-none transition"
                                                value={row.quantity}
                                                onChange={(e) =>
                                                    handleRowQuantityChange(
                                                        index,
                                                        Math.max(1, parseInt(e.target.value) || 1)
                                                    )
                                                }
                                                disabled={!isCreating}
                                            />
                                        </td>
                                        <td className="py-2.5 px-4 text-right">
                                            <input
                                                type="number"
                                                step="any"
                                                min="0"
                                                className="w-24 text-right bg-background border border-input focus:border-ring rounded px-2 py-1 text-foreground focus:outline-none transition"
                                                value={row.pricePerUnit}
                                                onChange={(e) => handleRowPriceChange(index, e.target.value)}
                                                disabled={!isCreating}
                                            />
                                        </td>
                                        <td className="py-2.5 px-4 text-right font-medium text-emerald-400">
                                            ${rowSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-2.5 px-4">
                                            {isBatchTracked ? (
                                                <select
                                                    className={`${CONTROL_INPUT} text-xs py-1 h-8`}
                                                    value={row.batchId ?? ""}
                                                    onChange={(e) =>
                                                        handleRowBatchChange(
                                                            index,
                                                            e.target.value ? Number(e.target.value) : null
                                                        )
                                                    }
                                                    disabled={!isCreating}
                                                >
                                                    <option value="">選擇批次...</option>
                                                    {batches.map((b) => (
                                                        <option key={b.id} value={b.id}>
                                                            {b.batchNumber} (剩餘: {b.quantity})
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span className="text-muted-foreground/60">—</span>
                                            )}
                                        </td>
                                        <td className="py-2.5 px-4 text-right">
                                            {isCreating && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveRow(index)}
                                                    className="text-muted-foreground hover:text-destructive p-1 transition-colors"
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
                                <td colSpan={2} />
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            {/* Add Product Selector (Create Mode Only) */}
            {isCreating && (
                <div className="flex flex-col gap-y-1">
                    <label className={FIELD_LABEL}>新增訂單品項</label>
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