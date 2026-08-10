import { createContext } from "react";
import type {
    KatanaSalesOrder,
    KatanaSalesOrderDraft,
} from "../models/katana";

/** A variant that already exists in Katana, so it can be PATCHed by id. */

interface OrdersContextType {
    orders: Map<number, KatanaSalesOrder>;
    refetchOrders: () => Promise<void>;
    loading: boolean
    deleteOrder: (id: KatanaSalesOrder["id"]) => Promise<void>
    createOrder: (draft: KatanaSalesOrderDraft) => Promise<KatanaSalesOrder>
    editOrder: (id: number, order: Partial<KatanaSalesOrderDraft>) => Promise<KatanaSalesOrder>
}
export const OrdersContext = createContext<OrdersContextType | undefined>(undefined);