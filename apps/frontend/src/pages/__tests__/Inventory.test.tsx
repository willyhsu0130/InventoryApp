// src/pages/__tests__/Inventory.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ProductProvider } from "@/context/product/ProductProvider";
import { VariantProvider } from "@/context/variant/VariantProvider";
import { InventoryProvider } from "@/context/inventory/InventoryProvider";
import { Inventory } from "../Inventory";
import { inventoryService } from "@/services/inventoryMovementService";
import { productService } from "@/services/productService";
import { variantService } from "@/services/variantService";
import type {
    KatanaInventoryItem,
    KatanaProduct,
    ProductVariant,
    KatanaStockAdjustment,
} from "@my-inventory-app/shared";

// 1. Mock Services
vi.mock("@/services/inventoryService", () => ({
    inventoryService: {
        getInventoryLevels: vi.fn(),
        getBatches: vi.fn(),
        getStockAdjustments: vi.fn(),
        createStockAdjustment: vi.fn(),
    },
}));

vi.mock("@/services/productService", () => ({
    productService: {
        getAll: vi.fn(),
    },
}));

vi.mock("@/services/variantService", () => ({
    variantService: {
        getAll: vi.fn(),
    },
}));

vi.mock("@/hooks/useError", () => ({
    useError: () => ({
        errorMessage: "",
        warningMessage: "",
        setErrorMessage: vi.fn(),
        setWarningMessage: vi.fn(),
        clearError: vi.fn(),
        clearWarning: vi.fn(),
        clearAll: vi.fn(),
    }),
}));

const mockedInventoryService = vi.mocked(inventoryService);
const mockedProductService = vi.mocked(productService);
const mockedVariantService = vi.mocked(variantService);

// 2. Mock Fixtures
const mockProduct: KatanaProduct = {
    id: 1,
    name: "Arabica Coffee Beans",
    type: "product",
    category_name: "Coffee",
    uom: "bags",
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
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    archived_at: null,
    deleted_at: null,
    configs: [],
};

const mockVariant: ProductVariant = {
    id: 101,
    product_id: 1,
    type: "product",
    sku: "COF-ARB-01",
    sales_price: 20,
    purchase_price: 10,
    config_attributes: [{ config_name: "Roast", config_value: "Medium" }],
    supplier_item_codes: [],
    custom_fields: [],
    internal_barcode: null,
    registered_barcode: null,
    material_id: null,
    lead_time: null,
    minimum_order_quantity: null,
    abc_classification: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
};

const mockInventoryInitial: KatanaInventoryItem = {
    variant_id: 101,
    location_id: 1,
    quantity_in_stock: 50,
    quantity_committed: 0,
    quantity_expected: 0,
    quantity_missing_or_excess: 50,
    average_cost: 10,
    value_in_stock: 500,
    reorder_point: 5,
};

const mockInventoryUpdated: KatanaInventoryItem = {
    ...mockInventoryInitial,
    quantity_in_stock: 65,
    quantity_missing_or_excess: 65,
    value_in_stock: 650,
};

describe("<Inventory /> Page Integration", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mockedProductService.getAll.mockResolvedValue([mockProduct]);
        mockedVariantService.getAll.mockResolvedValue([mockVariant]);
        mockedInventoryService.getBatches.mockResolvedValue([]);
        mockedInventoryService.getStockAdjustments.mockResolvedValue([]);
    });

    it("updates table values after submitting stock adjustment modal", async () => {
        let currentInventory = [mockInventoryInitial];
        mockedInventoryService.getInventoryLevels.mockImplementation(async () => currentInventory);

        const createdAdjustment: KatanaStockAdjustment = {
            id: 10,
            location_id: 1,
            stock_adjustment_number: "SA-0010",
            stock_adjustment_date: new Date().toISOString(),
            reason: "Surplus inventory",
            stock_adjustment_rows: [{ id: 1, variant_id: 101, quantity: 15 }],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        mockedInventoryService.createStockAdjustment.mockImplementation(async () => {
            currentInventory = [mockInventoryUpdated]; // simulate DB update
            return createdAdjustment;
        });

        render(
            <MemoryRouter initialEntries={["/inventory"]}>
                <ProductProvider>
                    <VariantProvider>
                        <InventoryProvider>
                            <Inventory />
                        </InventoryProvider>
                    </VariantProvider>
                </ProductProvider>
            </MemoryRouter>
        );

        // 1. Wait for initial page data to load in the table
        const cell = await screen.findByText("Arabica Coffee Beans");
        expect(cell).toBeInTheDocument();

        // 2. Click the table row to open Stock Adjustment modal
        const tableRow = document.getElementById("101")!;
        fireEvent.click(tableRow);

        // 3. Find the quantity number input inside the modal and change to 65
        const targetInput = await screen.findByDisplayValue("50");
        fireEvent.change(targetInput, { target: { value: "65" } });

        // 4. Fill in the optional adjustment reason
        const reasonInput = screen.getByPlaceholderText("例如: 盤點差異、耗損");
        fireEvent.change(reasonInput, { target: { value: "Surplus inventory" } });

        // 5. Submit modal using the Save button
        const saveButton = screen.getByRole("button", { name: /儲存|確定|確認/i });
        fireEvent.click(saveButton);

        // 6. Verify service was called with the calculated delta (+15)
        await waitFor(() => {
            expect(mockedInventoryService.createStockAdjustment).toHaveBeenCalledWith(
                expect.objectContaining({
                    location_id: 1,
                    reason: "Surplus inventory",
                    stock_adjustment_rows: [{ variant_id: 101, quantity: 15 }],
                })
            );
        });

        // 7. Verify the inventory table on the page refreshed to 65
        // 7. Verify the inventory table on the page refreshed to 65
        await waitFor(() => {
            const row = document.getElementById("101")!;
            expect(row).toBeInTheDocument();
            expect(row.textContent).toContain("65 bags");
            expect(row.textContent).toContain("$650.00");
            expect(row.textContent).not.toContain("50 bags");
        });
    });
});