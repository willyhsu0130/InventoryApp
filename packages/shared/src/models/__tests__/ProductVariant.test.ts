import { describe, it, expect } from "vitest";
import {
    convertProductToPayload,
    convertVariantToPayload,

    buildConfigCombinations,
    syncDraftVariantsToConfigs,

    type KatanaProductDraft,
    type KatanaProductDraftVariant,
    type KatanaProductConfig,
} from "../productVariant";

describe("Product & Variant Transformers", () => {
    describe("buildConfigCombinations", () => {
        it("returns an empty array when configs are empty", () => {
            expect(buildConfigCombinations([])).toEqual([]);
        });

        it("generates correct Cartesian product combinations for multiple configs", () => {
            const configs: KatanaProductConfig[] = [
                { name: "規格", values: ["三去", "蝶切"] },
                { name: "包裝", values: ["真空", "散裝"] },
            ];

            const combinations = buildConfigCombinations(configs);

            expect(combinations).toHaveLength(4);
            expect(combinations).toEqual([
                [
                    { config_name: "規格", config_value: "三去" },
                    { config_name: "包裝", config_value: "真空" },
                ],
                [
                    { config_name: "規格", config_value: "三去" },
                    { config_name: "包裝", config_value: "散裝" },
                ],
                [
                    { config_name: "規格", config_value: "蝶切" },
                    { config_name: "包裝", config_value: "真空" },
                ],
                [
                    { config_name: "規格", config_value: "蝶切" },
                    { config_name: "包裝", config_value: "散裝" },
                ],
            ]);
        });
    });

    describe("syncDraftVariantsToConfigs", () => {
        it("preserves existing variant values when matching attributes exist", () => {
            const configs: KatanaProductConfig[] = [
                { name: "規格", values: ["三去", "蝶切"] },
            ];

            const existingVariants: KatanaProductDraftVariant[] = [
                {
                    sku: "FISH-01",
                    sales_price: 180,
                    config_attributes: [{ config_name: "規格", config_value: "三去" }],
                },
            ];

            const synced = syncDraftVariantsToConfigs(configs, existingVariants);

            expect(synced).toHaveLength(2);
            // Match found: preserves SKU and price
            expect(synced[0].sku).toBe("FISH-01");
            expect(synced[0].sales_price).toBe(180);
            // New combination created
            expect(synced[1].config_attributes).toEqual([{ config_name: "規格", config_value: "蝶切" }]);
        });
    });

    describe("convertProductToPayload (PATCH payload)", () => {
        it("strips whitespace and omits empty optional fields", () => {
            const draft: KatanaProductDraft = {
                id: 101,
                name: "  金目鱸魚  ",
                uom: "kg",
                category_name: "   ",
                default_supplier_id: null,
                additional_info: "",
                purchase_uom: null,
                purchase_uom_conversion_rate: null,
                is_sellable: true,
                is_purchasable: false,
                is_producible: false,
                is_auto_assembly: false,
                batch_tracked: true,
                serial_tracked: false,
                operations_in_sequence: false,
                configs: [{ name: "規格", values: ["三去"] }],
                variants: [],
            };

            const payload = convertProductToPayload(draft);

            expect(payload.name).toBe("  金目鱸魚  ");
            expect(payload.category_name).toBeUndefined();
            expect(payload.additional_info).toBeUndefined();
            expect(payload.batch_tracked).toBe(true);
            expect(payload.configs).toEqual([{ name: "規格", values: ["三去"] }]);
        });
    });

    describe("convertVariantToPayload", () => {
        it("omits empty string barcodes and trims SKU", () => {
            const payload = convertVariantToPayload({
                sku: "  SKU-999  ",
                internal_barcode: "",
                registered_barcode: undefined,
                sales_price: 250,
            });

            expect(payload.sku).toBe("  SKU-999  ");
            expect(payload.internal_barcode).toBeUndefined();
            expect(payload.sales_price).toBe(250);
        });
    });
});