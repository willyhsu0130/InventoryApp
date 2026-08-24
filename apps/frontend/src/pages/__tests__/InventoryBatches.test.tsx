// src/pages/__tests__/InventoryBatches.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { InventoryBatches } from "../InventoryBatches";
import * as batchService from "@/services/batchService";
import * as productService from "@/services/productService";
import * as variantService from "@/services/variantService";
import type { Batch, Product, Variant } from "@my-inventory-app/shared";

vi.mock("@/services/batchService", () => ({
    getBatchesByVariantId: vi.fn(),
}));

vi.mock("@/services/productService", () => ({
    getActiveProducts: vi.fn(),
}));

vi.mock("@/services/variantService", () => ({
    getActiveVariants: vi.fn(),
}));

describe("<InventoryBatches /> Page", () => {
    const mockProducts: Product[] = [
        {
            id: 1,
            name: "冷凍鮭魚",
            uom: "kg",
            batchTracked: true,
            configs: [],
            isArchived: false,
        },
    ];

    const mockVariants: Variant[] = [
        {
            id: 201,
            productId: 1,
            sku: "SALMON-01",
            salesPrice: 400,
            configs: [],
            isArchived: false,
        },
    ];

    const mockBatches: Batch[] = [
        {
            id: 1,
            variantId: 201,
            batchNumber: "LOT-2026-001",
            quantity: 120,
            createdAt: "2026-01-10T00:00:00Z",
            expiredAt: "2026-12-31T00:00:00Z",
        },
        {
            id: 2,
            variantId: 201,
            batchNumber: "LOT-2026-002",
            quantity: 80,
            createdAt: "2026-02-15T00:00:00Z",
            expiredAt: "2026-03-01T00:00:00Z",
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(productService.getActiveProducts).mockResolvedValue(mockProducts);
        vi.mocked(variantService.getActiveVariants).mockResolvedValue(mockVariants);
        vi.mocked(batchService.getBatchesByVariantId).mockResolvedValue(mockBatches);
    });

    const renderWithRouter = (ui: React.ReactElement) => {
        return render(<MemoryRouter>{ui}</MemoryRouter>);
    };

    it("renders loading state initially and displays batches after resolution", async () => {
        renderWithRouter(<InventoryBatches />);
        expect(screen.getByText(/載入批次中/i)).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText("LOT-2026-001")).toBeInTheDocument();
            expect(screen.getByText("LOT-2026-002")).toBeInTheDocument();
            expect(screen.getAllByText("冷凍鮭魚")).toHaveLength(2);
            expect(screen.getByText("120")).toBeInTheDocument();
        });
    });

    it("filters batches by batch number or SKU", async () => {
        renderWithRouter(<InventoryBatches />);

        await waitFor(() => {
            expect(screen.getByText("LOT-2026-001")).toBeInTheDocument();
        });

        const searchInput = screen.getByPlaceholderText(/搜尋批次/i);
        fireEvent.change(searchInput, { target: { value: "LOT-2026-002" } });

        expect(screen.queryByText("LOT-2026-001")).not.toBeInTheDocument();
        expect(screen.getByText("LOT-2026-002")).toBeInTheDocument();
    });

    it("displays error panel when services throw", async () => {
        vi.mocked(productService.getActiveProducts).mockRejectedValue(
            new Error("批次查詢失敗")
        );

        renderWithRouter(<InventoryBatches />);

        await waitFor(() => {
            expect(screen.getByText(/無法讀取批次/i)).toBeInTheDocument();
            expect(screen.getByText(/批次查詢失敗/i)).toBeInTheDocument();
        });
    });
});