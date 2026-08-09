import { InventoryContext } from "./InventoryContext";
import type { KatanaInventoryItem } from "../models/katana";
import { useCallback, useEffect, useMemo, useState } from "react";
import { katanaFetch } from "../lib/katanaFetch";
import { KATANA_API_ROUTES } from "../lib/routes/routes";
import { useError } from "../hooks/useError";

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [inventory, setInventory] = useState<Map<number, KatanaInventoryItem>>(new Map());
    const [loading, setLoading] = useState<boolean>(true);
    const { setErrorMessage } = useError();

    // Shared refetch handler for background updates & manual triggers
    const refetchInventory = useCallback(async () => {
        console.log("Refetching inventory")

        const inventoryRes = await katanaFetch<KatanaInventoryItem[]>(KATANA_API_ROUTES.INVENTORY);
        console.log(inventoryRes)

        if (inventoryRes.success && Array.isArray(inventoryRes.data)) {
            const iMap = new Map<number, KatanaInventoryItem>();
            inventoryRes.data.forEach((i) => iMap.set(i.variant_id, i));
            setInventory(iMap);
            
        } else {
            console.log("Failed to sync inv data")
            setErrorMessage("Failed to sync inventory data.");
        }
    }, [setErrorMessage]);

    // Initial mount load using unmount flag safety
    useEffect(() => {
        let isMounted = true;

        const loadInitialData = async () => {
            const inventoryRes = await katanaFetch<KatanaInventoryItem[]>(KATANA_API_ROUTES.INVENTORY);

            if (!isMounted) return;

            if (inventoryRes.success && Array.isArray(inventoryRes.data)) {
                const iMap = new Map<number, KatanaInventoryItem>();
                inventoryRes.data.forEach((i) => iMap.set(i.variant_id, i));
                setInventory(iMap);
            } else {
                setErrorMessage("Failed to load inventory data.");
            }

            setLoading(false);
        };

        loadInitialData();

        return () => {
            isMounted = false;
        };
    }, [setErrorMessage]);

    const contextValue = useMemo(() => ({
        inventory,
        loading,
        refetchInventory,
    }), [inventory, loading, refetchInventory]);

    return (
        <InventoryContext.Provider value={contextValue}>
            {children}
        </InventoryContext.Provider>
    );
};