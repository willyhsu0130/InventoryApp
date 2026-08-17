// apps/frontend/src/context/product/ProductContext.ts
import { createContext } from "react";
import type { KatanaProduct, KatanaProductDraft } from "@my-inventory-app/shared";

export interface ProductContextType {
    products: Map<number, KatanaProduct>;
    loading: boolean;
    refetchProducts: () => Promise<void>;
    createProduct: (draft: KatanaProductDraft) => Promise<KatanaProduct>;
    editProduct: (updatedProduct: KatanaProductDraft) => Promise<void>;
    deleteProduct: (id: number) => Promise<void>;
}

export const ProductContext = createContext<ProductContextType | null>(null);