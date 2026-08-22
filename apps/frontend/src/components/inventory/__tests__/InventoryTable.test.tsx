import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InventoryTable } from "../InventoryTable";
import type { KatanaProduct, ProductVariant, KatanaInventoryItem } from "@my-inventory-app/shared";

// Mock data stores
const mockProductMap = new Map<number, KatanaProduct>();
const mockVariantMap = new Map<number, ProductVariant>();

vi.mock("@/hooks/useContexts", () => ({
    useProductCatalog: () => ({
        products: mockProductMap,
        loading: false,
        refetchProducts: vi.fn(),
        deleteProduct: vi.fn(),
        createProduct: vi.fn(),
        editProduct: vi.fn(),
    }),
    useVariant: () => ({
        variants: mockVariantMap,
        loading: false,
        refetchVariants: vi.fn(),
        createVariant: vi.fn(),
        editVariant: vi.fn(),
        deleteVariant: vi.fn(),
    }),
}));

const mockProduct1: KatanaProduct = {
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

const mockProduct2: KatanaProduct = {
    ...mockProduct1,
    id: 2,
    name: "Matcha Powder",
    uom: "tins",
};

const mockVariant101: ProductVariant = {
    id: 101,
    product_id: 1,
    type: "product",
    sku: "COF-DRK-1K",
    sales_price: 20,
    purchase_price: 10,
    config_attributes: [
        { config_name: "Roast", config_value: "Dark Roast" },
        { config_name: "Weight", config_value: "1kg" },
    ],
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
    config_attributes: [
        { config_name: "Grade", config_value: "Ceremonial Grade" },
    ],
};

const mockInventoryItem1: KatanaInventoryItem = {
    variant_id: 101,
    location_id: 1,
    quantity_in_stock: 25.0,
    quantity_committed: 5.0,
    quantity_expected: 10.0,
    quantity_potential: 3.0,
    quantity_missing_or_excess: 15.0,
    average_cost: 12.50,
    value_in_stock: 312.50,
    reorder_point: 10.0,
};

const mockInventoryItemShortage: KatanaInventoryItem = {
    variant_id: 102,
    location_id: 1,
    quantity_in_stock: 2.0,
    quantity_committed: 10.0,
    quantity_expected: 0.0,
    quantity_potential: 3.0,
    quantity_missing_or_excess: -8.0,
    average_cost: 50.00,
    value_in_stock: 100.00,
    reorder_point: 15.0,
};

describe("<InventoryTable />", () => {
    beforeEach(() => {
        mockProductMap.clear();
        mockVariantMap.clear();

        mockProductMap.set(1, mockProduct1);
        mockProductMap.set(2, mockProduct2);

        mockVariantMap.set(101, mockVariant101);
        mockVariantMap.set(102, mockVariant102);
    });

    it("renders rows with derived product name, variant configs, SKU, quantities, and cost metrics", () => {
        render(<InventoryTable items={[mockInventoryItem1]} />);

        // Product name & joined variant configs
        expect(screen.getByText("Arabica Coffee Beans")).toBeInTheDocument();
        expect(screen.getByText("Dark Roast / 1kg")).toBeInTheDocument();
        expect(screen.getByText("COF-DRK-1K")).toBeInTheDocument();

        // Quantities & UOM
        expect(screen.getByText("25")).toBeInTheDocument();
        expect(screen.getByText("bags")).toBeInTheDocument();
        expect(screen.getByText("5")).toBeInTheDocument();
        expect(screen.getByText("10")).toBeInTheDocument();

        // Financial metrics
        expect(screen.getByText("$12.50")).toBeInTheDocument();
        expect(screen.getByText("$312.50")).toBeInTheDocument();

        // Stock status badge
        expect(screen.getByText("正常")).toBeInTheDocument();
    });

    it("displays shortage status badge when quantity_missing_or_excess is negative", () => {
        render(<InventoryTable items={[mockInventoryItemShortage]} />);

        expect(screen.getByText("不足 (-8.0)")).toBeInTheDocument();
    });

    it("falls back to variant ID format and N/A when maps lack matching records", () => {
        const unknownItem: KatanaInventoryItem = {
            ...mockInventoryItem1,
            variant_id: 999,
        };

        render(<InventoryTable items={[unknownItem]} />);

        expect(screen.getByText("Variant #999")).toBeInTheDocument();
        expect(screen.getByText("N/A")).toBeInTheDocument();
    });

    it("fires onRowClick with variantId when a row is clicked", () => {
        const handleRowClick = vi.fn();

        render(
            <InventoryTable
                items={[mockInventoryItem1]}
                onRowClick={handleRowClick}
            />
        );

        fireEvent.click(screen.getByText("Arabica Coffee Beans"));
        expect(handleRowClick).toHaveBeenCalledWith(101);
    });

    it("renders empty state message when items array is empty", () => {
        render(<InventoryTable items={[]} />);

        expect(screen.getByText("No matching inventory items found.")).toBeInTheDocument();
    });
});