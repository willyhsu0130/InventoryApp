// src/components/products/__tests__/EditProduct.test.tsx
import { createRef } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { EditProduct, type EditProductHandle } from "../EditProduct";
import { productService } from "@/services/productService";
import { useProductCatalog, useVariant } from "@/hooks/useContexts";
import type { KatanaProduct, ProductVariant } from "@my-inventory-app/shared";

// 1. Mock Services
vi.mock("@/services/productService", () => ({
    productService: {
        createProductWithVariants: vi.fn(),
        update: vi.fn(),
    },
}));

// 2. Mock Context Hooks
vi.mock("@/hooks/useContexts", () => ({
    useProductCatalog: vi.fn(),
    useVariant: vi.fn(),
    useInventoryCatalog: () => ({
        inventoryItems: new Map(),
    }),
}));

// Mock ConfigOptionsEditor child component
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

const mockedProductService = vi.mocked(productService);
const mockUseProductCatalog = vi.mocked(useProductCatalog);
const mockUseVariant = vi.mocked(useVariant);

describe("<EditProduct />", () => {
    const mockEditProduct = vi.fn();
    const mockRefetchProducts = vi.fn().mockResolvedValue(undefined);
    const mockCreateVariant = vi.fn();
    const mockEditVariant = vi.fn();
    const mockDeleteVariant = vi.fn();
    const mockRefetchVariants = vi.fn().mockResolvedValue(undefined);

    beforeEach(() => {
        vi.clearAllMocks();

        mockUseProductCatalog.mockReturnValue({
            products: new Map<number, KatanaProduct>(),
            editProduct: mockEditProduct,
            refetchProducts: mockRefetchProducts,
            loading: false,
        } as unknown as ReturnType<typeof useProductCatalog>);

        mockUseVariant.mockReturnValue({
            variants: new Map<number, ProductVariant>(),
            createVariant: mockCreateVariant,
            editVariant: mockEditVariant,
            deleteVariant: mockDeleteVariant,
            refetchVariants: mockRefetchVariants,
            loading: false,
        } as unknown as ReturnType<typeof useVariant>);
    });

    describe("Create Mode", () => {
        it("updates Product Name and UOM inputs and submits them via ref handle", async () => {
            const onCreated = vi.fn();
            mockedProductService.createProductWithVariants.mockResolvedValue({ id: 99 } as KatanaProduct);
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
                expect(mockedProductService.createProductWithVariants).toHaveBeenCalledWith(
                    expect.objectContaining({
                        name: "Organic Earl Grey Tea",
                        uom: "box",
                    }),
                    expect.any(Array)
                );
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

            expect(
                screen.getByText(/單位 \(UOM\) 不可超過 7 個字元/i)
            ).toBeInTheDocument();
            expect(mockedProductService.createProductWithVariants).not.toHaveBeenCalled();
        });

        it("toggles inventory tracking mode between none and batch", async () => {
            mockedProductService.createProductWithVariants.mockResolvedValue({ id: 100 } as KatanaProduct);
            const ref = createRef<EditProductHandle>();

            render(<EditProduct id={null} ref={ref} />);

            const nameInput = screen.getByPlaceholderText(/例: 精品咖啡豆/i);
            fireEvent.change(nameInput, { target: { value: "Fresh Salmon" } });

            // Target the radio item by role and accessible name
            const batchRadio = screen.getByRole("radio", { name: /以批次 \/ 日期分類/i });
            fireEvent.click(batchRadio);

            await act(async () => {
                await ref.current?.submit();
            });

            await waitFor(() => {
                expect(mockedProductService.createProductWithVariants).toHaveBeenCalledWith(
                    expect.objectContaining({
                        name: "Fresh Salmon",
                        batch_tracked: true,
                    }),
                    expect.any(Array)
                );
            });
        });

        it("opens config options modal, saves custom configs, and updates variant table headers", async () => {
            mockedProductService.createProductWithVariants.mockResolvedValue({ id: 101 } as KatanaProduct);
            const ref = createRef<EditProductHandle>();

            render(<EditProduct id={null} ref={ref} />);

            // Open Config Modal via label in Create Mode
            const checkboxLabel = screen.getByText(/這個產品有不只一種款式嗎/i);
            fireEvent.click(checkboxLabel);

            // Verify modal is open and add config using mocked editor
            expect(screen.getByTestId("mock-config-editor")).toBeInTheDocument();
            const addConfigBtn = screen.getByRole("button", { name: /Simulate Add Size Config/i });
            fireEvent.click(addConfigBtn);

            // Save modal
            const modalSaveBtn = screen.getByRole("button", { name: /儲存/i });
            fireEvent.click(modalSaveBtn);

            // Verify variant table now reflects the newly configured header "Size"
            expect(screen.getByRole("columnheader", { name: "Size" })).toBeInTheDocument();
        });

        it("allows adding and removing variant draft rows", async () => {
            render(<EditProduct id={null} />);

            const addVariantBtn = screen.getByRole("button", { name: /新增款式選項/i });
            expect(screen.getAllByTitle("刪除款式")).toHaveLength(1);

            // Add a second variant row
            fireEvent.click(addVariantBtn);
            expect(screen.getAllByTitle("刪除款式")).toHaveLength(2);

            // Remove the second variant row
            const deleteButtons = screen.getAllByTitle("刪除款式");
            fireEvent.click(deleteButtons[1]);
            expect(screen.getAllByTitle("刪除款式")).toHaveLength(1);
        });

        it("displays error banner on duplicate SKU constraint collision", async () => {
            mockedProductService.createProductWithVariants.mockRejectedValue(
                new Error('duplicate key value violates unique constraint "product_variants_sku_key"')
            );
            const ref = createRef<EditProductHandle>();

            render(<EditProduct id={null} ref={ref} />);

            const nameInput = screen.getByPlaceholderText(/例: 精品咖啡豆/i);
            fireEvent.change(nameInput, { target: { value: "Existing Item" } });

            await act(async () => {
                await ref.current?.submit();
            });

            await waitFor(() => {
                expect(screen.getByText(/SKU 已存在/i)).toBeInTheDocument();
            });
        });
    });

    describe("Edit Mode (Auto-Save on blur)", () => {
        const existingProduct: KatanaProduct = {
            id: 50,
            name: "Original Product",
            uom: "kg",
            batch_tracked: false,
            serial_tracked: false,
            configs: [{ name: "Color", values: ["Red", "Blue"] }],
            type: "product",
            category_name: "General",
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
        };

        const existingVariant: ProductVariant = {
            id: 501,
            product_id: 50,
            type: "product",
            sku: "PROD-RED",
            sales_price: 120,
            purchase_price: 60,
            config_attributes: [{ config_name: "Color", config_value: "Red" }],
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

        beforeEach(() => {
            mockUseProductCatalog.mockReturnValue({
                products: new Map([[50, existingProduct]]),
                editProduct: mockEditProduct,
                refetchProducts: mockRefetchProducts,
                loading: false,
            } as unknown as ReturnType<typeof useProductCatalog>);

            mockUseVariant.mockReturnValue({
                variants: new Map([[501, existingVariant]]),
                createVariant: mockCreateVariant,
                editVariant: mockEditVariant,
                deleteVariant: mockDeleteVariant,
                refetchVariants: mockRefetchVariants,
                loading: false,
            } as unknown as ReturnType<typeof useVariant>);
        });

        it("auto-saves product name change on blur", async () => {
            render(<EditProduct id={50} />);

            const nameInput = screen.getByDisplayValue("Original Product");
            fireEvent.change(nameInput, { target: { value: "Updated Product Name" } });
            fireEvent.blur(nameInput);

            await waitFor(() => {
                expect(mockEditProduct).toHaveBeenCalledWith(
                    expect.objectContaining({
                        id: 50,
                        name: "Updated Product Name",
                    })
                );
                expect(mockRefetchProducts).toHaveBeenCalled();
            });
        });

        it("auto-saves tracking mode change immediately in edit mode", async () => {
            render(<EditProduct id={50} />);

            const batchRadio = screen.getByRole("radio", { name: /以批次 \/ 日期分類/i });
            fireEvent.click(batchRadio);

            await waitFor(() => {
                expect(mockEditProduct).toHaveBeenCalledWith(
                    expect.objectContaining({
                        id: 50,
                        batch_tracked: true,
                    })
                );
            });
        });

        it("calls deleteVariant service when removing an existing persisted variant", async () => {
            const secondVariant: ProductVariant = {
                ...existingVariant,
                id: 502,
                sku: "PROD-BLUE",
                config_attributes: [{ config_name: "Color", config_value: "Blue" }],
            };

            mockUseVariant.mockReturnValue({
                variants: new Map([
                    [501, existingVariant],
                    [502, secondVariant],
                ]),
                createVariant: mockCreateVariant,
                editVariant: mockEditVariant,
                deleteVariant: mockDeleteVariant,
                refetchVariants: mockRefetchVariants,
                loading: false,
            } as unknown as ReturnType<typeof useVariant>);

            render(<EditProduct id={50} />);

            const deleteButtons = screen.getAllByTitle("刪除款式");
            expect(deleteButtons).toHaveLength(2);

            fireEvent.click(deleteButtons[0]);

            await waitFor(() => {
                expect(mockDeleteVariant).toHaveBeenCalledWith(501);
                expect(mockRefetchVariants).toHaveBeenCalled();
            });
        });

    });
});