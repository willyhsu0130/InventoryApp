import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProductsTable } from "../ProductsTable";
import type { DisplayProductRow } from "@/pages/Products";

describe("<ProductsTable />", () => {
    const mockItems = [
        {
            id: 1,
            variantId: 101,
            name: "Ergonomic Chair",
            sku: "CHAIR-01",
            salesPrice: 250,
        },
        {
            id: 2,
            variantId: -1, // Fallback key test
            name: "Standing Desk",
            sku: null,
            salesPrice: 500,
        },
    ];

    it("renders product rows and handles item clicks", () => {
        const handleRowClick = vi.fn();

        render(
            <ProductsTable
                items={mockItems as DisplayProductRow[]}
                onRowClick={handleRowClick}
            />
        );

        expect(screen.getByText("Ergonomic Chair")).toBeInTheDocument();
        expect(screen.getByText("CHAIR-01")).toBeInTheDocument();
        expect(screen.getByText("Standing Desk")).toBeInTheDocument();

        fireEvent.click(screen.getByText("Ergonomic Chair"));
        expect(handleRowClick).toHaveBeenCalledWith(1);
    });

    it("displays empty placeholder when no products exist", () => {
        render(<ProductsTable items={[]} onRowClick={vi.fn()} />);

        expect(screen.getByText("查無符合條件的產品。")).toBeInTheDocument();
    });
});