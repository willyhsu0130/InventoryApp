import { InventoryContext } from "./InventoryContext";
import type { KatanaInventoryItem } from "../models/katana";
import { useEffect, useMemo, useState } from "react";
import { katanaFetch } from "../lib/katanaFetch";
import { KATANA_API_ROUTES } from "../lib/routes/routes";

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [inventory, setInventory] = useState<Map<number, KatanaInventoryItem>>(new Map());
    useEffect(() => {
        let isMounted = true;

        const loadInitialData = async () => {
            const inventoryRes = await katanaFetch<KatanaInventoryItem[]>(KATANA_API_ROUTES.INVENTORY);

            if (!isMounted) return;

            if (inventoryRes.success && Array.isArray(inventoryRes.data)) {
                // Turn katana variant into a map
                const iMap = new Map<number, KatanaInventoryItem>();
                inventoryRes.data.forEach((i) => iMap.set(i.variant_id, i));
                setInventory(iMap);
            }

            if (!inventoryRes.success) {
                console.log("There's an error")
            }
        };

        loadInitialData();
        return () => {
            isMounted = false;
        };
    }, []);

    const contextValue = useMemo(() => ({
        inventory,
        // Helper function for O(1) lookup
    }), [inventory]);

    return (
        <InventoryContext.Provider value={contextValue}>
            {children}
        </InventoryContext.Provider>
    );
};