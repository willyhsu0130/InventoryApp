// src/pages/__tests__/Inventory.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Inventory } from "../Inventory";
import * as productService from "@/services/productService";
import * as variantService from "@/services/variantService";
import * as inventoryLevelService from "@/services/inventoryLevelService";
import type { Product, Variant } from "@my-inventory-app/shared";

vi.mock("@/services/productService", () => ({
    getActiveProducts: vi.fn(),
}));

vi.mock("@/services/variantService", () => ({
    getActiveVariants: vi.fn(),
}));

vi.mock("@/services/inventoryLevelService", () => ({
    getTotalStockByVariantId: vi.fn(),
}));

vi.mock("@/components/inventory/InventoryTable", () => ({
    InventoryTable: ({
        items,
        onRowClick,
    }: {
        items: Array<{ variantId: number; displayName: string; inStock: number }>;
        onRowClick?: (id: number) => void;
    }) => (
        <div data-testid="mock-inventory-table">
            {items.map((item) => (
                <div
                    key={item.variantId}
                    data-testid={`inventory-row-${item.variantId}`}
                    onClick={() => onRowClick?.(item.variantId)}
                >
                    <span>{item.displayName}</span>
                    <span>{item.inStock}</span>
                </div>
            ))}
        </div>
    ),
}));

vi.mock("@/components/inventory/InventoryMovement", () => ({
    InventoryMovement: () => <div data-testid="mock-inventory-movement">調整庫存表單</div>,
}));

describe("<Inventory /> Page", () => {
    const mockProducts: Product[] = [
        {
            id: 1,
            name: "金目鱸魚",
            uom: "kg",
            batchTracked: true,
            configs: [{ name: "處理方式", values: ["三去", "輪切"] }],
            isArchived: false,
        },
    ];

    const mockVariants: Variant[] = [
        {
            id: 101,
            productId: 1,
            sku: "FISH-01",
            salesPrice: 250,
            configs: [{ name: "處理方式", value: "三去" }],
            isArchived: false,
        },
        {
            id: 102,
            productId: 1,
            sku: "FISH-02",
            salesPrice: 280,
            configs: [{ name: "處理方式", value: "輪切" }],
            isArchived: false,
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(productService.getActiveProducts).mockResolvedValue(mockProducts);
        vi.mocked(variantService.getActiveVariants).mockResolvedValue(mockVariants);
        vi.mocked(inventoryLevelService.getTotalStockByVariantId).mockImplementation(async (id) =>
            id === 101 ? 50 : 20
        );
    });

    const renderWithRouter = (ui: React.ReactElement) => {
        return render(<MemoryRouter>{ui}</MemoryRouter>);
    };

    it("renders loading state initially and hydrates inventory data", async () => {
        renderWithRouter(<Inventory />);
        expect(screen.getByText(/準備畫面中/i)).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByTestId("inventory-row-101")).toBeInTheDocument();
            expect(screen.getByText("金目鱸魚 - 三去")).toBeInTheDocument();
            expect(screen.getByText("50")).toBeInTheDocument();
            expect(screen.getByTestId("inventory-row-102")).toBeInTheDocument();
            expect(screen.getByText("金目鱸魚 - 輪切")).toBeInTheDocument();
            expect(screen.getByText("20")).toBeInTheDocument();
        });
    });

    it("filters inventory items based on search term", async () => {
        renderWithRouter(<Inventory />);

        await waitFor(() => {
            expect(screen.getByTestId("inventory-row-101")).toBeInTheDocument();
        });

        const searchInput = screen.getByPlaceholderText(/搜尋產品/i);
        fireEvent.change(searchInput, { target: { value: "輪切" } });

        expect(screen.queryByTestId("inventory-row-101")).not.toBeInTheDocument();
        expect(screen.getByTestId("inventory-row-102")).toBeInTheDocument();
    });

    it("opens stock adjustment modal when clicking '調整庫存' or a row", async () => {
        renderWithRouter(<Inventory />);

        await waitFor(() => {
            expect(screen.getByTestId("inventory-row-101")).toBeInTheDocument();
        });

        const adjustBtn = screen.getByRole("button", { name: /調整庫存/i });
        fireEvent.click(adjustBtn);

        expect(screen.getByTestId("mock-inventory-movement")).toBeInTheDocument();
    });

    it("displays error panel when services fail", async () => {
        vi.mocked(productService.getActiveProducts).mockRejectedValue(
            new Error("庫存載入失敗")
        );

        renderWithRouter(<Inventory />);

        await waitFor(() => {
            expect(screen.getByText(/無法讀取庫存/i)).toBeInTheDocument();
            expect(screen.getByText(/庫存載入失敗/i)).toBeInTheDocument();
        });
    });
});