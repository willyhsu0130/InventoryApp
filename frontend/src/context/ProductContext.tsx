import { createContext } from "react";
import type {
    KatanaProduct,
    KatanaProductDraft,
    KatanaProductDraftVariant,
    KatanaVariant,
} from "../models/katana";

/** A variant that already exists in Katana, so it can be PATCHed by id. */
export type SavedDraftVariant = KatanaProductDraftVariant & { id: number };

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
    editProduct: (updatedProduct: KatanaProductDraft) => Promise<void>
    editVariant: (updatedProduct: SavedDraftVariant) => Promise<KatanaVariant>
    /** POST /products. Resolves to the product Katana created. */
    createProduct: (draft: KatanaProductDraft) => Promise<KatanaProduct>
}

export const ProductContext = createContext<ProductContextType | undefined>(undefined);