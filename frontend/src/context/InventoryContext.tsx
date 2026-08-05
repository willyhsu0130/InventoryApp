import { createContext } from "react";
import type { KatanaInventoryItem } from "../pages/Inventory";
interface InventoryContextType {
    inventory: Map<number, KatanaInventoryItem>
}

export const InventoryContext = createContext<InventoryContextType | undefined>(undefined);