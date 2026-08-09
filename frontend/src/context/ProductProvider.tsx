import { useState, useCallback, useEffect, useMemo } from "react";
import { katanaFetch } from "../lib/katanaFetch";
import { ProductContext, type ResolvedVariantInfo, type SavedDraftVariant } from "./ProductContext";

import {
    convertProductToCreatePayload,
    convertProductToPayload,
    convertVariantToPayload,
    type KatanaProduct,
    type KatanaProductDraft,
    type KatanaVariant,
} from "../models/katana";
import { KATANA_API_ROUTES } from "../lib/routes/routes";
import { useError } from "../hooks/useError";

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [variants, setVariants] = useState<Map<number, KatanaVariant>>(new Map());
    const [products, setProducts] = useState<Map<number, KatanaProduct>>(new Map());
    const [loading, setLoading] = useState<boolean>(true);
    const { setErrorMessage } = useError()

    // Shared refetch handler for manual triggers
    // Shared refetch handler for background updates (does NOT trigger top-level page loading screens)
    const refetchProducts = useCallback(async () => {
        const [variantsRes, productsRes] = await Promise.all([
            katanaFetch<KatanaVariant[]>(KATANA_API_ROUTES.VARIANTS),
            katanaFetch<KatanaProduct[]>(KATANA_API_ROUTES.PRODUCTS),
        ]);

        if (variantsRes.success && Array.isArray(variantsRes.data)) {
            const vMap = new Map<number, KatanaVariant>();
            variantsRes.data.forEach((v) => vMap.set(v.id, v));
            setVariants(vMap); // React seamlessly merges new variants without unmounting UI
        }

        if (productsRes.success && Array.isArray(productsRes.data)) {
            const pMap = new Map<number, KatanaProduct>();
            productsRes.data.forEach((p) => pMap.set(p.id, p));
            setProducts(pMap); // React seamlessly updates products Map
        }
        if (!variantsRes.success || !productsRes.success) {
            setErrorMessage("Failed to sync product metadata.");
        }
    }, [setErrorMessage]);

    // Initial mount sync using unmount flag safety
    useEffect(() => {
        let isMounted = true;

        const loadInitialData = async () => {
            const [variantsRes, productsRes] = await Promise.all([
                katanaFetch<KatanaVariant[]>(KATANA_API_ROUTES.VARIANTS),
                katanaFetch<KatanaProduct[]>(KATANA_API_ROUTES.PRODUCTS),
            ]);

            if (!isMounted) return;

            if (variantsRes.success && Array.isArray(variantsRes.data)) {
                // Turn katana variant into a map
                const vMap = new Map<number, KatanaVariant>();
                variantsRes.data.forEach((v) => vMap.set(v.id, v));
                setVariants(vMap);
            }

            if (productsRes.success && Array.isArray(productsRes.data)) {
                // Turn katana product into a map
                const pMap = new Map<number, KatanaProduct>();
                productsRes.data.forEach((p) => pMap.set(p.id, p));
                setProducts(pMap);
            }
            // Error hadnling =
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
    const getVariantDetails = useMemo(() => {
        return (variant_id: number): ResolvedVariantInfo => {
            // get the variant object according to its id using the map
            const variant = variants.get(variant_id);

            // find the product matching the variant
            const product = variant?.product_id ? products.get(variant.product_id) : null;

            // find the product details
            const variant_details = variant?.config_attributes?.length
                ? variant.config_attributes.map((a) => a.config_value).join(" / ")
                : null;

            return {
                productId: product?.id || 0,
                product_name: product?.name ?? `Variant #${variant_id}`,
                variant_details,
                sku: variant?.sku ?? "N/A",
                uom: product?.uom ?? "pcs",
                category_name: product?.name ?? "Uncategorized",
            };
        };
    }, [variants, products]);

    const editProduct = useCallback(async (updatedProduct: KatanaProductDraft) => {
        // 1. Convert KatanaProduct to KatanaUpdateProductPayload by extracting only writable fields
        const payload = convertProductToPayload(updatedProduct);

        // 2. Call the PATCH /products/{id} endpoint
        const endpoint = KATANA_API_ROUTES.PRODUCT_BY_ID(updatedProduct.id);

        const res = await katanaFetch<KatanaProduct>(endpoint, {
            method: "PATCH",
            body: JSON.stringify(payload),
        });

        if (!res.success) {
            setErrorMessage(res.message || "Update failed");
            throw new Error(res.message); // Rethrow so modal UI knows save failed
        }
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
        // 1. Convert KatanaVariant to KatanaUpdateVariantPayload (writable/sanitized fields)
        const payload = convertVariantToPayload(updatedVariant);

        // 2. Call the PATCH /variants/{id} endpoint
        const endpoint = KATANA_API_ROUTES.VARIANT_BY_ID(updatedVariant.id);
        console.log("Syncing variant patch payload:", payload);

        const res = await katanaFetch<KatanaVariant>(endpoint, {
            method: "PATCH",
            body: JSON.stringify(payload),
        });

        if (!res.success) {
            const errorMsg = res.message || "Failed to update variant";
            setErrorMessage(errorMsg);
            throw new Error(errorMsg); // Rethrow so component UI can retain edit/loading state
        }

        const savedVariant = res.data;
        if (!savedVariant) {
            setErrorMessage("Error with saved")
        }
        // 3. Update parent product in local state/cache Map (if storing nested variants inside products)

        return savedVariant;
    }, [setErrorMessage]);


    const createProduct = useCallback(async (draft: KatanaProductDraft): Promise<KatanaProduct> => {
        // POST /products creates the product and all of its variants in one call —
        // `variants` is required with minItems: 1.
        const payload = convertProductToCreatePayload(draft);

        const res = await katanaFetch<KatanaProduct>(KATANA_API_ROUTES.PRODUCTS, {
            method: "POST",
            body: JSON.stringify(payload),
        });

        if (!res.success) {
            const errorMsg = res.message || "Failed to create product";
            setErrorMessage(errorMsg);
            throw new Error(errorMsg); // Rethrow so the form can keep the user's input
        }

        // Katana generates the variant rows, so pull the authoritative copy back
        // rather than trusting the shape of the create response.
        await refetchProducts();

        return res.data;
    }, [refetchProducts, setErrorMessage]);


    return (
        <ProductContext.Provider
            value={{
                variants,
                loading,
                getVariantDetails,
                refetchProducts,
                editProduct,
                editVariant,
                createProduct,
                deleteProduct,
                products
            }}
        >
            {children}
        </ProductContext.Provider>
    );
};