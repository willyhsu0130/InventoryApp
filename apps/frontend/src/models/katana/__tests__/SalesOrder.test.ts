import { describe, it, expect } from "vitest";
import {
    convertSalesOrderToCreatePayload,
    convertSalesOrderToUpdatePayload,
    type KatanaSalesOrderDraft,
} from "../salesOrder";

describe("Katana Model: salesOrder", () => {
    describe("convertSalesOrderToCreatePayload (POST /sales_orders)", () => {
        it("throws an error when customer_id is missing or null", () => {
            const draftWithoutCustomer: KatanaSalesOrderDraft = {
                customer_id: null,
                sales_order_rows: [{ variant_id: 101, quantity: 5 }],
            };

            expect(() => convertSalesOrderToCreatePayload(draftWithoutCustomer)).toThrow(
                "Customer ID is required to create a sales order."
            );
        });

        it("throws an error when sales_order_rows is empty", () => {
            const draftWithoutRows: KatanaSalesOrderDraft = {
                customer_id: 1,
                sales_order_rows: [],
            };

            expect(() => convertSalesOrderToCreatePayload(draftWithoutRows)).toThrow(
                "At least one item row is required."
            );
        });

        it("correctly converts a valid draft into CreateSalesOrderPayload", () => {
            const draft: KatanaSalesOrderDraft = {
                customer_id: 10,
                order_no: "  SO-2026-001  ",
                location_id: 2,
                delivery_date: "2026-08-20",
                order_created_date: "2026-08-15",
                currency: "USD",
                status: "NOT_SHIPPED",
                additional_info: "請冷藏配送",
                customer_ref: "PO-9999",
                sales_order_rows: [
                    {
                        variant_id: 201,
                        quantity: 10,
                        price_per_unit: "150.50",
                        tax_rate_id: 3,
                        location_id: 2,
                    },
                    {
                        variant_id: 202,
                        quantity: 2,
                        price_per_unit: 80,
                        tax_rate_id: null,
                    },
                ],
            };

            const payload = convertSalesOrderToCreatePayload(draft);

            expect(payload.customer_id).toBe(10);
            expect(payload.order_no).toBe("SO-2026-001");
            expect(payload.location_id).toBe(2);
            expect(payload.delivery_date).toBe("2026-08-20");
            expect(payload.order_created_date).toBe("2026-08-15");
            expect(payload.currency).toBe("USD");
            expect(payload.status).toBe("NOT_SHIPPED");
            expect(payload.additional_info).toBe("請冷藏配送");
            expect(payload.customer_ref).toBe("PO-9999");

            expect(payload.sales_order_rows).toHaveLength(2);
            expect(payload.sales_order_rows[0]).toEqual({
                variant_id: 201,
                quantity: 10,
                price_per_unit: 150.5,
                tax_rate_id: 3,
                location_id: 2,
            });
            expect(payload.sales_order_rows[1]).toEqual({
                variant_id: 202,
                quantity: 2,
                price_per_unit: 80,
            });
        });

        it("sanitizes empty whitespace strings to undefined", () => {
            const draft: KatanaSalesOrderDraft = {
                customer_id: 10,
                order_no: "   ",
                additional_info: "",
                customer_ref: "  ",
                delivery_date: "",
                currency: "  ",
                sales_order_rows: [{ variant_id: 101, quantity: 1 }],
            };

            const payload = convertSalesOrderToCreatePayload(draft);

            expect(payload.order_no).toBeUndefined();
            expect(payload.additional_info).toBeUndefined();
            expect(payload.customer_ref).toBeUndefined();
            expect(payload.delivery_date).toBeUndefined();
            expect(payload.currency).toBeUndefined();
        });
    });

    describe("convertSalesOrderToUpdatePayload (PATCH /sales_orders/:id)", () => {
        it("creates a partial update payload from provided fields", () => {
            const partialDraft: Partial<KatanaSalesOrderDraft> = {
                customer_id: 20,
                location_id: 3,
                order_no: " SO-EDITED ",
                status: "PACKED",
                delivery_date: "2026-09-01",
                additional_info: " 改為常溫 ",
            };

            const payload = convertSalesOrderToUpdatePayload(partialDraft);

            expect(payload.customer_id).toBe(20);
            expect(payload.location_id).toBe(3);
            expect(payload.order_no).toBe("SO-EDITED");
            expect(payload.status).toBe("PACKED");
            expect(payload.delivery_date).toBe("2026-09-01");
            expect(payload.additional_info).toBe("改為常溫");
            expect(payload.currency).toBeUndefined();
            expect(payload.customer_ref).toBeUndefined();
        });

        it("omits empty optional fields when updating", () => {
            const partialDraft: Partial<KatanaSalesOrderDraft> = {
                order_no: "",
                additional_info: "   ",
                customer_ref: "",
                delivery_date: "",
                currency: "",
            };

            const payload = convertSalesOrderToUpdatePayload(partialDraft);

            expect(payload.order_no).toBeUndefined();
            expect(payload.additional_info).toBeUndefined();
            expect(payload.customer_ref).toBeUndefined();
            expect(payload.delivery_date).toBeUndefined();
            expect(payload.currency).toBeUndefined();
        });
    });
});