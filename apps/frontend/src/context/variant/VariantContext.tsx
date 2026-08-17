import { createContext } from "react";
import type {
    ProductVariant,
    CreateVariantInput,
    UpdateVariantInput,
} from "@my-inventory-app/shared";

export interface VariantContextType {
    variants: Map<number, ProductVariant>;
    loading: boolean;
    refetchVariants: () => Promise<void>;
    createVariant: (input: CreateVariantInput) => Promise<ProductVariant>;
    editVariant: (id: number, input: UpdateVariantInput) => Promise<ProductVariant>;
    deleteVariant: (id: number) => Promise<void>;
}

export const VariantContext = createContext<VariantContextType | null>(null);