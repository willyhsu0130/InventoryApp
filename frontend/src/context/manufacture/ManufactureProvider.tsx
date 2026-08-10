import { useCallback, useEffect, useState } from "react";
import {
    convertMOToCreatePayload,
    convertMOToUpdatePayload,
    type KatanaManufacturingOrder,
    type KatanaManufacturingOrderDraft,
} from "@/models/katana/manufacture";
import { ManufactureContext } from "./ManufactureContext";
import { katanaFetch } from "@/lib/katanaFetch";
import { KATANA_API_ROUTES } from "@/lib/routes/routes";
import { useError } from "@/hooks/useError";

export const ManufactureProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [manufactureOrders, setManufactureOrders] = useState<
        Map<number, KatanaManufacturingOrder>
    >(new Map());
    const [loading, setLoading] = useState<boolean>(true);
    const { setErrorMessage } = useError();

    // 1. REFETCH MANUFACTURING ORDERS (GET)
    const refetchManufactureOrders = useCallback(async () => {
        const res = await katanaFetch<KatanaManufacturingOrder[]>(
            KATANA_API_ROUTES.MANUFACTURING_ORDERS
        );

        if (res.success && Array.isArray(res.data)) {
            const moMap = new Map<number, KatanaManufacturingOrder>();
            res.data.forEach((mo) => moMap.set(mo.id, mo));
            setManufactureOrders(moMap);
        } else {
            console.error("Failed to sync manufacturing orders:");
            setErrorMessage("Failed to sync manufacturing orders.");
        }
    }, [setErrorMessage]);

    // 2. CREATE MANUFACTURING ORDER (POST)
    const createMO = useCallback(
        async (draft: KatanaManufacturingOrderDraft) => {
            const payload = convertMOToCreatePayload(draft);

            const res = await katanaFetch<KatanaManufacturingOrder>(
                KATANA_API_ROUTES.MANUFACTURING_ORDERS,
                {
                    method: "POST",
                    body: JSON.stringify(payload),
                }
            );

            if (!res.success || !res.data) {
                const msg = "Failed to create manufacturing order.";
                setErrorMessage(msg);
                throw new Error(msg);
            }

            setManufactureOrders((prev) => new Map(prev).set(res.data.id, res.data));
            return res.data;
        },
        [setErrorMessage]
    );

    // 3. EDIT / UPDATE MANUFACTURING ORDER (PATCH)
    const editMO = useCallback(
        async (id: number, draft: Partial<KatanaManufacturingOrderDraft>) => {
            const payload = convertMOToUpdatePayload(draft);
            const endpoint = KATANA_API_ROUTES.MANUFACTURING_ORDER_BY_ID
                ? KATANA_API_ROUTES.MANUFACTURING_ORDER_BY_ID(id)
                : `${KATANA_API_ROUTES.MANUFACTURING_ORDERS}/${id}`;

            const res = await katanaFetch<KatanaManufacturingOrder>(endpoint, {
                method: "PATCH",
                body: JSON.stringify(payload),
            });

            if (!res.success || !res.data) {
                const msg = "Failed to update manufacturing order.";
                setErrorMessage(msg);
                throw new Error(msg);
            }

            setManufactureOrders((prev) => new Map(prev).set(res.data.id, res.data));
            return res.data;
        },
        [setErrorMessage]
    );

    // 4. DELETE MANUFACTURING ORDER (DELETE 204)
    const deleteMO = useCallback(
        async (id: number) => {
            const endpoint = KATANA_API_ROUTES.MANUFACTURING_ORDER_BY_ID
                ? KATANA_API_ROUTES.MANUFACTURING_ORDER_BY_ID(id)
                : `${KATANA_API_ROUTES.MANUFACTURING_ORDERS}/${id}`;

            const res = await katanaFetch<void>(endpoint, {
                method: "DELETE",
            });

            if (!res.success) {
                const msg = res.message || "Delete Manufacturing Order failed.";
                setErrorMessage(msg);
                throw new Error(msg);
            }

            setManufactureOrders((prev) => {
                const next = new Map(prev);
                next.delete(id);
                return next;
            });
        },
        [setErrorMessage]
    );

    // 5. INITIAL DATA LOAD
    useEffect(() => {
        let isMounted = true;

        const loadInitialData = async () => {
            const res = await katanaFetch<KatanaManufacturingOrder[]>(
                KATANA_API_ROUTES.MANUFACTURING_ORDERS
            );

            if (!isMounted) return;

            if (res.success && Array.isArray(res.data)) {
                const moMap = new Map<number, KatanaManufacturingOrder>();
                res.data.forEach((mo) => moMap.set(mo.id, mo));
                setManufactureOrders(moMap);
            } else {
                setErrorMessage("Failed to load initial manufacturing orders.");
            }

            setLoading(false);
        };

        loadInitialData();

        return () => {
            isMounted = false;
        };
    }, [setErrorMessage]);

    return (
        <ManufactureContext.Provider
            value={{
                manufactureOrders,
                loading,
                refetchManufactureOrders,
                createMO,
                editMO,
                deleteMO,
            }}
        >
            {children}
        </ManufactureContext.Provider>
    );
};