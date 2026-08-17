import { useState, useCallback, useEffect, type FC, type ReactNode } from "react";
import { ProductContext } from "./ProductContext";
import { productService } from "@/services/productService";
import type { KatanaProduct, KatanaProductDraft } from "@my-inventory-app/shared";
import { useError } from "../../hooks/useError";

function getErrorMessage(err: unknown, fallback: string): string {
    if (err instanceof Error) {
        return err.message;
    }
    if (typeof err === "object" && err !== null && "message" in err) {
        return String((err as { message: unknown }).message);
    }
    return fallback;
}

export const ProductProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [products, setProducts] = useState<Map<number, KatanaProduct>>(new Map());
    const [loading, setLoading] = useState<boolean>(true);
    const { setErrorMessage } = useError();

    // Shared refetch handler
    const refetchProducts = useCallback(async () => {
        try {
            const data = await productService.getAll();
            const nextMap = new Map<number, KatanaProduct>();
            data.forEach((prod) => {
                nextMap.set(prod.id, prod);
            });
            setProducts(nextMap);
        } catch (err: unknown) {
            setErrorMessage(getErrorMessage(err, "Failed to sync products."));
        }
    }, [setErrorMessage]);

    // Initial mount sync
    useEffect(() => {
        let isMounted = true;

        const loadInitialData = async () => {
            await refetchProducts();
            if (isMounted) setLoading(false);
        };

        void loadInitialData();

        return () => {
            isMounted = false;
        };
    }, [refetchProducts]);

    // 1. Create Product
    const createProduct = useCallback(
        async (draft: KatanaProductDraft): Promise<KatanaProduct> => {
            try {
                const createdProduct = await productService.create(draft);
                setProducts((prev) => new Map(prev).set(createdProduct.id, createdProduct));
                return createdProduct;
            } catch (err: unknown) {
                const errorMsg = getErrorMessage(err, "Failed to create product");
                setErrorMessage(errorMsg);
                throw new Error(errorMsg, { cause: err });
            }
        },
        [setErrorMessage]
    );

    // 2. Edit Product
    const editProduct = useCallback(
        async (updatedProduct: KatanaProductDraft): Promise<void> => {
            try {
                const saved = await productService.update(updatedProduct.id, updatedProduct);
                setProducts((prev) => new Map(prev).set(saved.id, saved));
            } catch (err: unknown) {
                const msg = getErrorMessage(err, "Update failed");
                setErrorMessage(msg);
                throw new Error(msg, { cause: err });
            }
        },
        [setErrorMessage]
    );

    // 3. Delete Product (Soft delete)
    const deleteProduct = useCallback(
        async (id: KatanaProduct["id"]): Promise<void> => {
            try {
                await productService.delete(id);
                setProducts((prev) => {
                    const next = new Map(prev);
                    next.delete(id);
                    return next;
                });
            } catch (err: unknown) {
                const message = getErrorMessage(err, "Delete failed");
                setErrorMessage(message);
                throw new Error(message, { cause: err });
            }
        },
        [setErrorMessage]
    );

    return (
        <ProductContext.Provider
            value={{
                products,
                loading,
                refetchProducts,
                createProduct,
                editProduct,
                deleteProduct,
            }}
        >
            {children}
        </ProductContext.Provider>
    );
};