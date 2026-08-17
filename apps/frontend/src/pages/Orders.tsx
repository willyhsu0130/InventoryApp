import { useState, useMemo, useRef, useEffect } from "react";
import { Plus } from "lucide-react";
import { PageLayout } from "../components/PageLayout";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { useError } from "../hooks/useError";
import {
    CONTROL_INPUT,
    ERROR_PANEL,
    PLACEHOLDER_PANEL,
    PRIMARY_BUTTON,
} from "../lib/styles";
import {
    useOrdersCatalog,
    useProductCatalog,
    useCustomersCatalog,
    useInventoryCatalog,
} from "../hooks/useContexts";
import { EditModal } from "@/components/EditModal";
import { EditOrder, type EditOrderHandle } from "@/components/orders/EditOrder";
import { Button } from "@/components/ui/button";
import { RefreshButton } from "@/components/RefreshButton";
import { printSalesOrderPDF } from "@/lib/exportOrder";
import { katanaFetch } from "@/lib/katanaFetch";
import { KATANA_API_ROUTES } from "@/lib/routes/routes";
import type { KatanaLocation } from "@/models/katana/common";

/** null = closed, -1 = new order, number = prefilled order id */
type OrderTarget = { orderId: number } | null;

export const Orders = () => {
    // 1. Access all provider catalogs
    const { orders, loading: loadingOrders, refetchOrders, deleteOrder } = useOrdersCatalog();
    const { getVariantDetails, loading: loadingProducts } = useProductCatalog();
    const { getCustomerName, loading: loadingCustomers } = useCustomersCatalog();
    const { loading: loadingInventory } = useInventoryCatalog();

    const { errorMessage } = useError();
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [orderTarget, setOrderTarget] = useState<OrderTarget>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [locations, setLocations] = useState<KatanaLocation[]>([]);

    const editOrderRef = useRef<EditOrderHandle>(null);

    // Fetch locations to resolve warehouse names in printouts
    useEffect(() => {
        let isMounted = true;
        const fetchLocations = async () => {
            const res = await katanaFetch<KatanaLocation[]>(KATANA_API_ROUTES.LOCATIONS);
            if (isMounted && res.success && Array.isArray(res.data)) {
                setLocations(res.data);
            }
        };
        fetchLocations();
        return () => {
            isMounted = false;
        };
    }, []);

    const ordersList = useMemo(() => {
        return Array.from(orders.values());
    }, [orders]);

    // Filter across Order Number, Customer Info, and Order Row Items
    const filteredItems = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return ordersList;

        return ordersList.filter((order) => {
            const orderNoMatch = order.order_no?.toLowerCase().includes(term);
            const customerName = getCustomerName(order.customer_id).toLowerCase();
            const customerMatch = customerName.includes(term) || order.customer_id?.toString().includes(term);
            const statusMatch = order.status?.toLowerCase().includes(term);

            const rowItemMatch = order.sales_order_rows?.some((row) => {
                const details = getVariantDetails(row.variant_id);
                return (
                    details?.product_name.toLowerCase().includes(term) ||
                    details?.sku.toLowerCase().includes(term) ||
                    details?.variant_details?.toLowerCase().includes(term)
                );
            });

            return orderNoMatch || customerMatch || statusMatch || rowItemMatch;
        });
    }, [ordersList, searchTerm, getCustomerName, getVariantDetails]);

    const isGlobalLoading = loadingOrders || loadingProducts || loadingCustomers || loadingInventory;

    const handleDelete = async () => {
        if (!orderTarget || orderTarget.orderId === -1) return;

        try {
            await deleteOrder(orderTarget.orderId);
            setOrderTarget(null);
        } catch (err) {
            console.error("Failed to delete order:", err);
        }
    };

    /**
     * Resolves all IDs into human-readable strings before printing/exporting.
     */
    const handleExport = () => {
        if (!orderTarget || orderTarget.orderId === -1) return;

        const targetOrder = orders.get(orderTarget.orderId);
        if (!targetOrder) return;

        // Resolve location name
        const locationName =
            locations.find((l) => l.id === targetOrder.location_id)?.name ||
            `倉庫 #${targetOrder.location_id}`;

        // Enrich the sales order with customer name and variant resolver
        const exportableOrder = {
            ...targetOrder,
            customer_name: getCustomerName(targetOrder.customer_id),
        };

        // Call PDF print function passing the resolver function from useProductCatalog
        printSalesOrderPDF(exportableOrder, locationName, getVariantDetails);
    };

    return (
        <PageLayout
            id="ordersPage"
            title="訂單"
            actions={
                <>
                    <Button
                        onClick={() => setOrderTarget({ orderId: -1 })}
                        className={PRIMARY_BUTTON}
                    >
                        <Plus width="14" height="14" />
                        新增訂單
                    </Button>

                    <RefreshButton label="重新整理訂單" onClick={() => refetchOrders()} />

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
            {isGlobalLoading ? (
                <div className={PLACEHOLDER_PANEL}>準備畫面中</div>
            ) : errorMessage ? (
                <div className={ERROR_PANEL}>
                    <p className="font-semibold">無法讀取訂單</p>
                    <p className="text-xs font-mono mt-1 text-red-300">{errorMessage}</p>
                </div>
            ) : (
                <OrdersTable
                    items={filteredItems}
                    onRowClick={(orderId) => setOrderTarget({ orderId })}
                />
            )}

            <EditModal
                showSaveButton={true}
                title={orderTarget?.orderId !== -1 ? "編輯訂單" : "新增訂單"}
                isOpen={orderTarget !== null}
                onClose={() => setOrderTarget(null)}
                isSaving={isSaving}
                onSave={() => editOrderRef.current?.submit()}
                onDelete={
                    orderTarget && orderTarget.orderId !== -1
                        ? handleDelete
                        : undefined
                }
                onExport={
                    orderTarget && orderTarget.orderId !== -1
                        ? handleExport
                        : undefined
                }
            >
                {orderTarget !== null && (
                    <EditOrder
                        onSavingChange={setIsSaving}
                        id={orderTarget.orderId}
                        ref={editOrderRef}
                        onCreated={() => setOrderTarget(null)}
                    />
                )}
            </EditModal>
        </PageLayout>
    );
};