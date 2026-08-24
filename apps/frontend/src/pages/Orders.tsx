// src/pages/Orders.tsx
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { PageLayout } from "../components/PageLayout";
import { OrdersTable, type DisplaySalesOrderItem, type DisplaySalesOrderRow } from "@/components/orders/OrdersTable";
import {
    CONTROL_INPUT,
    ERROR_PANEL,
    PLACEHOLDER_PANEL,
    PRIMARY_BUTTON,
} from "../lib/styles";
import { EditModal } from "@/components/EditModal";
import { EditOrder, type EditOrderHandle } from "@/components/orders/EditOrder";
import { Button } from "@/components/ui/button";
import { RefreshButton } from "@/components/RefreshButton";
// import { printSalesOrderPDF } from "@/lib/exportOrder";
import type { Customer, Location, Product, SalesOrder, Variant } from "@my-inventory-app/shared";
import {
    getSalesOrdersByStatus,
    getSalesOrderById,
} from "@/services/salesOrderService";
import { getCustomers } from "@/services/customerService";
import { getLocations } from "@/services/locationService";
import { getActiveVariants } from "@/services/variantService";
import { getActiveProducts } from "@/services/productService";

const UNSAVED_ORDER_ID = -1;

type OrderTarget = { orderId: number } | null;

async function loadSalesOrdersCatalog(): Promise<DisplaySalesOrderRow[]> {
    // 1. Fetch pending & completed orders alongside entity metadata in parallel
    const [
        pendingOrders,
        completedOrders,
        customers,
        locations,
        variants,
        products,
    ] = await Promise.all([
        getSalesOrdersByStatus("PENDING").catch(() => [] as SalesOrder[]),
        getSalesOrdersByStatus("COMPLETED").catch(() => [] as SalesOrder[]),
        getCustomers().catch(() => [] as Customer[]),
        getLocations().catch(() => [] as Location[]),
        getActiveVariants().catch(() => [] as Variant[]),
        getActiveProducts().catch(() => [] as Product[]),
    ]);

    const allOrders = [...pendingOrders, ...completedOrders].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // 2. Build fast O(1) lookup maps
    const customerMap = new Map<number, Customer>();
    customers.forEach((c) => customerMap.set(c.id, c));

    const locationMap = new Map<number, Location>();
    locations.forEach((l) => locationMap.set(l.id, l));

    const variantMap = new Map<number, Variant>();
    variants.forEach((v) => variantMap.set(v.id, v));

    const productMap = new Map<number, Product>();
    products.forEach((p) => productMap.set(p.id, p));

    // 3. Hydrate display rows
    return allOrders.map((order: SalesOrder): DisplaySalesOrderRow => {
        const customer = customerMap.get(order.customerId);
        const customerName = customer
            ? `${customer.firstName} ${customer.lastName}`.trim()
            : `客戶 #${order.customerId}`;

        const location = locationMap.get(order.locationId);
        const locationName = location?.name ?? `倉庫 #${order.locationId}`;

        // Compute total quantity and price from line items
        let totalQuantity = 0;
        let totalPrice = 0;

        const lineItemDescriptions = (order.salesOrderItems ?? []).map((item) => {
            totalQuantity += item.quantity;
            totalPrice += item.quantity * item.pricePerUnit;

            const variant = variantMap.get(item.variantId);
            const parentProduct = variant ? productMap.get(variant.productId) : undefined;
            const productName = parentProduct?.name ?? `款式 #${item.variantId}`;

            const configs = (variant?.configs ?? [])
                .map((c) => c.value)
                .filter(Boolean)
                .join(" / ");

            return {
                variantId: item.variantId,
                productName,
                sku: variant?.sku ?? "",
                specs: configs,
                quantity: item.quantity,
                pricePerUnit: item.pricePerUnit,
            };
        });

        return {
            id: order.id,
            customerId: order.customerId,
            customerName,
            locationId: order.locationId,
            locationName,
            status: order.salesOrderStatus,
            totalQuantity,
            totalPrice,
            createdAt: order.createdAt,
            items: lineItemDescriptions,
        };
    });
}

