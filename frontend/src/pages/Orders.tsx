import { useState, useMemo, useContext, useRef } from "react";
import { Plus } from "lucide-react";
import { ProductContext } from "../context/ProductContext";
import { PageLayout } from "../components/PageLayout";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { useError } from "../hooks/useError";
import {
    CONTROL_INPUT,
    ERROR_PANEL,
    PLACEHOLDER_PANEL,
    PRIMARY_BUTTON,
    TOOLBAR_BUTTON,
} from "../lib/styles";
import { useOrdersCatalog } from "../hooks/useContexts";
import { EditModal } from "@/components/EditModal";
import { EditOrder, type EditOrderHandle } from "@/components/orders/EditOrder";

/** null = closed, undefined orderId = new order creation, number = prefilled order id for editing */
type OrderTarget = { orderId: number } | null;

export const Orders = () => {
    // 1. Consume orders catalog and product context
    const { orders, loading, refetchOrders, deleteOrder } = useOrdersCatalog();
    const productCtx = useContext(ProductContext);

    const { errorMessage } = useError();
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [orderTarget, setOrderTarget] = useState<OrderTarget>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    const editOrderRef = useRef<EditOrderHandle>(null);

    const ordersList = useMemo(() => {
        return Array.from(orders.values());
    }, [orders]);

    // 2. Filter across Order Number, Customer Info, and Order Row Items
    const filteredItems = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return ordersList;

        return ordersList.filter((order) => {
            const orderNoMatch = order.order_no?.toLowerCase().includes(term);
            const customerMatch = order.customer_id?.toString().includes(term);
            const statusMatch = order.status?.toLowerCase().includes(term);

            const rowItemMatch = order.sales_order_rows?.some((row: { variant_id: number; }) => {
                const details = productCtx?.getVariantDetails(row.variant_id);
                return (
                    details?.product_name.toLowerCase().includes(term) ||
                    details?.sku.toLowerCase().includes(term) ||
                    details?.variant_details?.toLowerCase().includes(term)
                );
            });

            return (
                orderNoMatch ||
                customerMatch ||
                statusMatch ||
                rowItemMatch
            );
        });
    }, [ordersList, searchTerm, productCtx]);
    const isGlobalLoading = loading || (productCtx?.loading ?? false);

    const handleDelete = async () => {
        if (!orderTarget || orderTarget.orderId === -1) return;

        try {
            await deleteOrder(orderTarget.orderId);
            setOrderTarget(null); // Close modal on successful delete
        } catch (err) {
            console.error("Failed to delete order:", err);
        }
    };

    return (
        <PageLayout
            id="ordersPage"
            title="訂單"
            actions={
                <>
                    <button
                        onClick={() => setOrderTarget({ orderId: -1 })}
                        className={PRIMARY_BUTTON}
                    >
                        <Plus width="14" height="14" />
                        新增訂單
                    </button>

                    <button onClick={() => refetchOrders()} className={TOOLBAR_BUTTON}>
                        重新整理訂單
                    </button>

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
                /* Orders Table */
                <OrdersTable
                    items={filteredItems}
                    onRowClick={(orderId) => setOrderTarget({ orderId })}
                />
            )}

            <EditModal
                showSaveButton={true}
                title={orderTarget?.orderId ? "編輯訂單" : "新增訂單"}
                isOpen={orderTarget !== null}
                onClose={() => setOrderTarget(null)}
                isSaving={isSaving}
                onSave={() => editOrderRef.current?.submit()}
                onDelete={
                    orderTarget && orderTarget.orderId !== -1
                        ? handleDelete
                        : undefined
                }
            >
                {orderTarget !== null && (
                    <EditOrder
                        onSavingChange={setIsSaving}
                        id={orderTarget.orderId}
                        ref={editOrderRef}
                        onCreated={() => {
                            setOrderTarget(null);
                        }}
                    />
                )}
            </EditModal>
        </PageLayout>
    );
};