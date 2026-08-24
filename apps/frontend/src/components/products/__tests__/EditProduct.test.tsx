// src/components/products/__tests__/EditProduct.test.tsx
import { createRef } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { EditProduct, type EditProductHandle } from "../EditProduct";
import * as productService from "@/services/productService";
import * as variantService from "@/services/variantService";
import * as inventoryLevelService from "@/services/inventoryLevelService";
import type { Product, Variant } from "@my-inventory-app/shared";

// 1. Mock Direct Domain Services
vi.mock("@/services/productService", () => ({
    getProductById: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
}));

vi.mock("@/services/variantService", () => ({
    getVariantsByProductId: vi.fn(),
    createVariant: vi.fn(),
    updateVariant: vi.fn(),
    deleteVariant: vi.fn(),
}));

vi.mock("@/services/inventoryLevelService", () => ({
    getTotalStockByVariantId: vi.fn(),
}));

// 2. Mock ConfigOptionsEditor child component
vi.mock("../ConfigOptionEditor", () => ({
    ConfigOptionsEditor: ({
        configs,
        onChange,
    }: {
        configs: Array<{ name: string; values: string[] }>;
        onChange: (updated: Array<{ name: string; values: string[] }>) => void;
    }) => (
        <div data-testid="mock-config-editor">
            <button
                type="button"
                onClick={() =>
                    onChange([
                        ...configs,
                        { name: "Size", values: ["Small", "Large"] },
                    ])
                }
            >
                Simulate Add Size Config
            </button>
        </div>
    ),
}));

// Mock LoadingModal
vi.mock("../../LoadingModal", () => ({
    LoadingModal: () => <div data-testid="mock-loading-modal">載入中...</div>,
}));