export const Orders = () => {
    const [orders, setOrders] = useState<DisplaySalesOrderRow[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState<string>("");
    const [orderTarget, setOrderTarget] = useState<OrderTarget>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    const editOrderRef = useRef<EditOrderHandle>(null);

    const refreshOrders = useCallback(async () => {
        setIsLoading(true);
        setErrorMessage(null);
        try {
            const data = await loadSalesOrdersCatalog();
            setOrders(data);
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : "無法讀取訂單目錄。");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        loadSalesOrdersCatalog()
            .then((data) => {
                if (isMounted) {
                    setOrders(data);
                    setIsLoading(false);
                }
            })
            .catch((err) => {
                if (isMounted) {
                    setErrorMessage(err instanceof Error ? err.message : "無法讀取訂單目錄。");
                    setIsLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, []);

    // Filter across Order ID, Customer Name, Status, and nested item descriptions
    const filteredOrders = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return orders;

        return orders.filter((order: DisplaySalesOrderRow) => {
            const idMatch =
                `so-${order.id}`.toLowerCase().includes(term) ||
                String(order.id).includes(term);
            const customerMatch = order.customerName.toLowerCase().includes(term);
            const statusMatch = order.status.toLowerCase().includes(term);
            const locationMatch = order.locationName.toLowerCase().includes(term);

            // Search through the hydrated variant details on each line item
            const itemsMatch = order.items.some((item: DisplaySalesOrderItem) =>
                item.productName.toLowerCase().includes(term) ||
                item.sku.toLowerCase().includes(term) ||
                item.specs.toLowerCase().includes(term)
            );

            return idMatch || customerMatch || statusMatch || locationMatch || itemsMatch;
        });
    }, [orders, searchTerm]);
    const handleCloseModal = async () => {
        if (isSaving) return;
        setOrderTarget(null);
        await refreshOrders();
    };

    const handleExport = async () => {
        if (!orderTarget || orderTarget.orderId === UNSAVED_ORDER_ID) return;

        try {
            const order = await getSalesOrderById(orderTarget.orderId);
            const targetRow = orders.find((o) => o.id === orderTarget.orderId);

            if (!order || !targetRow) return;

            // Prepare printable DTO
            // const exportData = {
            //     ...order,
            //     order_no: `SO-${order.id.toString().padStart(5, "0")}`,
            //     customer_name: targetRow.customerName,
            // };

            // printSalesOrderPDF(exportData, targetRow.locationName);
        } catch (err) {
            console.error("Failed to export sales order PDF:", err);
        }
    };

    return (
        <PageLayout
            id="ordersPage"
            title="銷售訂單"
            actions={
                <>
                    <Button
                        onClick={() => setOrderTarget({ orderId: UNSAVED_ORDER_ID })}
                        className={PRIMARY_BUTTON}
                    >
                        <Plus width="14" height="14" />
                        新增訂單
                    </Button>

                    <RefreshButton label="重新整理訂單" onClick={refreshOrders} />

                    <div className="w-full sm:w-80">
                        <input
                            type="text"
                            placeholder="搜尋訂單編號, 客戶, 產品, 或 SKU..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={CONTROL_INPUT}
                        />
                    </div>
                </>
            }
        >
            {isLoading ? (
                <div className={PLACEHOLDER_PANEL}>準備畫面中...</div>
            ) : errorMessage ? (
                <div className={ERROR_PANEL}>
                    <p className="font-semibold">無法讀取訂單</p>
                    <p className="text-xs font-mono mt-1 text-red-300">{errorMessage}</p>
                </div>
            ) : (
                <OrdersTable
                    items={filteredOrders}
                    onRowClick={(orderId) => setOrderTarget({ orderId })}
                />
            )}

            <EditModal
                showSaveButton={orderTarget?.orderId === UNSAVED_ORDER_ID}
                title={orderTarget?.orderId !== UNSAVED_ORDER_ID ? "訂單詳情" : "新增訂單"}
                isOpen={orderTarget !== null}
                onClose={handleCloseModal}
                isSaving={isSaving}
                onSave={() => editOrderRef.current?.submit()}
                onExport={
                    orderTarget && orderTarget.orderId !== UNSAVED_ORDER_ID
                        ? handleExport
                        : undefined
                }
            >
                {orderTarget !== null && (
                    <EditOrder
                        onSavingChange={setIsSaving}
                        id={orderTarget.orderId}
                        ref={editOrderRef}
                        onCreated={async () => {
                            setOrderTarget(null);
                            await refreshOrders();
                        }}
                    />
                )}
            </EditModal>
        </PageLayout>
    );
};