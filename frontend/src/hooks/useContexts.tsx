import { useContext } from "react";
import {
    ProductContext

} from "../context/ProductContext";

import { InventoryContext } from "../context/InventoryContext";
import { OrdersContext } from "@/context/orders/OrdersContext"
import { CustomersContext } from "@/context/customers/CustomersContext";

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

export const useOrdersCatalog = () => {
    const context = useContext(OrdersContext);
    if (!context) {
        throw new Error("useOrdersCatalog must be used within a OrdersProvider");
    }
    return context;
}


export const useCustomersCatalog = () => {
    const context = useContext(CustomersContext);
    if (!context) {
        throw new Error("useCustomersCatalog must be used within a CustomerProvider");
    }
    return context;
}