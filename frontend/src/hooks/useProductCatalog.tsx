import { useContext } from "react";
import { ProductContext
    
 } from "../context/ProductContext";
export const useProductCatalog = () => {
    const context = useContext(ProductContext);
    if (!context) {
        throw new Error("useProductCatalog must be used within a ProductProvider");
    }
    return context;
};