import { createContext } from "react";
export interface KatanaVariant {
    id: number;
    product_id: number | null;
    material_id: number | null;
    sku: string | null;
    type: "product" | "material";
    config_attributes?: { config_name: string; config_value: string }[];
}

export interface KatanaProduct {
    id: number;
    name: string;
    uom: string;
    category_name?: string;
    type: string;
}

export interface ResolvedVariantInfo {
    product_name: string;
    variant_details: string | null;
    sku: string;
    uom: string;
    category_name: string;
}

interface ProductContextType {
    variants: Map<number, KatanaVariant>; // <-- Add this
    loading: boolean;
    error: string | null;
    getVariantDetails: (variant_id: number) => ResolvedVariantInfo;
    refetchProducts: () => Promise<void>;
}

export const ProductContext = createContext<ProductContextType | undefined>(undefined);


