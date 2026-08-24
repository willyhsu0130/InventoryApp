import { useCallback, useEffect, useState } from "react";
import {
    type Customer,
} from "@my-inventory-app/shared";

import { CustomersContext } from "@/context/customers/CustomersContext";
import { katanaFetch } from "@/lib/katanaFetch";
import { KATANA_API_ROUTES } from "@/lib/routes/routes";
import { useError } from "@/hooks/useError";

export const CustomersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [customers, setCustomers] = useState<Map<number, KatanaCustomer>>(new Map());
    const [loading, setLoading] = useState<boolean>(true);
    const { setErrorMessage } = useError();

    // 1. REFETCH CUSTOMERS
    const refetchCustomers = useCallback(async () => {
        const res = await katanaFetch<KatanaCustomer[]>(KATANA_API_ROUTES.CUSTOMERS);

        if (res.success && Array.isArray(res.data)) {
            const cMap = new Map<number, KatanaCustomer>();
            res.data.forEach((cust) => cMap.set(cust.id, cust));
            setCustomers(cMap);
        } else {
            setErrorMessage("Failed to sync customers data.");
        }
    }, [setErrorMessage]);

    // 2. CREATE CUSTOMER (POST)
    const createCustomer = useCallback(
        async (draft: KatanaCustomerDraft) => {
            const payload = convertCustomerToCreatePayload(draft);

            const res = await katanaFetch<KatanaCustomer>(KATANA_API_ROUTES.CUSTOMERS, {
                method: "POST",
                body: JSON.stringify(payload),
            });

            if (!res.success || !res.data) {
                const msg = "Failed to create customer.";
                setErrorMessage(msg);
                throw new Error(msg);
            }

            setCustomers((prev) => new Map(prev).set(res.data.id, res.data));
            return res.data;
        },
        [setErrorMessage]
    );

    // 3. UPDATE CUSTOMER (PATCH)
    // Optimistic Update example for editCustomer
    const editCustomer = useCallback(
        async (id: number, draft: Partial<KatanaCustomerDraft>) => {
            // 1. Capture snapshot for potential rollback
            const previousCustomers = new Map(customers);

            // 2. OPTIMISTICALLY update state immediately
            setCustomers((prev) => {
                const next = new Map(prev);
                const existing = next.get(id);
                if (existing) {
                    next.set(id, { ...existing, ...draft } as KatanaCustomer);
                }
                return next;
            });

            try {
                const payload = convertCustomerToUpdatePayload(draft);
                const endpoint = KATANA_API_ROUTES.CUSTOMER_BY_ID
                    ? KATANA_API_ROUTES.CUSTOMER_BY_ID(id)
                    : `${KATANA_API_ROUTES.CUSTOMERS}/${id}`;

                const res = await katanaFetch<KatanaCustomer>(endpoint, {
                    method: "PATCH",
                    body: JSON.stringify(payload),
                });

                if (!res.success || !res.data) {
                    throw new Error("Failed to update customer.");
                }

                // Replace optimistic data with exact server payload
                setCustomers((prev) => new Map(prev).set(res.data.id, res.data));
                return res.data;
            } catch (err) {
                // 3. ROLLBACK on failure
                setCustomers(previousCustomers);
                const msg = "Failed to update customer.";
                setErrorMessage(msg);
                throw err;
            }
        },
        [customers, setErrorMessage]
    );

    // 4. DELETE CUSTOMER (DELETE 204)
    const deleteCustomer = useCallback(
        async (id: number) => {
            const endpoint = KATANA_API_ROUTES.CUSTOMER_BY_ID
                ? KATANA_API_ROUTES.CUSTOMER_BY_ID(id)
                : `${KATANA_API_ROUTES.CUSTOMERS}/${id}`;

            const res = await katanaFetch<void>(endpoint, {
                method: "DELETE",
            });

            if (!res.success) {
                const msg = res.message || "Delete Customer failed.";
                setErrorMessage(msg);
                throw new Error(msg);
            }

            setCustomers((prev) => {
                const next = new Map(prev);
                next.delete(id);
                return next;
            });
        },
        [setErrorMessage]
    );

    // 5. HELPER: RESOLVE DISPLAY NAME BY ID
    const getCustomerName = useCallback(
        (id: number): string => {
            const cust = customers.get(id);
            if (!cust) return `Customer #${id}`;

            const name = `${cust.first_name ?? ""} ${cust.last_name ?? ""}`.trim();
            if (cust.company && name) return `${cust.company} (${name})`;
            return cust.company || cust.name || name || `Customer #${id}`;
        },
        [customers]
    );

    // 6. INITIAL LOAD
    useEffect(() => {
        let isMounted = true;

        const loadInitialData = async () => {
            const res = await katanaFetch<KatanaCustomer[]>(KATANA_API_ROUTES.CUSTOMERS);

            if (!isMounted) return;

            if (res.success && Array.isArray(res.data)) {
                const cMap = new Map<number, KatanaCustomer>();
                res.data.forEach((c) => cMap.set(c.id, c));
                setCustomers(cMap);
            } else {
                setErrorMessage("Failed to load initial customers.");
            }

            setLoading(false);
        };

        loadInitialData();

        return () => {
            isMounted = false;
        };
    }, [setErrorMessage]);

    return (
        <CustomersContext.Provider
            value={{
                customers,
                loading,
                refetchCustomers,
                createCustomer,
                editCustomer,
                deleteCustomer,
                getCustomerName,
            }}
        >
            {children}
        </CustomersContext.Provider>
    );
};