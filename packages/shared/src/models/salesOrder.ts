import { Batch } from "./batch";
import { Customer } from "./customer";
import { Variant } from "./variant";
import { Location } from "./location";

export type SalesOrderItem = {
    id: number;
    salesOrderId: number;
    variantId: Variant["id"];
    batchId: Batch["id"] | null;
    quantity: number;
    pricePerUnit: number;
};

export type SalesOrder = {
    id: number;
    customerId: Customer["id"];
    salesOrderStatus: "PENDING" | "COMPLETED";
    locationId: Location["id"];
    createdAt: string;
    updatedAt: string;
    salesOrderItems: SalesOrderItem[];
};

export type CreateSalesOrderPayload = {
    customerId: Customer["id"];
    locationId: Location["id"];
    salesOrderStatus?: "PENDING" | "COMPLETED";
    salesOrderItems: Omit<SalesOrderItem, "id" | "salesOrderId">[];
};