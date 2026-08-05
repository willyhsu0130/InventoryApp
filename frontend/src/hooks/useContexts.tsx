import { useContext } from "react";
import {
    ProductContext

} from "../context/ProductContext";

import { InventoryContext } from "../context/InventoryContext";
export const useProductCatalog = () => {
    const context = useContext(ProductContext);
    if (!context) {
        throw new Error("useProductCatalog must be used within a ProductProvider");
    }
    return context;
};

export const useInventoryCatalog = () => {
    const context = useContext(InventoryContext);
    if (!context) {
        throw new Error("useInventoryCatalog must be used within a InventoryProvider");
    }
    return context;
}