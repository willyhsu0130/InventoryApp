import { convertSalesOrderToCreatePayload, convertSalesOrderToUpdatePayload, type KatanaSalesOrder, type KatanaSalesOrderDraft } from "@/models/katana/salesOrder";
import { useCallback, useEffect, useState } from "react";
import { OrdersContext } from "@/context/orders/OrdersContext";
import { katanaFetch } from "@/lib/katanaFetch";
import { KATANA_API_ROUTES } from "@/lib/routes/routes";
import { useError } from "@/hooks/useError";

export const OrdersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [orders, setOrders] = useState<Map<number, KatanaSalesOrder>>(new Map());
    const [loading, setLoading] = useState<boolean>(false)
    const { setErrorMessage } = useError();

    const refetchOrders = useCallback(async () => {
        const ordersRes = await katanaFetch<KatanaSalesOrder[]>(KATANA_API_ROUTES.SALES_ORDERS);

        if (ordersRes.success && Array.isArray(ordersRes.data)) {
            const oMap = new Map<number, KatanaSalesOrder>();
            ordersRes.data.forEach((i) => oMap.set(i.id, i));
            setOrders(oMap);
        } else {
            console.log("Failed to sync orders data");
            setErrorMessage("Failed to sync inventory data.");
        }
    }, [setErrorMessage]);


    const deleteOrder = useCallback(async (id: KatanaSalesOrder["id"]) => {
        const endpoint = KATANA_API_ROUTES.SALES_ORDER_BY_ID(id);

        const res = await katanaFetch<void>(endpoint, {
            method: "DELETE",
        });

        if (!res.success) {
            const message = res.message || "Delete Order failed";
            setErrorMessage(message);
            throw new Error(message);
        }

        setOrders((prev) => {
            const next = new Map(prev);
            next.delete(id);
            return next;
        });
    }, [setErrorMessage]);

    // 1. CREATE (POST)
    const createOrder = useCallback(async (draft: KatanaSalesOrderDraft) => {
        const payload = convertSalesOrderToCreatePayload(draft);

        const res = await katanaFetch<KatanaSalesOrder>(KATANA_API_ROUTES.SALES_ORDERS, {
            method: "POST",
            body: JSON.stringify(payload),
        });

        if (!res.success || !res.data) {
            throw new Error("Failed to create sales order.");
        }

        setOrders((prev) => new Map(prev).set(res.data.id, res.data));
        return res.data;
    }, []);

    // 2. UPDATE (PATCH)
    const editOrder = useCallback(async (id: number, draft: Partial<KatanaSalesOrderDraft>) => {
        const payload = convertSalesOrderToUpdatePayload(draft);

        const res = await katanaFetch<KatanaSalesOrder>(`${KATANA_API_ROUTES.SALES_ORDERS}/${id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
        });

        if (!res.success || !res.data) {
            throw new Error("Failed to update sales order.");
        }

        setOrders((prev) => new Map(prev).set(res.data.id, res.data));
        return res.data;
    }, []);;

    useEffect(() => {
        let isMounted = true;
        const loadInitialData = async () => {
            const res = await katanaFetch<KatanaSalesOrder[]>(KATANA_API_ROUTES.SALES_ORDERS)

            if (!isMounted) return;

            if (res.success && Array.isArray(res.data)) {
                // Turn katana variant into a map
                const oMap = new Map<number, KatanaSalesOrder>();
                res.data.forEach((o) => oMap.set(o.id, o));
                setOrders(oMap);


                // Error hadnling =
                if (!res.success) {

                    setErrorMessage("Failed to sync orders.");
                }

                setLoading(false);
            };

            return () => {
                isMounted = false;
            };
        }
        loadInitialData();
    }, [setErrorMessage]);

    return (
        <OrdersContext.Provider
            value={{
                orders,
                refetchOrders,
                loading,
                editOrder,
                createOrder,
                deleteOrder
            }}
        >
            {children}
        </OrdersContext.Provider>
    );
};