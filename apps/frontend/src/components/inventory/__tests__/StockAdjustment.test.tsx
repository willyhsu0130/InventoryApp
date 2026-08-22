import { createRef } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { StockAdjustment, type StockAdjustmentHandle } from "../StockAdjustment";
import type {
    KatanaInventoryItem,
    KatanaProduct,
    ProductVariant,
    KatanaBatch,
    KatanaStockAdjustment,
} from "@my-inventory-app/shared";

// Mock Data Maps
const mockProductMap = new Map<number, KatanaProduct>();
const mockVariantMap = new Map<number, ProductVariant>();
const mockBatchMap = new Map<number, KatanaBatch>();

const createBatchMock = vi.fn();
const createStockAdjustmentMock = vi.fn();

vi.mock("@/hooks/useContexts", () => ({
    useProductCatalog: () => ({
        products: mockProductMap,
        loading: false,
    }),
    useVariant: () => ({
        variants: mockVariantMap,
        loading: false,
    }),
    useInventoryCatalog: () => ({
        batches: mockBatchMap,
        createBatch: createBatchMock,
        createStockAdjustment: createStockAdjustmentMock,
    }),
}));

const mockProductStandard: KatanaProduct = {
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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    archived_at: null,
    deleted_at: null,
    configs: [],
};

const mockProductBatchTracked: KatanaProduct = {
    ...mockProductStandard,
    id: 2,
    name: "Ceremonial Matcha",
    batch_tracked: true,
};

