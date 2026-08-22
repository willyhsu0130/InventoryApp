// apps/frontend/src/context/product/__tests__/ProductProvider.test.tsx

import { useContext } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { ProductContext } from "../ProductContext";
import { ProductProvider } from "../ProductProvider";
import { productService } from "@/services/productService";
import { useError } from "@/hooks/useError";
import { createEmptyProductDraft, type KatanaProduct, type KatanaProductDraft } from "@my-inventory-app/shared";

// Mock productService and useError
vi.mock("@/services/productService", () => ({
    productService: {
        getAll: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock("@/hooks/useError", () => ({
    useError: vi.fn(),
}));

const mockedProductService = vi.mocked(productService);
const mockedUseError = vi.mocked(useError);

const mockProductA: KatanaProduct = {
    id: 1,
    name: "Standard Desk",
    type: "product",
    category_name: "Furniture",
    uom: "pcs",
    batch_tracked: false,
    serial_tracked: false,
    is_sellable: true,
    is_purchasable: true,
    is_producible: false,
    is_auto_assembly: false,
    is_archived: false,
    operations_in_sequence: false,
    purchase_uom: null,
    purchase_uom_conversion_rate: null,
    default_supplier_id: null,
    additional_info: null,
    custom_field_collection_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    archived_at: null,
    deleted_at: null,
    configs: [],
};

const mockProductB: KatanaProduct = {
    ...mockProductA,
    id: 2,
    name: "Ergonomic Chair",
};

const useTestProductContext = () => {
    const context = useContext(ProductContext);
    if (!context) {
        throw new Error("ProductContext must be used within ProductProvider");
    }
    return context;
};

describe("ProductProvider", () => {
    const setErrorMessageMock = vi.fn();

    // apps/frontend/src/context/product/__tests__/ProductProvider.test.tsx

    beforeEach(() => {
        vi.clearAllMocks();
        mockedUseError.mockReturnValue({
            errorMessage: "",
            warningMessage: "",
            setErrorMessage: setErrorMessageMock,
            setWarningMessage: vi.fn(),
            clearError: vi.fn(),
            clearWarning: vi.fn(),
            clearAll: vi.fn(),
        });
    });
    it("fetches products on initial mount and toggles loading flag", async () => {
        mockedProductService.getAll.mockResolvedValue([mockProductA, mockProductB]);

        const { result } = renderHook(() => useTestProductContext(), {
            wrapper: ProductProvider,
        });

        expect(result.current.loading).toBe(true);

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(mockedProductService.getAll).toHaveBeenCalledTimes(1);
        expect(result.current.products.size).toBe(2);
        expect(result.current.products.get(1)).toEqual(mockProductA);
        expect(result.current.products.get(2)).toEqual(mockProductB);
    });

    it("surfaces error to useError when initial mount fetch fails", async () => {
        mockedProductService.getAll.mockRejectedValue(new Error("Network timeout"));

        const { result } = renderHook(() => useTestProductContext(), {
            wrapper: ProductProvider,
        });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(setErrorMessageMock).toHaveBeenCalledWith("Network timeout");
        expect(result.current.products.size).toBe(0);
    });

    it("createProduct creates item, updates map state, and returns created product", async () => {
        mockedProductService.getAll.mockResolvedValue([]);
        mockedProductService.create.mockResolvedValue(mockProductA);

        const { result } = renderHook(() => useTestProductContext(), {
            wrapper: ProductProvider,
        });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Fix: use createEmptyProductDraft() for valid draft types
        const draft: KatanaProductDraft = {
            ...createEmptyProductDraft(),
            name: "Standard Desk",
            uom: "pcs",
        };

        let created: KatanaProduct | undefined;
        await act(async () => {
            created = await result.current.createProduct(draft);
        });

        expect(mockedProductService.create).toHaveBeenCalledWith(draft);
        expect(created).toEqual(mockProductA);
        expect(result.current.products.get(1)).toEqual(mockProductA);
    });

    it("createProduct propagates error to useError and rethrows", async () => {
        mockedProductService.getAll.mockResolvedValue([]);
        mockedProductService.create.mockRejectedValue(new Error("Duplicate product name"));

        const { result } = renderHook(() => useTestProductContext(), {
            wrapper: ProductProvider,
        });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Fix: use createEmptyProductDraft()
        const draft: KatanaProductDraft = {
            ...createEmptyProductDraft(),
            name: "Duplicate Name",
            uom: "pcs",
        };

        await expect(
            act(async () => {
                await result.current.createProduct(draft);
            })
        ).rejects.toThrow("Duplicate product name");

        expect(setErrorMessageMock).toHaveBeenCalledWith("Duplicate product name");
    });

    it("editProduct updates product in state map upon success", async () => {
        mockedProductService.getAll.mockResolvedValue([mockProductA]);
        const updatedProduct: KatanaProduct = { ...mockProductA, name: "Premium Oak Desk" };
        mockedProductService.update.mockResolvedValue(updatedProduct);

        const { result } = renderHook(() => useTestProductContext(), {
            wrapper: ProductProvider,
        });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        const updateDraft: KatanaProductDraft = {
            ...mockProductA,
            name: "Premium Oak Desk",
        };

        await act(async () => {
            await result.current.editProduct(updateDraft);
        });

        expect(mockedProductService.update).toHaveBeenCalledWith(1, updateDraft);
        expect(result.current.products.get(1)?.name).toBe("Premium Oak Desk");
    });

    it("deleteProduct removes item from state map upon success", async () => {
        mockedProductService.getAll.mockResolvedValue([mockProductA, mockProductB]);
        mockedProductService.delete.mockResolvedValue();

        const { result } = renderHook(() => useTestProductContext(), {
            wrapper: ProductProvider,
        });

        await waitFor(() => {
            expect(result.current.products.size).toBe(2);
        });

        await act(async () => {
            await result.current.deleteProduct(1);
        });

        expect(mockedProductService.delete).toHaveBeenCalledWith(1);
        expect(result.current.products.has(1)).toBe(false);
        expect(result.current.products.has(2)).toBe(true);
    });

    it("refetchProducts updates state when called imperatively", async () => {
        mockedProductService.getAll
            .mockResolvedValueOnce([mockProductA])
            .mockResolvedValueOnce([mockProductA, mockProductB]);

        const { result } = renderHook(() => useTestProductContext(), {
            wrapper: ProductProvider,
        });

        await waitFor(() => {
            expect(result.current.products.size).toBe(1);
        });

        await act(async () => {
            await result.current.refetchProducts();
        });

        expect(result.current.products.size).toBe(2);
        expect(result.current.products.get(2)).toEqual(mockProductB);
    });
});