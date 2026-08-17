import type { KatanaSalesOrder, KatanaSalesOrderDraft, UpdateSalesOrderRowPayload } from "@/models/katana/salesOrder";
import { createContext } from "react";

/** A variant that already exists in Katana, so it can be PATCHed by id. */

interface OrdersContextType {
    orders: Map<number, KatanaSalesOrder>;
    refetchOrders: () => Promise<void>;
    loading: boolean
    deleteOrder: (id: KatanaSalesOrder["id"]) => Promise<void>
    createOrder: (draft: KatanaSalesOrderDraft) => Promise<KatanaSalesOrder>
    editOrder: (id: number, order: Partial<KatanaSalesOrderDraft>) => Promise<KatanaSalesOrder>
    updateOrderRow: (id: number, payload: UpdateSalesOrderRowPayload) => Promise<void>
}
export const OrdersContext = createContext<OrdersContextType | undefined>(undefined);