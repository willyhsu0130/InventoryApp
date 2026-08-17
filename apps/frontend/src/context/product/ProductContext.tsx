import { createContext } from "react";
import type {
    KatanaProduct,
    KatanaProductDraft,
    KatanaProductDraftVariant,
    KatanaVariant,
    ResolvedVariantInfo
} from "../../models/katana/productVariant";

/** A variant that already exists in Katana, so it can be PATCHed by id. */
export type SavedDraftVariant = KatanaProductDraftVariant & { id: number };


export interface ProductContextType {
    products: Map<number, KatanaProduct>;
    variants: Map<number, KatanaVariant>; // <-- Add this
    loading: boolean;
    getVariantDetails: (variant_id: number) => ResolvedVariantInfo;
    refetchProducts: () => Promise<void>;
    editProduct: (updatedProduct: KatanaProductDraft) => Promise<void>
    editVariant: (updatedProduct: SavedDraftVariant) => Promise<KatanaVariant>
    createVariant: (draft: KatanaProductDraftVariant, productId: number) => Promise<KatanaVariant>;
    /** POST /products. Resolves to the product Katana created. */
    createProduct: (draft: KatanaProductDraft) => Promise<KatanaProduct>
    deleteProduct: (id: KatanaProduct["id"]) => Promise<void>
    deleteVariant: (id: KatanaVariant["id"]) => Promise<void>
}

export const ProductContext = createContext<ProductContextType | undefined>(undefined);