describe("<EditProduct />", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("Create Mode (id = null or <= 0)", () => {
        it("updates Product Name and UOM inputs and submits them via ref handle", async () => {
            const onCreated = vi.fn();
            vi.mocked(productService.createProduct).mockResolvedValue({
                id: 99,
                name: "Organic Earl Grey Tea",
                uom: "box",
                batchTracked: false,
                configs: [],
                isArchived: false,
            });

            const ref = createRef<EditProductHandle>();
            render(<EditProduct id={null} onCreated={onCreated} ref={ref} />);

            const nameInput = screen.getByPlaceholderText(/例: 精品咖啡豆/i);
            const uomInput = screen.getByPlaceholderText(/例如: pcs, box/i);

            fireEvent.change(nameInput, { target: { value: "Organic Earl Grey Tea" } });
            fireEvent.change(uomInput, { target: { value: "box" } });

            await act(async () => {
                await ref.current?.submit();
            });

            await waitFor(() => {
                expect(productService.createProduct).toHaveBeenCalledWith({
                    name: "Organic Earl Grey Tea",
                    uom: "box",
                    batchTracked: false,
                    configs: [],
                });
                expect(onCreated).toHaveBeenCalledWith(99);
            });
        });

        it("validates that UOM length cannot exceed 7 characters", async () => {
            const ref = createRef<EditProductHandle>();
            render(<EditProduct id={null} ref={ref} />);

            const nameInput = screen.getByPlaceholderText(/例: 精品咖啡豆/i);
            const uomInput = screen.getByPlaceholderText(/例如: pcs, box/i);

            fireEvent.change(nameInput, { target: { value: "Valid Name" } });
            fireEvent.change(uomInput, { target: { value: "WAYTOOLONG" } });

            await act(async () => {
                await ref.current?.submit();
            });

            expect(screen.getByText(/單位 \(UOM\) 不可超過 7 個字元/i)).toBeInTheDocument();
            expect(productService.createProduct).not.toHaveBeenCalled();
        });

        it("toggles inventory tracking mode between none and batch", async () => {
            vi.mocked(productService.createProduct).mockResolvedValue({
                id: 100,
                name: "Fresh Salmon",
                uom: "pcs",
                batchTracked: true,
                configs: [],
                isArchived: false,
            });

            const ref = createRef<EditProductHandle>();
            render(<EditProduct id={null} ref={ref} />);

            const nameInput = screen.getByPlaceholderText(/例: 精品咖啡豆/i);
            fireEvent.change(nameInput, { target: { value: "Fresh Salmon" } });

            const batchRadio = screen.getByRole("radio", { name: /以批次 \/ 日期分類/i });
            fireEvent.click(batchRadio);

            await act(async () => {
                await ref.current?.submit();
            });

            await waitFor(() => {
                expect(productService.createProduct).toHaveBeenCalledWith({
                    name: "Fresh Salmon",
                    uom: "pcs",
                    batchTracked: true,
                    configs: [],
                });
            });
        });

        it("opens config options modal, saves custom configs, and updates variant table headers", async () => {
            render(<EditProduct id={null} />);

            // Open modal via the checkbox toggle label
            const checkboxLabel = screen.getByText(/這個產品有不只一種款式嗎/i);
            fireEvent.click(checkboxLabel);

            // Add config option via mocked editor button
            expect(screen.getByTestId("mock-config-editor")).toBeInTheDocument();
            const addConfigBtn = screen.getByRole("button", { name: /Simulate Add Size Config/i });
            fireEvent.click(addConfigBtn);

            // Save the config modal
            const modalSaveBtn = screen.getByRole("button", { name: /儲存/i });
            fireEvent.click(modalSaveBtn);

            // Verify variant table reflects the new column header "Size"
            expect(screen.getByRole("columnheader", { name: "Size" })).toBeInTheDocument();
        });

        it("allows adding and removing variant draft rows in create mode", async () => {
            render(<EditProduct id={null} />);

            const addVariantBtn = screen.getByRole("button", { name: /新增款式選項/i });
            expect(screen.getAllByTitle("刪除款式")).toHaveLength(1);

            // Add a second draft row
            fireEvent.click(addVariantBtn);
            expect(screen.getAllByTitle("刪除款式")).toHaveLength(2);

            // Delete the second draft row
            const deleteButtons = screen.getAllByTitle("刪除款式");
            fireEvent.click(deleteButtons[1]);
            expect(screen.getAllByTitle("刪除款式")).toHaveLength(1);
        });

        it("displays error panel when createProduct fails", async () => {
            vi.mocked(productService.createProduct).mockRejectedValue(
                new Error("Database connection timeout")
            );

            const ref = createRef<EditProductHandle>();
            render(<EditProduct id={null} ref={ref} />);

            const nameInput = screen.getByPlaceholderText(/例: 精品咖啡豆/i);
            fireEvent.change(nameInput, { target: { value: "Failed Item" } });

            await act(async () => {
                await ref.current?.submit();
            });

            await waitFor(() => {
                expect(screen.getByText(/Database connection timeout/i)).toBeInTheDocument();
            });
        });
    });

    describe("Edit Mode (id > 0)", () => {
        const mockProduct: Product = {
            id: 50,
            name: "Original Coffee Beans",
            uom: "kg",
            batchTracked: false,
            configs: [{ name: "Grind Size", values: ["Fine", "Coarse"] }],
            isArchived: false,
        };

        const mockVariants: Variant[] = [
            {
                id: 501,
                productId: 50,
                sku: "COFFEE-FINE",
                salesPrice: 20,
                configs: [{ name: "Grind Size", value: "Fine" }],
                isArchived: false,
            },
            {
                id: 502,
                productId: 50,
                sku: "COFFEE-COARSE",
                salesPrice: 22,
                configs: [{ name: "Grind Size", value: "Coarse" }],
                isArchived: false,
            },
        ];

        beforeEach(() => {
            vi.mocked(productService.getProductById).mockResolvedValue(mockProduct);
            vi.mocked(variantService.getVariantsByProductId).mockResolvedValue(mockVariants);
            vi.mocked(inventoryLevelService.getTotalStockByVariantId).mockResolvedValue(150);
            vi.mocked(productService.updateProduct).mockResolvedValue({
                ...mockProduct,
                name: "Updated Coffee Beans",
            });
        });

        it("shows loading state initially and renders fetched product and variants", async () => {
            render(<EditProduct id={50} />);

            // Loading state while resolving Promise.all
            expect(screen.getByTestId("mock-loading-modal")).toBeInTheDocument();

            // Renders form after fetch resolves
            await waitFor(() => {
                expect(screen.getByDisplayValue("Original Coffee Beans")).toBeInTheDocument();
                expect(screen.getByDisplayValue("kg")).toBeInTheDocument();
                expect(screen.getByDisplayValue("COFFEE-FINE")).toBeInTheDocument();
                expect(screen.getByDisplayValue("COFFEE-COARSE")).toBeInTheDocument();
                expect(screen.getAllByText("150")).toHaveLength(2); // Stock display
            });
        });

        it("auto-saves product name change on blur", async () => {
            const onSavingChange = vi.fn();
            render(<EditProduct id={50} onSavingChange={onSavingChange} />);

            await waitFor(() => {
                expect(screen.getByDisplayValue("Original Coffee Beans")).toBeInTheDocument();
            });

            const nameInput = screen.getByDisplayValue("Original Coffee Beans");
            fireEvent.change(nameInput, { target: { value: "Updated Coffee Beans" } });
            fireEvent.blur(nameInput);

            await waitFor(() => {
                expect(productService.updateProduct).toHaveBeenCalledWith(50, {
                    name: "Updated Coffee Beans",
                    uom: "kg",
                    batchTracked: false,
                });
                expect(onSavingChange).toHaveBeenCalledWith(true);
                expect(onSavingChange).toHaveBeenCalledWith(false);
            });
        });

        it("auto-saves tracking mode change immediately", async () => {
            render(<EditProduct id={50} />);

            await waitFor(() => {
                expect(screen.getByDisplayValue("Original Coffee Beans")).toBeInTheDocument();
            });

            const batchRadio = screen.getByRole("radio", { name: /以批次 \/ 日期分類/i });
            fireEvent.click(batchRadio);

            await waitFor(() => {
                expect(productService.updateProduct).toHaveBeenCalledWith(50, {
                    name: "Original Coffee Beans",
                    uom: "kg",
                    batchTracked: true,
                });
            });
        });

        it("calls deleteVariant service when removing an existing persisted variant", async () => {
            vi.mocked(variantService.deleteVariant).mockResolvedValue({
                ...mockVariants[0],
                isArchived: true,
            });

            render(<EditProduct id={50} />);

            await waitFor(() => {
                expect(screen.getAllByTitle("刪除款式")).toHaveLength(2);
            });

            const deleteButtons = screen.getAllByTitle("刪除款式");
            fireEvent.click(deleteButtons[0]);

            await waitFor(() => {
                expect(variantService.deleteVariant).toHaveBeenCalledWith(501);
            });
        });

        it("prevents deleting the last remaining variant", async () => {
            vi.mocked(variantService.getVariantsByProductId).mockResolvedValue([mockVariants[0]]);

            render(<EditProduct id={50} />);

            await waitFor(() => {
                expect(screen.getAllByTitle("刪除款式")).toHaveLength(1);
            });

            const deleteBtn = screen.getByTitle("刪除款式");
            fireEvent.click(deleteBtn);

            expect(variantService.deleteVariant).not.toHaveBeenCalled();
            expect(screen.getByText(/產品至少需要設定一個款式/i)).toBeInTheDocument();
        });
    });
});