const mockVariant101: ProductVariant = {
    id: 101,
    product_id: 1,
    type: "product",
    sku: "COF-DRK-1K",
    sales_price: 20,
    purchase_price: 10,
    config_attributes: [{ config_name: "Roast", config_value: "Dark Roast" }],
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

const mockVariant102: ProductVariant = {
    ...mockVariant101,
    id: 102,
    product_id: 2,
    sku: "MAT-CER-100",
    config_attributes: [{ config_name: "Grade", config_value: "Ceremonial Grade" }],
};

const mockInventoryItem101: KatanaInventoryItem = {
    variant_id: 101,
    location_id: 1,
    quantity_in_stock: 50,
    quantity_committed: 5,
    quantity_expected: 0,
    quantity_missing_or_excess: 45,
    average_cost: 10,
    value_in_stock: 500,
    reorder_point: 10,
};

const mockInventoryItem102: KatanaInventoryItem = {
    variant_id: 102,
    location_id: 1,
    quantity_in_stock: 20,
    quantity_committed: 0,
    quantity_expected: 0,
    quantity_missing_or_excess: 20,
    average_cost: 30,
    value_in_stock: 600,
    reorder_point: 5,
};

describe("<StockAdjustment />", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mockProductMap.clear();
        mockVariantMap.clear();
        mockBatchMap.clear();

        mockProductMap.set(1, mockProductStandard);
        mockProductMap.set(2, mockProductBatchTracked);

        mockVariantMap.set(101, mockVariant101);
        mockVariantMap.set(102, mockVariant102);
    });

    // ==========================================
    // 1. PRODUCT SELECTION COMBOBOX TESTS
    // ==========================================
    it("dynamically adds selected product via combobox, populates current stock, and excludes it from available options", () => {
        render(
            <StockAdjustment
                items={[mockInventoryItem101, mockInventoryItem102]}
                initialVariantId={null}
                onSuccess={vi.fn()}
            />
        );

        // Initially empty state
        expect(screen.getByText("請在下方新增要調整的商品。")).toBeInTheDocument();

        const addProductSelect = screen.getByDisplayValue("選擇要調整的商品...");

        // Select Product 101 (Arabica Coffee Beans)
        fireEvent.change(addProductSelect, { target: { value: "101" } });

        // Row should now exist with name, attribute config, and stock
        expect(screen.getByText("Arabica Coffee Beans")).toBeInTheDocument();
        expect(screen.getByText("Dark Roast")).toBeInTheDocument();
        expect(screen.getByDisplayValue("50")).toBeInTheDocument();

        // Selected product (101) must be removed from dropdown, leaving only 102
        expect(screen.queryByRole("option", { name: "Arabica Coffee Beans - Dark Roast" })).not.toBeInTheDocument();
        expect(screen.getByRole("option", { name: "Ceremonial Matcha - Ceremonial Grade" })).toBeInTheDocument();
    });

    it("removes product row when clicking remove button and restores it to the combobox", () => {
        render(
            <StockAdjustment
                items={[mockInventoryItem101]}
                initialVariantId={101}
                onSuccess={vi.fn()}
            />
        );

        expect(screen.getByText("Arabica Coffee Beans")).toBeInTheDocument();

        // Click X to remove row
        const removeButton = screen.getByTitle("移除");
        fireEvent.click(removeButton);

        // Row is cleared
        expect(screen.queryByText("Arabica Coffee Beans")).not.toBeInTheDocument();
        expect(screen.getByText("請在下方新增要調整的商品。")).toBeInTheDocument();

        // Restored to the add-product dropdown
        expect(screen.getByRole("option", { name: "Arabica Coffee Beans - Dark Roast" })).toBeInTheDocument();
    });

    // ==========================================
    // 2. CAUSE (REASON) & DATE REFLECTION IN SERVICE
    // ==========================================
    it("reflects custom adjustment cause (reason) and stock changes in service call", async () => {
        const ref = createRef<StockAdjustmentHandle>();
        const onSuccessMock = vi.fn();

        createStockAdjustmentMock.mockResolvedValue({ id: 100 } as KatanaStockAdjustment);

        render(
            <StockAdjustment
                ref={ref}
                items={[mockInventoryItem101]}
                initialVariantId={101}
                onSuccess={onSuccessMock}
            />
        );

        // 1. Enter Cause (Reason)
        const reasonInput = screen.getByPlaceholderText("例如: 盤點差異、耗損");
        fireEvent.change(reasonInput, { target: { value: "盤點差異：受潮報廢" } });

        // 2. Adjust Quantity from 50 -> 42 (Delta: -8)
        const qtyInput = screen.getByDisplayValue("50");
        fireEvent.change(qtyInput, { target: { value: "42" } });
        expect(screen.getByText("-8")).toBeInTheDocument();

        // 3. Trigger submit
        await act(async () => {
            await ref.current?.submit();
        });

        // Verify service payload includes specified reason and location 1
        expect(createStockAdjustmentMock).toHaveBeenCalledTimes(1);
        expect(createStockAdjustmentMock).toHaveBeenCalledWith(
            expect.objectContaining({
                location_id: 1,
                reason: "盤點差異：受潮報廢",
                stock_adjustment_date: expect.any(String),
                stock_adjustment_rows: [
                    {
                        variant_id: 101,
                        quantity: -8,
                    },
                ],
            })
        );

        expect(onSuccessMock).toHaveBeenCalledTimes(1);
    });

    // ==========================================
    // 3. BATCH TRACEABILITY SERVICE INTEGRATION
    // ==========================================
    it("creates batch and attaches traceability entry with delta in service call for tracked products", async () => {
        const ref = createRef<StockAdjustmentHandle>();
        const onSuccessMock = vi.fn();

        createBatchMock.mockResolvedValue({ id: 777, batch_number: "LOT-MATCHA-2026" } as KatanaBatch);
        createStockAdjustmentMock.mockResolvedValue({ id: 101 } as KatanaStockAdjustment);

        render(
            <StockAdjustment
                ref={ref}
                items={[mockInventoryItem102]}
                initialVariantId={102}
                onSuccess={onSuccessMock}
            />
        );

        // Adjust Quantity from 20 -> 35 (Delta: +15)
        const qtyInput = screen.getByDisplayValue("20");
        fireEvent.change(qtyInput, { target: { value: "35" } });
        expect(screen.getByText("+15")).toBeInTheDocument();

        // Select "+ 新增批次..." in the batch combobox
        const batchSelect = screen.getByDisplayValue("選擇批次...");
        fireEvent.change(batchSelect, { target: { value: "__new__" } });

        // Fill in new batch number
        const batchInput = screen.getByPlaceholderText("新批次編號");
        fireEvent.change(batchInput, { target: { value: "LOT-MATCHA-2026" } });

        // Submit
        await act(async () => {
            await ref.current?.submit();
        });

        expect(createBatchMock).toHaveBeenCalledWith(
            expect.objectContaining({
                batch_number: "LOT-MATCHA-2026",
                variant_id: 102,
            })
        );

        expect(createStockAdjustmentMock).toHaveBeenCalledWith(
            expect.objectContaining({
                location_id: 1,
                stock_adjustment_rows: [
                    {
                        variant_id: 102,
                        quantity: 15,
                        traceability: [{ batch_id: 777, quantity: "15" }],
                    },
                ],
            })
        );

        expect(onSuccessMock).toHaveBeenCalledTimes(1);
    });

    it("renders selectable variants even when item location_id is missing or from another store ID", () => {
        const unalignedItem: KatanaInventoryItem = {
            ...mockInventoryItem101,
            location_id: 9999, // mismatching ID from real backend
        };

        render(<StockAdjustment items={[unalignedItem]} onSuccess={vi.fn()} />);

        const select = screen.getByDisplayValue("選擇要調整的商品...");
        expect(select).toBeInTheDocument();
        expect(screen.getByRole("option", { name: /Arabica Coffee Beans/i })).toBeInTheDocument();
    });

    it("updates dropdown when items arrive asynchronously after initial render", () => {
        const { rerender } = render(<StockAdjustment items={[]} onSuccess={vi.fn()} />);
        expect(screen.queryByRole("option", { name: /Arabica Coffee Beans/i })).not.toBeInTheDocument();

        // Simulate parent finishing data load
        rerender(<StockAdjustment items={[mockInventoryItem101]} onSuccess={vi.fn()} />);
        expect(screen.getByRole("option", { name: /Arabica Coffee Beans/i })).toBeInTheDocument();
    });
});