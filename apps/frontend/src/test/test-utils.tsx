// src/test/test-utils.tsx
import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { ProductContext, type ProductContextType } from "@/context/product/ProductContext";
import { InventoryContext, type InventoryContextType } from "@/context/inventory/InventoryContext";
import { ErrorContext, type ErrorContextType } from "@/context/error/ErrorContext";

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
    productContextValue?: Partial<ProductContextType>;
    inventoryContextValue?: Partial<InventoryContextType>;
    errorContextValue?: Partial<ErrorContextType>;
}

export function renderWithProviders(
    ui: ReactElement,
    {
        productContextValue = {},
        inventoryContextValue = {},
        errorContextValue = {},
        ...renderOptions
    }: CustomRenderOptions = {}
) {
    const defaultProductContext: ProductContextType = {
        products: new Map(),
        variants: new Map(),
        loading: false,
        refetchProducts: vi.fn().mockResolvedValue(undefined),
        createProduct: vi.fn(),
        editProduct: vi.fn().mockResolvedValue(undefined),
        deleteProduct: vi.fn().mockResolvedValue(undefined),
        createVariant: vi.fn(),
        editVariant: vi.fn(),
        deleteVariant: vi.fn().mockResolvedValue(undefined),
        getVariantDetails: vi.fn().mockReturnValue({
            productId: -1,
            product_name: "Mock Product",
            variant_details: null,
            sku: "MOCK-SKU",
            uom: "pcs",
            category_id: null,
            batch_tracked: false,
        }),
        ...productContextValue,
    };

    const defaultInventoryContext: InventoryContextType = {
        inventory: new Map(),
        batch: new Map(), // 👈 Fixes incompatible 'batch' property
        loading: false,
        refetchInventory: vi.fn().mockResolvedValue(undefined),
        createBatch: vi.fn().mockResolvedValue(undefined),
        createStockAdjustment: vi.fn().mockResolvedValue(undefined),
        ...inventoryContextValue,
    };

    const defaultErrorContext: ErrorContextType = {
        errorMessage: "",
        setErrorMessage: vi.fn(),
        warningMessage: "", // 👈 Fixes incompatible 'warningMessage' property
        setWarningMessage: vi.fn(),
        clearErrorMessages: vi.fn(),
        ...errorContextValue,
    };

    const Wrapper = ({ children }: { children: ReactNode }) => (
        <ErrorContext.Provider value={defaultErrorContext}>
            <ProductContext.Provider value={defaultProductContext}>
                <InventoryContext.Provider value={defaultInventoryContext}>
                    {children}
                </InventoryContext.Provider>
            </ProductContext.Provider>
        </ErrorContext.Provider>
    );

    return {
        user: userEvent.setup(),
        ...render(ui, { wrapper: Wrapper, ...renderOptions }),
        mockProductContext: defaultProductContext,
        mockInventoryContext: defaultInventoryContext,
        mockErrorContext: defaultErrorContext,
    };
}