import { useState, useCallback, useEffect } from "react";
import { katanaFetch } from "../lib/katanaFetch";
import { ProductContext, type SavedDraftVariant } from "./ProductContext";
import type { KatanaProductDraftVariant, ResolvedVariantInfo } from "../models/katana/productVariant";

import {
    convertProductToCreatePayload,
    convertProductToPayload,
    convertVariantToCreatePayload,
    convertVariantToPayload,
    type KatanaProduct,
    type KatanaProductDraft,
    type KatanaVariant,
} from "../models/katana/productVariant";
import { KATANA_API_ROUTES } from "../lib/routes/routes";
import { useError } from "../hooks/useError";

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [variants, setVariants] = useState<Map<number, KatanaVariant>>(new Map());
    const [products, setProducts] = useState<Map<number, KatanaProduct>>(new Map());
    const [loading, setLoading] = useState<boolean>(true);
    const { setErrorMessage } = useError();

    // Shared refetch handler for background updates
    const refetchProducts = useCallback(async () => {
        const [variantsRes, productsRes] = await Promise.all([
            katanaFetch<KatanaVariant[]>(KATANA_API_ROUTES.VARIANTS),
            katanaFetch<KatanaProduct[]>(KATANA_API_ROUTES.PRODUCTS),
        ]);

        if (variantsRes.success && Array.isArray(variantsRes.data)) {
            const vMap = new Map<number, KatanaVariant>();
            variantsRes.data.forEach((v) => vMap.set(v.id, v));
            setVariants(vMap);
        }

        if (productsRes.success && Array.isArray(productsRes.data)) {
            const pMap = new Map<number, KatanaProduct>();
            productsRes.data.forEach((p) => pMap.set(p.id, p));
            setProducts(pMap);
        }

        if (!variantsRes.success || !productsRes.success) {
            setErrorMessage("Failed to sync product metadata.");
        }
    }, [setErrorMessage]);

    // Initial mount sync
    useEffect(() => {
        let isMounted = true;

        const loadInitialData = async () => {
            const [variantsRes, productsRes] = await Promise.all([
                katanaFetch<KatanaVariant[]>(KATANA_API_ROUTES.VARIANTS),
                katanaFetch<KatanaProduct[]>(KATANA_API_ROUTES.PRODUCTS),
            ]);

            if (!isMounted) return;

            if (variantsRes.success && Array.isArray(variantsRes.data)) {
                const vMap = new Map<number, KatanaVariant>();
                variantsRes.data.forEach((v) => vMap.set(v.id, v));
                setVariants(vMap);
            }

            if (productsRes.success && Array.isArray(productsRes.data)) {
                const pMap = new Map<number, KatanaProduct>();
                productsRes.data.forEach((p) => pMap.set(p.id, p));
                setProducts(pMap);
            }

            if (!variantsRes.success || !productsRes.success) {
                setErrorMessage("Failed to sync product metadata.");
            }

            setLoading(false);
        };

        loadInitialData();

        return () => {
            isMounted = false;
        };
    }, [setErrorMessage]);

    // Get variant details helper function
    const getVariantDetails = useCallback(
        (variantId: number): ResolvedVariantInfo => {
            for (const product of products.values()) {
                const variant = product.variants?.find((v) => v.id === variantId);
                if (variant) {
                    const variantDetails = variant.config_attributes?.length
                        ? variant.config_attributes.map((a) => a.config_value).join(" / ")
                        : null;

                    return {
                        productId: product.id,
                        product_name: product.name,
                        variant_details: variantDetails,
                        sku: variant.sku || "",
                        uom: product.uom || "pcs",
                        category_id: null,
                        batch_tracked: product.batch_tracked ?? false,
                    };
                }
            }

            return {
                productId: -1,
                product_name: `Variant #${variantId}`,
                variant_details: null,
                sku: "",
                uom: "pcs",
                category_id: null,
                batch_tracked: false,
            };
        },
        [products]
    );

    const editProduct = useCallback(async (updatedProduct: KatanaProductDraft) => {
        const payload = convertProductToPayload(updatedProduct);
        const endpoint = KATANA_API_ROUTES.PRODUCT_BY_ID(updatedProduct.id);

        const res = await katanaFetch<KatanaProduct>(endpoint, {
            method: "PATCH",
            body: JSON.stringify(payload),
        });

        if (!res.success || !res.data) {
            const msg = "Update failed";
            setErrorMessage(msg);
            throw new Error(msg);
        }

        // 👈 FIX: Update local product Map on successful patch
        setProducts((prev) => new Map(prev).set(res.data.id, res.data));
    }, [setErrorMessage]);

    const deleteProduct = useCallback(async (id: KatanaProduct["id"]) => {
        const endpoint = KATANA_API_ROUTES.PRODUCT_BY_ID(id);

        const res = await katanaFetch<void>(endpoint, {
            method: "DELETE",
        });

        if (!res.success) {
            const message = res.message || "Delete failed";
            setErrorMessage(message);
            throw new Error(message);
        }

        setProducts((prev) => {
            const next = new Map(prev);
            next.delete(id);
            return next;
        });
    }, [setErrorMessage]);

    const editVariant = useCallback(async (updatedVariant: SavedDraftVariant): Promise<KatanaVariant> => {
        const payload = convertVariantToPayload(updatedVariant);
        const endpoint = KATANA_API_ROUTES.VARIANT_BY_ID(updatedVariant.id);

        const res = await katanaFetch<KatanaVariant>(endpoint, {
            method: "PATCH",
            body: JSON.stringify(payload),
        });

        if (!res.success || !res.data) {
            const errorMsg = "Failed to update variant";
            setErrorMessage(errorMsg);
            throw new Error(errorMsg);
        }

        const savedVariant = res.data;

        // 👈 FIX: Sync local variants state and parent product's nested variants array
        setVariants((prev) => new Map(prev).set(savedVariant.id, savedVariant));

        setProducts((prev) => {
            const next = new Map(prev);
            const parentProduct = next.get(savedVariant.product_id);

            if (parentProduct) {
                const updatedVariants = parentProduct.variants.map((v) =>
                    v.id === savedVariant.id ? savedVariant : v
                );
                next.set(parentProduct.id, {
                    ...parentProduct,
                    variants: updatedVariants,
                });
            }
            return next;
        });

        return savedVariant;
    }, [setErrorMessage]);


    const deleteVariant = useCallback(async (id: number): Promise<void> => {
        if (!id) return
        const endpoint = KATANA_API_ROUTES.VARIANT_BY_ID(id)

        const res = await katanaFetch<void>(endpoint, {
            method: "DELETE",
        });

        if (!res.success) {
            const message = res.message || "Failed to delete variant.";
            setErrorMessage(message);
            throw new Error(message);
        }

        // Update local variants map
        setVariants((prev) => {
            const next = new Map(prev);
            next.delete(id);
            return next;
        });

        // Update parent product's nested variants array
        setProducts((prev) => {
            const next = new Map(prev);
            for (const [productId, product] of next.entries()) {
                if (product.variants?.some((v) => v.id === id)) {
                    next.set(productId, {
                        ...product,
                        variants: product.variants.filter((v) => v.id !== id),
                    });
                    break;
                }
            }
            return next;
        });
    }, [setErrorMessage]);

    const createProduct = useCallback(async (draft: KatanaProductDraft): Promise<KatanaProduct> => {
        const payload = convertProductToCreatePayload(draft);

        const res = await katanaFetch<KatanaProduct>(KATANA_API_ROUTES.PRODUCTS, {
            method: "POST",
            body: JSON.stringify(payload),
        });

        if (!res.success || !res.data) {
            const errorMsg = "Failed to create product";
            setErrorMessage(errorMsg);
            throw new Error(errorMsg);
        }

        await refetchProducts();
        return res.data;
    }, [refetchProducts, setErrorMessage]);

    const createVariant = useCallback(
    async (draft: KatanaProductDraftVariant, productId: number): Promise<KatanaVariant> => {
        const payload = convertVariantToCreatePayload(draft, productId);

        const res = await katanaFetch<KatanaVariant>(KATANA_API_ROUTES.VARIANTS, {
            method: "POST",
            body: JSON.stringify(payload),
        });

        if (!res.success || !res.data) {
            const errorMsg = "Failed to create variant";
            setErrorMessage(errorMsg);
            throw new Error(errorMsg);
        }

        const createdVariant = res.data;

        // 1. Sync variants map
        setVariants((prev) => new Map(prev).set(createdVariant.id, createdVariant));

        // 2. Sync parent product's nested variants array
        setProducts((prev) => {
            const next = new Map(prev);
            const parent = next.get(productId);
            if (parent) {
                next.set(productId, {
                    ...parent,
                    variants: [...(parent.variants || []), createdVariant],
                });
            }
            return next;
        });

        return createdVariant;
    },
    [setErrorMessage]
);

    return (
        <ProductContext.Provider
            value={{
                variants,
                products,
                loading,
                getVariantDetails,
                refetchProducts,
                editProduct,
                editVariant,
                createProduct,
                createVariant,
                deleteProduct,
                deleteVariant
            }}
        >
            {children}
        </ProductContext.Provider>
    );
};