import { useState, useCallback, useEffect, useMemo } from "react";
import { katanaFetch } from "../lib/katanaFetch";
import { ProductContext, type KatanaProduct, type KatanaVariant, type ResolvedVariantInfo } from "./ProductContext";
import { KATANA_API_ROUTES } from "../lib/routes/routes";

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [variants, setVariants] = useState<Map<number, KatanaVariant>>(new Map());
    const [products, setProducts] = useState<Map<number, KatanaProduct>>(new Map());
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Shared refetch handler for manual triggers
    const refetchProducts = useCallback(async () => {
        setLoading(true);
        setError(null);

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
            setError("Failed to sync product metadata.");
        }

        setLoading(false);
    }, []);

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
                setError("Failed to sync product metadata.");
            }

            setLoading(false);
        };

        loadInitialData();

        return () => {
            isMounted = false;
        };
    }, []);

    const getVariantDetails = useMemo(() => {
        return (variant_id: number): ResolvedVariantInfo => {
            const variant = variants.get(variant_id);
            const product = variant?.product_id ? products.get(variant.product_id) : null;

            const variant_details = variant?.config_attributes?.length
                ? variant.config_attributes.map((a) => a.config_value).join(" / ")
                : null;

            return {
                product_name: product?.name ?? `Variant #${variant_id}`,
                variant_details,
                sku: variant?.sku ?? "N/A",
                uom: product?.uom ?? "pcs",
                category_name: product?.category_name ?? "Uncategorized",
            };
        };
    }, [variants, products]);

    return (
        <ProductContext.Provider
            value={{
                variants,
                loading,
                error,
                getVariantDetails,
                refetchProducts,
            }}
        >
            {children}
        </ProductContext.Provider>
    );
};
