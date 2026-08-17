import { createRef } from "react";
import { describe, it, expect, } from "vitest";
import { screen, act } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { EditProduct, type EditProductHandle } from "../EditProduct";

describe("EditProduct Component", () => {
    it("validates empty product name on submission", async () => {
        const ref = createRef<EditProductHandle>();
        renderWithProviders(<EditProduct id={-1} ref={ref} />);

        // Target the specific product name input by placeholder
        const nameInput = screen.getByPlaceholderText("例: 精品咖啡豆");
        expect(nameInput).toHaveValue("");

        // Call the imperative submit handle on the empty draft
        await act(async () => {
            await ref.current?.submit();
        });

        // Verifies the error panel renders the validation error message
        expect(screen.getByText("請輸入產品名稱。")).toBeInTheDocument();
    });

    it("locks the add variant button when an unsaved variant draft exists", async () => {
        const mockProduct = {
            id: 10,
            name: "金目鱸魚",
            uom: "box",
            type: "product" as const,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            configs: [{ name: "規格", values: ["三去", "蝶切"] }],
            variants: [
                {
                    id: 101,
                    product_id: 10,
                    type: "product" as const,
                    sku: "SEABASS-01",
                    sales_price: 200,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    config_attributes: [{ config_name: "規格", config_value: "三去" }],
                },
            ],
        };

        const mockProductsMap = new Map([[10, mockProduct]]);

        const { user } = renderWithProviders(<EditProduct id={10} />, {
            productContextValue: {
                products: mockProductsMap,
            },
        });

        const addVariantBtn = screen.getByRole("button", { name: /新增款式選項/i });
        expect(addVariantBtn).toBeEnabled();

        // Click to add a new draft row
        await user.click(addVariantBtn);

        // Button should become disabled to enforce completing one variant before adding another
        expect(screen.getByRole("button", { name: /請先完成目前款式的設定/i })).toBeDisabled();
    });

    it("displays error and blocks deleting the only remaining variant", async () => {
        const mockProduct = {
            id: 10,
            name: "單一款式產品",
            uom: "pcs",
            type: "product" as const,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            configs: [],
            variants: [
                {
                    id: 50,
                    product_id: 10,
                    type: "product" as const,
                    sku: "SINGLE-01",
                    sales_price: 100,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    config_attributes: [],
                },
            ],
        };

        const mockProductsMap = new Map([[10, mockProduct]]);

        const { user } = renderWithProviders(<EditProduct id={10} />, {
            productContextValue: {
                products: mockProductsMap,
            },
        });

        // Click delete on the single row
        const deleteBtn = screen.getByTitle("刪除款式");
        await user.click(deleteBtn);

        expect(screen.getByText("產品至少需要設定一個款式。")).toBeInTheDocument();
    });
});