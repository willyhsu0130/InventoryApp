// src/components/orders/EditOrder.tsx
import {
    useImperativeHandle,
    useEffect,
    useState,
    useMemo,
    type FC,
    type Ref,
} from "react";
import { X, Loader2, AlertCircle, Plus } from "lucide-react";
import { CONTROL_INPUT, ERROR_PANEL, FIELD_LABEL } from "@/lib/styles";
import type {
    Customer,
    Location,
    Product,
    Variant,
    Batch,
    InventoryLevel,
    CreateSalesOrderPayload,
    SalesOrderStatus,
} from "@my-inventory-app/shared";
import {
    createSalesOrder,
    getSalesOrderById,
    updateSalesOrderStatus,
} from "@/services/salesOrderService";
import { getCustomers } from "@/services/customerService";
import { getLocations, createLocation } from "@/services/locationService";
import { getActiveProducts } from "@/services/productService";
import { getActiveVariants } from "@/services/variantService";
import { getBatchesByVariantId } from "@/services/batchService";
import { getInventoryLevelsByLocationId } from "@/services/inventoryLevelService";
import { InlineInput } from "@/components/InlineInput";
import { EditModal } from "@/components/EditModal";

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
    rowId: string;
    variantId: number;
    batchId: number | null;
    quantity: number;
    pricePerUnit: number;
    notes?: string;
}

interface VariantSelectOption {
    variantId: number;
    productId: number;
    label: string;
    price: number;
    isBatchTracked: boolean;
}

const NEW_LOCATION_FLAG = "__new_location__";

