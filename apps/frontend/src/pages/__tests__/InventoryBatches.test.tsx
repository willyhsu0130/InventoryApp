// src/pages/__tests__/InventoryBatches.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { InventoryBatches } from "../InventoryBatches";
import {
    useInventoryCatalog,
    useProductCatalog,
    useVariant,
} from "@/hooks/useContexts";
import type { KatanaBatch, KatanaProduct, ProductVariant } from "@my-inventory-app/shared";

vi.mock("@/hooks/useContexts", () => ({
    useInventoryCatalog: vi.fn(),
    useProductCatalog: vi.fn(),
    useVariant: vi.fn(),
}));

const mockUseInventoryCatalog = vi.mocked(useInventoryCatalog);
const mockUseProductCatalog = vi.mocked(useProductCatalog);
const mockUseVariant = vi.mocked(useVariant);

const mockProducts: KatanaProduct[] = [
    {
        id: 1,
        name: "金目鱸魚",
        type: "product",
        category_name: "Seafood",
        uom: "kg",
        batch_tracked: true,
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
    },
    {
        id: 2,
        name: "Arabica Coffee",
        type: "product",
        category_name: "Coffee",
        uom: "bags",
        batch_tracked: true,
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
    },
];

const mockVariants: ProductVariant[] = [
    {
        id: 101,
        product_id: 1,
        type: "product",
        sku: "FSH-001",
        sales_price: 150,
        purchase_price: 80,
        config_attributes: [{ config_name: "Color", config_value: "red" }],
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
    },
    {
        id: 102,
        product_id: 2,
        type: "product",
        sku: "COF-001",
        sales_price: 20,
        purchase_price: 10,
        config_attributes: [{ config_name: "Roast", config_value: "Medium Roast" }],
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
    },
];

const mockBatches: KatanaBatch[] = [
    {
        id: 1,
        variant_id: 101,
        batch_number: "BATCH-2026-001",
        batch_barcode: "BAR-001",
        batch_created_date: "2026-05-10T00:00:00Z",
        expiration_date: "2028-05-09T00:00:00Z",
        quantity_in_stock: 45,
        created_at: "2026-05-10T00:00:00Z",
        updated_at: "2026-05-10T00:00:00Z",
    },
    {
        id: 2,
        variant_id: 102,
        batch_number: "BATCH-2026-002",
        batch_barcode: "BAR-002",
        batch_created_date: "2026-06-15T00:00:00Z",
        expiration_date: "2028-06-14T00:00:00Z",
        quantity_in_stock: 80,
        created_at: "2026-06-15T00:00:00Z",
        updated_at: "2026-06-15T00:00:00Z",
    },
];

describe("<InventoryBatches /> Page", () => {
    const mockRefetchInventory = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        mockUseProductCatalog.mockReturnValue({
            products: new Map(mockProducts.map((p) => [p.id, p])),
            loading: false,
        } as unknown as ReturnType<typeof useProductCatalog>);

        mockUseVariant.mockReturnValue({
            variants: new Map(mockVariants.map((v) => [v.id, v])),
            loading: false,
        } as unknown as ReturnType<typeof useVariant>);

        mockUseInventoryCatalog.mockReturnValue({
            batches: new Map(mockBatches.map((b) => [b.id, b])),
            loading: false,
            refetchInventory: mockRefetchInventory,
        } as unknown as ReturnType<typeof useInventoryCatalog>);
    });

    it("renders loading placeholder when loading is true", () => {
        mockUseInventoryCatalog.mockReturnValue({
            batches: new Map(),
            loading: true,
            refetchInventory: mockRefetchInventory,
        } as unknown as ReturnType<typeof useInventoryCatalog>);

        render(
            <MemoryRouter>
                <InventoryBatches />
            </MemoryRouter>
        );

        expect(screen.getByText("載入批次中")).toBeInTheDocument();
    });

    it("renders table with batch information, product details, stock quantities, and dates", () => {
        render(
            <MemoryRouter>
                <InventoryBatches />
            </MemoryRouter>
        );

        expect(screen.getByRole("heading", { name: "庫存批次" })).toBeInTheDocument();

        // Batch 1 details
        expect(screen.getByText("BATCH-2026-001")).toBeInTheDocument();
        expect(screen.getByText("金目鱸魚 - red")).toBeInTheDocument();
        expect(screen.getByText("BAR-001")).toBeInTheDocument();
        expect(screen.getByText("2026-05-10")).toBeInTheDocument();
        expect(screen.getByText("2028-05-09")).toBeInTheDocument();

        // Batch 1 stock quantity & UOM
        expect(screen.getByText("45")).toBeInTheDocument();
        expect(screen.getByText("kg")).toBeInTheDocument();

        // Batch 2 details
        expect(screen.getByText("BATCH-2026-002")).toBeInTheDocument();
        expect(screen.getByText("Arabica Coffee - Medium Roast")).toBeInTheDocument();
        expect(screen.getByText("BAR-002")).toBeInTheDocument();

        // Batch 2 stock quantity & UOM
        expect(screen.getByText("80")).toBeInTheDocument();
        expect(screen.getByText("bags")).toBeInTheDocument();

        // Row-level text verification
        const rows = screen.getAllByRole("row");
        expect(rows[1]).toHaveTextContent("45 kg");
        expect(rows[2]).toHaveTextContent("80 bags");
    });

    it("filters batches by search term across batch number, product name, and barcode", () => {
        render(
            <MemoryRouter>
                <InventoryBatches />
            </MemoryRouter>
        );

        const searchInput = screen.getByPlaceholderText("搜尋批次、產品或條碼...");

        // Filter by product name
        fireEvent.change(searchInput, { target: { value: "金目鱸魚" } });
        expect(screen.getByText("BATCH-2026-001")).toBeInTheDocument();
        expect(screen.queryByText("BATCH-2026-002")).not.toBeInTheDocument();

        // Filter by barcode
        fireEvent.change(searchInput, { target: { value: "BAR-002" } });
        expect(screen.queryByText("BATCH-2026-001")).not.toBeInTheDocument();
        expect(screen.getByText("BATCH-2026-002")).toBeInTheDocument();
    });

    it("displays empty message when no batches match filter or batch map is empty", () => {
        render(
            <MemoryRouter>
                <InventoryBatches />
            </MemoryRouter>
        );

        const searchInput = screen.getByPlaceholderText("搜尋批次、產品或條碼...");
        fireEvent.change(searchInput, { target: { value: "NonExistentBatch" } });

        expect(screen.getByText("目前沒有可用批次。")).toBeInTheDocument();
    });

    it("calls refetchInventory when clicking the refresh button", () => {
        render(
            <MemoryRouter>
                <InventoryBatches />
            </MemoryRouter>
        );

        const refreshButton = screen.getByRole("button", { name: "重新整理批次" });
        fireEvent.click(refreshButton);

        expect(mockRefetchInventory).toHaveBeenCalledTimes(1);
    });
});