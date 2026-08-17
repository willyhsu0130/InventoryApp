import {
    useState,
    useCallback,
    useEffect,
    type FC,
    type ReactNode,
} from "react";
import { VariantContext } from "./VariantContext";
import { variantService } from "@/services/variantService";
import type {
    ProductVariant,
    CreateVariantInput,
    UpdateVariantInput,
} from "@my-inventory-app/shared";
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

export const VariantProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [variants, setVariants] = useState<Map<number, ProductVariant>>(new Map());
    const [loading, setLoading] = useState<boolean>(true);
    const { setErrorMessage } = useError();

    // 1. Fetch all active variants
    const refetchVariants = useCallback(async () => {
        try {
            const data = await variantService.getAll();
            const nextMap = new Map<number, ProductVariant>();
            data.forEach((v) => nextMap.set(v.id, v));
            setVariants(nextMap);
        } catch (err: unknown) {
            setErrorMessage(getErrorMessage(err, "Failed to sync variants."));
        }
    }, [setErrorMessage]);

    // Initial fetch on mount
    useEffect(() => {
        let isMounted = true;

        const loadInitialData = async () => {
            await refetchVariants();
            if (isMounted) setLoading(false);
        };

        void loadInitialData();

        return () => {
            isMounted = false;
        };
    }, [refetchVariants]);

    // 2. Create Variant
    const createVariant = useCallback(
        async (input: CreateVariantInput): Promise<ProductVariant> => {
            try {
                const createdVariant = await variantService.create(input);
                setVariants((prev) => new Map(prev).set(createdVariant.id, createdVariant));
                return createdVariant;
            } catch (err: unknown) {
                const errorMsg = getErrorMessage(err, "Failed to create variant");
                setErrorMessage(errorMsg);
                throw new Error(errorMsg, { cause: err });
            }
        },
        [setErrorMessage]
    );

    // 3. Edit / Update Variant
    const editVariant = useCallback(
        async (id: number, input: UpdateVariantInput): Promise<ProductVariant> => {
            try {
                const updatedVariant = await variantService.update(id, input);
                setVariants((prev) => new Map(prev).set(updatedVariant.id, updatedVariant));
                return updatedVariant;
            } catch (err: unknown) {
                const errorMsg = getErrorMessage(err, "Failed to update variant");
                setErrorMessage(errorMsg);
                throw new Error(errorMsg, { cause: err });
            }
        },
        [setErrorMessage]
    );

    // 4. Delete Variant
    const deleteVariant = useCallback(
        async (id: number): Promise<void> => {
            try {
                await variantService.delete(id);
                setVariants((prev) => {
                    const next = new Map(prev);
                    next.delete(id);
                    return next;
                });
            } catch (err: unknown) {
                const message = getErrorMessage(err, "Failed to delete variant.");
                setErrorMessage(message);
                throw new Error(message, { cause: err });
            }
        },
        [setErrorMessage]
    );

    return (
        <VariantContext.Provider
            value={{
                variants,
                loading,
                refetchVariants,
                createVariant,
                editVariant,
                deleteVariant,
            }}
        >
            {children}
        </VariantContext.Provider>
    );
};