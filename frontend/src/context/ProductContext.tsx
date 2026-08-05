import { createContext } from "react";
import type { KatanaProduct, KatanaVariant } from "../models/katana";

export interface ResolvedVariantInfo {
    productId: number
    product_name: string;
    variant_details: string | null;
    sku: string;
    uom: string;
    category_name: string;
}

interface ProductContextType {
    products: Map<number, KatanaProduct>;
    variants: Map<number, KatanaVariant>; // <-- Add this
    loading: boolean;
    getVariantDetails: (variant_id: number) => ResolvedVariantInfo;
    refetchProducts: () => Promise<void>;
    editProduct: (updatedProduct: KatanaProduct) => Promise<void>
    editVariant: (updatedProduct: KatanaVariant) => Promise<KatanaVariant>
}

export const ProductContext = createContext<ProductContextType | undefined>(undefined);