const INITIAL_LOCATION_FORM: Omit<Location, "id"> = {
    name: "",
    line1: "",
    line2: null,
    city: "",
    state: "",
    country: "Taiwan",
};

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
    const [inventoryLevelsMap, setInventoryLevelsMap] = useState<Record<number, InventoryLevel>>({});

    // Form Header State
    const [customerId, setCustomerId] = useState<number | null>(null);
    const [locationId, setLocationId] = useState<number | null>(null);
    const [shippingLocationId, setShippingLocationId] = useState<number | null>(null);
    const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string>("");
    const [orderNotes, setOrderNotes] = useState<string>("");
    const [status, setStatus] = useState<SalesOrderStatus>("PENDING");
    const [initialStatus, setInitialStatus] = useState<SalesOrderStatus>("PENDING");

    // Quick Create Delivery Location Modal State
    const [showNewLocationModal, setShowNewLocationModal] = useState<boolean>(false);
    const [newLocationDraft, setNewLocationDraft] = useState<Omit<Location, "id">>(INITIAL_LOCATION_FORM);
    const [isCreatingLocation, setIsCreatingLocation] = useState<boolean>(false);
    const [locationModalError, setLocationModalError] = useState<string | null>(null);

    // Line Items State
    const [rows, setRows] = useState<OrderDraftRow[]>([]);

    // 1. Initial Data Fetching
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
                    setShippingLocationId(orderData.shippingLocationId ?? null);
                    setExpectedDeliveryDate(orderData.expectedDeliveryDate ?? "");
                    setOrderNotes(orderData.notes ?? "");
                    setStatus(orderData.salesOrderStatus);
                    setInitialStatus(orderData.salesOrderStatus);

                    const existingRows: OrderDraftRow[] = (orderData.salesOrderItems ?? []).map((item, idx) => ({
                        rowId: `existing-${item.id || idx}`,
                        variantId: item.variantId,
                        batchId: item.batchId ?? null,
                        quantity: item.quantity,
                        pricePerUnit: Number(item.pricePerUnit),
                        notes: item.notes ?? "",
                    }));
                    setRows(existingRows);

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

    // 2. Fetch inventory levels when selected location changes
    useEffect(() => {
        if (!locationId) return;

        let isMounted = true;
        getInventoryLevelsByLocationId(locationId)
            .then((levels) => {
                if (!isMounted) return;
                const map: Record<number, InventoryLevel> = {};
                levels.forEach((lvl) => {
                    map[lvl.variantId] = lvl;
                });
                setInventoryLevelsMap(map);
            })
            .catch(() => {
                if (isMounted) setInventoryLevelsMap({});
            });

        return () => {
            isMounted = false;
        };
    }, [locationId]);

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

    const variantDemandTotals = useMemo(() => {
        const totals: Record<number, number> = {};
        rows.forEach((r) => {
            totals[r.variantId] = (totals[r.variantId] || 0) + (r.quantity || 0);
        });
        return totals;
    }, [rows]);

    const batchDemandTotals = useMemo(() => {
        const totals: Record<number, number> = {};
        rows.forEach((r) => {
            if (r.batchId) {
                totals[r.batchId] = (totals[r.batchId] || 0) + (r.quantity || 0);
            }
        });
        return totals;
    }, [rows]);

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

    // Quick create location handler
    const handleQuickCreateLocation = async () => {
        const trimmedName = newLocationDraft.name?.trim();
        const trimmedLine1 = newLocationDraft.line1?.trim();
        const trimmedCity = newLocationDraft.city?.trim();
        const trimmedState = newLocationDraft.state?.trim();
        const trimmedCountry = newLocationDraft.country?.trim();

        if (!trimmedName) {
            setLocationModalError("請輸入地點名稱。");
            return;
        }
        if (!trimmedLine1) {
            setLocationModalError("請輸入地址第一行。");
            return;
        }
        if (!trimmedCity) {
            setLocationModalError("請輸入城市。");
            return;
        }
        if (!trimmedState) {
            setLocationModalError("請輸入州/省/行政區。");
            return;
        }
        if (!trimmedCountry) {
            setLocationModalError("請輸入國家。");
            return;
        }

        setLocationModalError(null);
        setIsCreatingLocation(true);

        try {
            const created = await createLocation({
                name: trimmedName,
                line1: trimmedLine1,
                line2: newLocationDraft.line2?.trim() || null,
                city: trimmedCity,
                state: trimmedState,
                country: trimmedCountry,
            });

            setLocations((prev) => [...prev, created]);
            setShippingLocationId(created.id);
            setShowNewLocationModal(false);
            setNewLocationDraft(INITIAL_LOCATION_FORM);
        } catch (err) {
            setLocationModalError(err instanceof Error ? err.message : "建立地點失敗。");
        } finally {
            setIsCreatingLocation(false);
        }
    };

    const handleCloseLocationModal = () => {
        setShowNewLocationModal(false);
        setNewLocationDraft(INITIAL_LOCATION_FORM);
        setLocationModalError(null);
    };

    // Row Operations
    const handleAddRow = async (variantId: number) => {
        setFormError(null);
        const match = availableVariants.find((v) => v.variantId === variantId);

        setRows((prev) => [
            ...prev,
            {
                rowId: `row-${Date.now()}-${prev.length}`,
                variantId,
                batchId: null,
                quantity: 1,
                pricePerUnit: match?.price ?? 0,
                notes: "",
            },
        ]);

        if (match?.isBatchTracked && !variantBatchesMap[variantId]) {
            try {
                const batches = await getBatchesByVariantId(variantId);
                setVariantBatchesMap((prev) => ({ ...prev, [variantId]: batches }));
            } catch {
                setVariantBatchesMap((prev) => ({ ...prev, [variantId]: [] }));
            }
        }
    };

    const handleRemoveRow = (rowId: string) => {
        setRows((prev) => prev.filter((r) => r.rowId !== rowId));
    };

    const handleRowQuantityChange = (rowId: string, quantity: number) => {
        setRows((prev) =>
            prev.map((row) => (row.rowId === rowId ? { ...row, quantity } : row))
        );
    };

    const handleRowPriceChange = (rowId: string, pricePerUnit: number) => {
        setRows((prev) =>
            prev.map((row) => (row.rowId === rowId ? { ...row, pricePerUnit } : row))
        );
    };

    const handleRowBatchChange = (rowId: string, batchId: number | null) => {
        setRows((prev) =>
            prev.map((row) => (row.rowId === rowId ? { ...row, batchId } : row))
        );
    };

    const handleRowNoteChange = (rowId: string, notes: string) => {
        setRows((prev) =>
            prev.map((row) => (row.rowId === rowId ? { ...row, notes } : row))
        );
    };

    const calculatedTotal = useMemo(() => {
        return rows.reduce((sum, row) => {
            const qty = row.quantity || 0;
            const price = row.pricePerUnit || 0;
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

        for (const row of rows) {
            if (row.quantity <= 0) {
                setFormError("商品數量必須大於 0。");
                return;
            }

            if (row.pricePerUnit < 0 || Number.isNaN(row.pricePerUnit)) {
                setFormError("單價不能為負數。");
                return;
            }

            const variantMeta = availableVariants.find((v) => v.variantId === row.variantId);
            if (variantMeta?.isBatchTracked && !row.batchId) {
                setFormError(`「${variantMeta.label}」為批次追蹤商品，請指定出貨批次。`);
                return;
            }
        }

        for (const [variantIdStr, totalDemanded] of Object.entries(variantDemandTotals)) {
            const variantId = Number(variantIdStr);
            const level = inventoryLevelsMap[variantId];
            const available = (Number(level?.quantity) || 0) - (Number(level?.committedQuantity) || 0);

            if (totalDemanded > available) {
                const variantMeta = availableVariants.find((v) => v.variantId === variantId);
                setFormError(
                    `「${variantMeta?.label || variantId}」總需求量 (${totalDemanded}) 超過倉庫可用庫存 (${available})。`
                );
                return;
            }
        }

        for (const [batchIdStr, totalBatchDemanded] of Object.entries(batchDemandTotals)) {
            const batchId = Number(batchIdStr);
            const batch = Object.values(variantBatchesMap)
                .flat()
                .find((b) => b.id === batchId);

            if (batch && totalBatchDemanded > batch.quantity) {
                setFormError(
                    `批次「${batch.batchNumber}」累計需求 (${totalBatchDemanded}) 超過批次剩餘數量 (${batch.quantity})。`
                );
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
                    shippingLocationId: shippingLocationId || null,
                    expectedDeliveryDate: expectedDeliveryDate || null,
                    notes: orderNotes.trim() || null,
                    salesOrderStatus: status,
                    salesOrderItems: rows.map((r) => ({
                        variantId: r.variantId,
                        batchId: r.batchId,
                        quantity: r.quantity,
                        pricePerUnit: r.pricePerUnit,
                        notes: r.notes?.trim() || null,
                    })),
                };

                const created = await createSalesOrder(payload);
                onCreated?.(created.id);
            } else {
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
                    <label className={FIELD_LABEL}>客戶 *</label>
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

                {/* Source Warehouse */}
                <div className="flex flex-col gap-y-1">
                    <label className={FIELD_LABEL}>出貨倉庫 *</label>
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

                {/* Destination / Shipping Location with On-The-Fly Creation */}
                <div className="flex flex-col gap-y-1">
                    <div className="flex items-center justify-between">
                        <label className={FIELD_LABEL}>送達地點 (選填)</label>
                        {isCreating && (
                            <button
                                type="button"
                                onClick={() => {
                                    setLocationModalError(null);
                                    setNewLocationDraft(INITIAL_LOCATION_FORM);
                                    setShowNewLocationModal(true);
                                }}
                                className="text-xs text-primary hover:underline flex items-center gap-0.5"
                            >
                                <Plus className="w-3 h-3" /> 新增地點
                            </button>
                        )}
                    </div>
                    <select
                        className={CONTROL_INPUT}
                        value={shippingLocationId ?? ""}
                        onChange={(e) => {
                            if (e.target.value === NEW_LOCATION_FLAG) {
                                setLocationModalError(null);
                                setNewLocationDraft(INITIAL_LOCATION_FORM);
                                setShowNewLocationModal(true);
                            } else {
                                setShippingLocationId(e.target.value ? Number(e.target.value) : null);
                            }
                        }}
                        disabled={!isCreating}
                    >
                        <option value="">選擇目的地倉庫或門市...</option>
                        {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                                {loc.name} ({loc.city}, {loc.state ?? loc.country})
                            </option>
                        ))}
                        {isCreating && (
                            <option value={NEW_LOCATION_FLAG}>+ 建立新送達地點...</option>
                        )}
                    </select>
                </div>

                {/* Expected Delivery Date */}
                <div className="flex flex-col gap-y-1">
                    <label className={FIELD_LABEL}>預計出貨/送達日期</label>
                    <input
                        type="date"
                        className={CONTROL_INPUT}
                        value={expectedDeliveryDate}
                        onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                        disabled={!isCreating}
                    />
                </div>

                {/* Order Status */}
                <div className="flex flex-col gap-y-1">
                    <label className={FIELD_LABEL}>訂單狀態</label>
                    <select
                        className={CONTROL_INPUT}
                        value={status}
                        onChange={(e) => setStatus(e.target.value as SalesOrderStatus)}
                    >
                        <option value="PENDING">待處理 (Pending)</option>
                        <option value="COMPLETED">已完成 (Completed)</option>
                        <option value="CANCELLED">已取消 (Cancelled)</option>
                    </select>
                </div>

                {/* Notes */}
                <div className="flex flex-col gap-y-1">
                    <label className={FIELD_LABEL}>訂單備註</label>
                    <input
                        type="text"
                        placeholder="特別備註或出貨指示..."
                        className={CONTROL_INPUT}
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        disabled={!isCreating}
                    />
                </div>
            </div>

            {/* Line Items Table */}
            <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full table-fixed text-left text-sm text-foreground">
                    <thead className="bg-muted text-muted-foreground font-medium text-xs uppercase tracking-wider border-b border-border">
                        <tr>
                            <th className="py-3 px-3 w-[22%]">商品 / 款式</th>
                            <th className="py-3 px-2 text-center w-[10%]">可用庫存</th>
                            <th className="py-3 px-2 text-right w-[10%]">數量</th>
                            <th className="py-3 px-2 text-right w-[12%]">單價 ($)</th>
                            <th className="py-3 px-2 text-right w-[12%]">小計 ($)</th>
                            <th className="py-3 px-3 w-[20%]">出貨批次 / 批次庫存</th>
                            <th className="py-3 px-2 w-[10%]">備註</th>
                            <th className="py-3 px-2 text-center w-[4%]" />
                        </tr>
                    </thead>
                    <tbody className="font-mono text-xs">
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="py-8 text-center text-muted-foreground font-sans">
                                    {isCreating ? "請在下方選單新增商品。" : "此訂單無品項。"}
                                </td>
                            </tr>
                        ) : (
                            rows.map((row) => {
                                const variant = variantMap.get(row.variantId);
                                const product = variant ? productMap.get(variant.productId) : undefined;
                                const isBatchTracked = product?.batchTracked ?? false;
                                const batches = variantBatchesMap[row.variantId] ?? [];
                                const rowSubtotal = (row.quantity || 0) * (row.pricePerUnit || 0);

                                const level = inventoryLevelsMap[row.variantId];
                                const availableStock = (Number(level?.quantity) || 0) - (Number(level?.committedQuantity) || 0);
                                const isOverVariantStock = (variantDemandTotals[row.variantId] || 0) > availableStock;

                                const selectedBatch = batches.find((b) => b.id === row.batchId);
                                const totalBatchDemand = row.batchId ? batchDemandTotals[row.batchId] || 0 : 0;
                                const isOverBatchStock = Boolean(selectedBatch && totalBatchDemand > selectedBatch.quantity);

                                const configStr = (variant?.configs ?? [])
                                    .map((c) => c.value)
                                    .filter(Boolean)
                                    .join(" / ");

                                return (
                                    <tr key={row.rowId} className="border-b border-border/60 hover:bg-muted/30">
                                        <td className="py-2 px-3 font-sans truncate">
                                            <div className="font-medium text-foreground truncate" title={product?.name}>
                                                {product?.name ?? `款式 #${row.variantId}`}
                                            </div>
                                            {configStr && (
                                                <div className="text-xs text-muted-foreground truncate" title={configStr}>
                                                    {configStr}
                                                </div>
                                            )}
                                        </td>

                                        {/* Available Inventory */}
                                        <td className="py-2 px-2 text-center">
                                            <span
                                                className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${isOverVariantStock
                                                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                                                    : "bg-muted text-muted-foreground"
                                                    }`}
                                                title={`在庫: ${level?.quantity ?? 0} | 已鎖定: ${level?.committedQuantity ?? 0}`}
                                            >
                                                {availableStock}
                                            </span>
                                        </td>

                                        {/* Inline Quantity Input */}
                                        <td className="py-2 px-2 text-right">
                                            {isCreating ? (
                                                <InlineInput<number>
                                                    type="number"
                                                    value={row.quantity}
                                                    onCommit={(newQty: number) =>
                                                        handleRowQuantityChange(row.rowId, Math.max(1, newQty))
                                                    }
                                                    className={`w-full text-right px-2 py-1 rounded box-border font-mono border ${isOverVariantStock || isOverBatchStock
                                                        ? "border-amber-500/60 bg-amber-500/10 text-amber-300"
                                                        : "border-transparent hover:bg-muted text-foreground"
                                                        } cursor-pointer transition-colors`}
                                                />
                                            ) : (
                                                <span className="px-2 py-1 block">{row.quantity}</span>
                                            )}
                                        </td>

                                        {/* Inline Price Input */}
                                        <td className="py-2 px-2 text-right">
                                            {isCreating ? (
                                                <InlineInput<number>
                                                    type="number"
                                                    value={row.pricePerUnit}
                                                    formatter={(val) =>
                                                        val.toLocaleString(undefined, {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2,
                                                        })
                                                    }
                                                    onCommit={(newPrice) =>
                                                        handleRowPriceChange(row.rowId, Math.max(0, newPrice))
                                                    }
                                                    className="w-full text-right px-2 py-1 rounded box-border font-mono border border-transparent hover:bg-muted text-foreground cursor-pointer transition-colors"
                                                />
                                            ) : (
                                                <span className="px-2 py-1 block">
                                                    ${row.pricePerUnit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            )}
                                        </td>

                                        {/* Subtotal */}
                                        <td className="py-2 px-2 text-right font-medium text-emerald-400 truncate">
                                            ${rowSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>

                                        {/* Batch Selector */}
                                        <td className="py-2 px-3">
                                            {isBatchTracked ? (
                                                <div className="flex flex-col gap-1 w-full">
                                                    <select
                                                        className={`${CONTROL_INPUT} text-xs py-1 h-8 w-full truncate ${isOverBatchStock ? "border-amber-500" : ""
                                                            }`}
                                                        value={row.batchId ?? ""}
                                                        onChange={(e) =>
                                                            handleRowBatchChange(
                                                                row.rowId,
                                                                e.target.value ? Number(e.target.value) : null
                                                            )
                                                        }
                                                        disabled={!isCreating}
                                                    >
                                                        <option value="">選擇出貨批次...</option>
                                                        {batches.map((b) => (
                                                            <option key={b.id} value={b.id}>
                                                                {b.batchNumber} (剩餘: {b.quantity})
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {isOverBatchStock && (
                                                        <div className="flex items-center gap-1 text-[11px] text-amber-400 font-sans truncate">
                                                            <AlertCircle className="w-3 h-3 shrink-0" />
                                                            <span className="truncate">累計需求量超過此批次剩餘庫存</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground/60 block px-1">—</span>
                                            )}
                                        </td>

                                        {/* Line Note */}
                                        <td className="py-2 px-2">
                                            {isCreating ? (
                                                <InlineInput<string>
                                                    type="text"
                                                    value={row.notes ?? ""}
                                                    formatter={(val) => (val.trim() ? val : "填寫備註...")}
                                                    onCommit={(newNote) => handleRowNoteChange(row.rowId, newNote)}
                                                    className={`w-full text-left px-2 py-1 rounded box-border text-xs border border-transparent hover:bg-muted cursor-pointer transition-colors truncate ${!row.notes?.trim() ? "text-muted-foreground/50 italic" : "text-foreground"
                                                        }`}
                                                />
                                            ) : (
                                                <span className="text-xs text-foreground px-2 py-1 block truncate" title={row.notes}>
                                                    {row.notes || "—"}
                                                </span>
                                            )}
                                        </td>

                                        {/* Remove Button */}
                                        <td className="py-2 px-2 text-center">
                                            {isCreating && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveRow(row.rowId)}
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
                                <td colSpan={4} className="py-3 px-3 text-right font-sans">
                                    訂單總計：
                                </td>
                                <td className="py-3 px-2 text-right text-emerald-400 font-mono text-sm">
                                    ${calculatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td colSpan={3} />
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            {/* Add Product Selector */}
            {isCreating && (
                <div className="flex flex-col gap-y-1">
                    <label className={FIELD_LABEL}>新增訂單品項 (可重複新增以分拆批次)</label>
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

            {/* Quick Create Delivery Location EditModal */}
            <EditModal
                isOpen={showNewLocationModal}
                title="新增送達地點"
                onClose={handleCloseLocationModal}
                onSave={handleQuickCreateLocation}
                isSaving={isCreatingLocation}
                showSaveButton={true}
            >
                <div className="flex flex-col gap-y-4">
                    {locationModalError && <div className={ERROR_PANEL}>{locationModalError}</div>}

                    <div className="flex flex-col gap-y-1">
                        <label className={FIELD_LABEL}>地點名稱 *</label>
                        <input
                            type="text"
                            autoFocus
                            placeholder="例如: 台北大安門市、台中發貨點"
                            className={CONTROL_INPUT}
                            value={newLocationDraft.name}
                            onChange={(e) =>
                                setNewLocationDraft((prev) => ({ ...prev, name: e.target.value }))
                            }
                        />
                    </div>

                    <div className="flex flex-col gap-y-1">
                        <label className={FIELD_LABEL}>地址第一行 (Line 1) *</label>
                        <input
                            type="text"
                            placeholder="例如: 新生南路三段 86 號"
                            className={CONTROL_INPUT}
                            value={newLocationDraft.line1}
                            onChange={(e) =>
                                setNewLocationDraft((prev) => ({ ...prev, line1: e.target.value }))
                            }
                        />
                    </div>

                    <div className="flex flex-col gap-y-1">
                        <label className={FIELD_LABEL}>地址第二行 (Line 2, 選填)</label>
                        <input
                            type="text"
                            placeholder="例如: 2 樓 / 501 室"
                            className={CONTROL_INPUT}
                            value={newLocationDraft.line2 ?? ""}
                            onChange={(e) =>
                                setNewLocationDraft((prev) => ({
                                    ...prev,
                                    line2: e.target.value || null,
                                }))
                            }
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-y-1">
                            <label className={FIELD_LABEL}>城市 (City) *</label>
                            <input
                                type="text"
                                placeholder="例如: 台北市"
                                className={CONTROL_INPUT}
                                value={newLocationDraft.city}
                                onChange={(e) =>
                                    setNewLocationDraft((prev) => ({ ...prev, city: e.target.value }))
                                }
                            />
                        </div>

                        <div className="flex flex-col gap-y-1">
                            <label className={FIELD_LABEL}>州 / 省 / 區 (State) *</label>
                            <input
                                type="text"
                                placeholder="例如: 大安區"
                                className={CONTROL_INPUT}
                                value={newLocationDraft.state ?? ""}
                                onChange={(e) =>
                                    setNewLocationDraft((prev) => ({ ...prev, state: e.target.value }))
                                }
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-y-1">
                        <label className={FIELD_LABEL}>國家 (Country) *</label>
                        <input
                            type="text"
                            placeholder="例如: Taiwan"
                            className={CONTROL_INPUT}
                            value={newLocationDraft.country}
                            onChange={(e) =>
                                setNewLocationDraft((prev) => ({ ...prev, country: e.target.value }))
                            }
                        />
                    </div>
                </div>
            </EditModal>
        </div>
    );
};