import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Products } from "../Products";
import type { KatanaProduct, ProductVariant } from "@my-inventory-app/shared";

const mockProduct: KatanaProduct = {
    id: 1,
    name: "Keyboard",
    type: "product",
    category_name: "Electronics",
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

const mockVariant: ProductVariant = {
    id: 10,
    product_id: 1,
    type: "product",
    sku: "KB-01",
    sales_price: 100,
    purchase_price: 50,
    config_attributes: [],
    supplier_item_codes: [],
    custom_fields: [],
    internal_barcode: null,
    registered_barcode: null,
    material_id: null,
    lead_time: null,
    minimum_order_quantity: null,
    abc_classification: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
};

const refetchProductsMock = vi.fn().mockResolvedValue(undefined);
const refetchVariantsMock = vi.fn().mockResolvedValue(undefined);
const deleteProductMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/hooks/useError", () => ({
    useError: () => ({
        errorMessage: null,
        setErrorMessage: vi.fn(),
        clearError: vi.fn(),
    }),
}));

vi.mock("@/hooks/useContexts", () => ({
    useProductCatalog: vi.fn(() => ({
        products: new Map<number, KatanaProduct>([[1, mockProduct]]),
        loading: false,
        refetchProducts: refetchProductsMock,
        deleteProduct: deleteProductMock,
    })),
    useVariant: vi.fn(() => ({
        variants: new Map<number, ProductVariant>([[10, mockVariant]]),
        loading: false,
        refetchVariants: refetchVariantsMock,
    })),
    useInventoryCatalog: () => ({
        inventoryItems: new Map(),
        loading: false,
    }),
}));

describe("<Products /> Page", () => {
    it("renders product list and opens create modal when new button clicked", () => {
        const { container } = render(<Products />);

        expect(screen.getByText("Keyboard")).toBeInTheDocument();

        const newBtn = container.querySelector("#createButton");
        expect(newBtn).toBeTruthy();

        fireEvent.click(newBtn!);

        expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("triggers refetch for products and variants when refresh button is clicked", () => {
        render(<Products />);

        const refreshBtn = screen.getByRole("button", { name: /重新整理目錄/i });
        fireEvent.click(refreshBtn);

        expect(refetchProductsMock).toHaveBeenCalledTimes(1);
        expect(refetchVariantsMock).toHaveBeenCalledTimes(1);
    });
});