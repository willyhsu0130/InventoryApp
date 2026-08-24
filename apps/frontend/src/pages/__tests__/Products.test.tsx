// src/pages/__tests__/Products.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Products } from "../Products";
import * as productService from "@/services/productService";
import * as variantService from "@/services/variantService";
import type { Product, Variant } from "@my-inventory-app/shared";

vi.mock("@/services/productService", () => ({
    getActiveProducts: vi.fn(),
    deleteProduct: vi.fn(),
}));

vi.mock("@/services/variantService", () => ({
    getActiveVariants: vi.fn(),
}));

vi.mock("@/components/products/ProductsTable", () => ({
    ProductsTable: ({
        items,
        onRowClick,
    }: {
        items: Array<{ id: number; variantId: number; name: string; sku: string }>;
        onRowClick?: (id: number) => void;
    }) => (
        <div data-testid="mock-products-table">
            {items.map((prod) => (
                <div
                    key={prod.variantId}
                    data-testid={`product-row-${prod.variantId}`}
                    onClick={() => onRowClick?.(prod.id)}
                >
                    <span>{prod.name}</span>
                    <span>{prod.sku}</span>
                </div>
            ))}
        </div>
    ),
}));

vi.mock("@/components/products/EditProduct", () => ({
    EditProduct: () => <div data-testid="mock-edit-product">編輯產品表單</div>,
}));

describe("<Products /> Page", () => {
    const mockProducts: Product[] = [
        {
            id: 1,
            name: "阿里山烏龍茶",
            uom: "box",
            batchTracked: false,
            configs: [{ name: "重量", values: ["150g", "300g"] }],
            isArchived: false,
        },
    ];

    const mockVariants: Variant[] = [
        {
            id: 10,
            productId: 1,
            sku: "TEA-150",
            salesPrice: 500,
            configs: [{ name: "重量", value: "150g" }],
            isArchived: false,
        },
        {
            id: 11,
            productId: 1,
            sku: "TEA-300",
            salesPrice: 900,
            configs: [{ name: "重量", value: "300g" }],
            isArchived: false,
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(productService.getActiveProducts).mockResolvedValue(mockProducts);
        vi.mocked(variantService.getActiveVariants).mockResolvedValue(mockVariants);
        vi.mocked(productService.deleteProduct).mockResolvedValue({
            ...mockProducts[0],
            isArchived: true,
        });
    });

    it("renders loading pulse initially and displays catalog items", async () => {
        render(<Products />);
        expect(screen.getByText(/準備畫面中/i)).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByTestId("product-row-10")).toBeInTheDocument();
            expect(screen.getByText("阿里山烏龍茶 - 150g")).toBeInTheDocument();
            expect(screen.getByText("TEA-150")).toBeInTheDocument();
            expect(screen.getByTestId("product-row-11")).toBeInTheDocument();
            expect(screen.getByText("阿里山烏龍茶 - 300g")).toBeInTheDocument();
        });
    });

    it("filters catalog rows using the search input", async () => {
        render(<Products />);

        await waitFor(() => {
            expect(screen.getByTestId("product-row-10")).toBeInTheDocument();
        });

        const searchInput = screen.getByPlaceholderText(/搜尋產品名稱/i);
        fireEvent.change(searchInput, { target: { value: "TEA-300" } });

        expect(screen.queryByTestId("product-row-10")).not.toBeInTheDocument();
        expect(screen.getByTestId("product-row-11")).toBeInTheDocument();
    });

    it("opens edit modal and deletes product when triggering delete", async () => {
        render(<Products />);

        await waitFor(() => {
            expect(screen.getByTestId("product-row-10")).toBeInTheDocument();
        });

        // Click row to select product
        fireEvent.click(screen.getByTestId("product-row-10"));

        // Trigger delete action inside modal
        const deleteBtn = screen.getByRole("button", { name: /刪除/i });
        fireEvent.click(deleteBtn);

        await waitFor(() => {
            expect(productService.deleteProduct).toHaveBeenCalledWith(1);
            expect(productService.getActiveProducts).toHaveBeenCalledTimes(2); // Initial mount + refresh
        });
    });
});