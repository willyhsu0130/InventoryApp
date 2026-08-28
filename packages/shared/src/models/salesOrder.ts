import { Batch } from "./batch";
import { Customer } from "./customer";
import { Variant } from "./variant";
import { Location } from "./location";

export type SalesOrderStatus = "PENDING" | "COMPLETED" | "CANCELLED";

export type SalesOrderItem = {
    id: number;
    salesOrderId: number;
    variantId: Variant["id"];
    batchId: Batch["id"] | null;
    quantity: number;
    pricePerUnit: number;
    fulfilledQuantity?: number;
    notes?: string | null;
};

export type SalesOrder = {
    id: number;
    customerId: Customer["id"];
    locationId: Location["id"];
    shippingLocationId?: Location["id"] | null;
    salesOrderStatus: SalesOrderStatus;
    expectedDeliveryDate?: string | null;
    notes?: string | null;
    createdAt: string;
    updatedAt: string;
    salesOrderItems: SalesOrderItem[];
};

export type CreateSalesOrderPayload = {
    customerId: Customer["id"];
    locationId: Location["id"];
    shippingLocationId?: Location["id"] | null;
    salesOrderStatus?: SalesOrderStatus;
    expectedDeliveryDate?: string | null;
    notes?: string | null;
    salesOrderItems: Omit<SalesOrderItem, "id" | "salesOrderId">[];
};