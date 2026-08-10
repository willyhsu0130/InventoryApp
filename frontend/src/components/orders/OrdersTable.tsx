// src/components/orders/OrdersTable.tsx
import type { KatanaSalesOrder, KatanaSalesOrderStatus } from "../../models/katana/katana";
import { DataTable, type Column } from "../DataTable";
import { format } from "date-fns";

interface OrdersTableProps {
    items: KatanaSalesOrder[];
    /** Callback fired when clicking an order row. */
    onRowClick?: (orderId: number) => void;
}

/** Render styled badges for sales order status */
const renderStatusBadge = (status: KatanaSalesOrderStatus) => {
    switch (status) {
        case "DELIVERED":
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 font-sans">
                    已交貨 (Delivered)
                </span>
            );
        case "PACKED":
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-950/60 text-teal-400 border border-teal-800/50 font-sans">
                    已打包 (Packed)
                </span>
            );
        case "PARTIALLY_DELIVERED":
        case "PARTIALLY_PACKED":
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-950/60 text-blue-400 border border-blue-800/50 font-sans">
                    部分處理 (Partial)
                </span>
            );
        case "CANCELLED":
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-950/60 text-red-400 border border-red-800/50 font-sans">
                    已取消 (Cancelled)
                </span>
            );
        case "NOT_SHIPPED":
        default:
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-950/60 text-amber-400 border border-amber-800/50 font-sans">
                    未出貨 (Not Shipped)
                </span>
            );
    }
};

export const OrdersTable = ({ items, onRowClick }: OrdersTableProps) => {
    const columns: Column<KatanaSalesOrder>[] = [
        {
            header: "訂單編號",
            render: (order) => (
                <span className="font-mono font-medium text-slate-100 text-sm">
                    {order.order_no}
                </span>
            ),
        },
        {
            header: "狀態",
            align: "center",
            render: (order) => renderStatusBadge(order.status),
        },
        {
            header: "預計交貨日",
            render: (order) => (
                <span className="text-slate-400 text-xs font-mono">
                    {order.delivery_date
                        ? format(new Date(order.delivery_date), "yyyy/MM/dd")
                        : "—"}
                </span>
            ),
        },
        {
            header: "項目數量",
            align: "center",
            render: (order) => {
                const totalItems = order.sales_order_rows?.reduce(
                    (sum, row) => sum + row.quantity,
                    0
                ) ?? 0;

                return (
                    <span className="text-slate-300 font-mono text-xs">
                        {order.sales_order_rows?.length ?? 0} 款 ({totalItems} 件)
                    </span>
                );
            },
        },
        {
            header: "訂單總額",
            align: "right",
            render: (order) => {
                const currencyPrefix = order.currency === "TWD" ? "NT$" : "$";
                const amount = order.total ?? 0;

                return (
                    <span className="text-emerald-400 font-medium font-mono text-sm">
                        {currencyPrefix}{amount.toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2,
                        })}
                    </span>
                );
            },
        },
        {
            header: "建立時間",
            align: "right",
            render: (order) => (
                <span className="text-slate-500 text-xs font-mono">
                    {order.created_at
                        ? format(new Date(order.created_at), "yyyy/MM/dd")
                        : "—"}
                </span>
            ),
        },
    ];

    return (
        <div className="flex flex-col gap-y-3 h-full min-h-0">
            <DataTable
                data={items}
                columns={columns}
                keyExtractor={(order) => order.id.toString()}
                onRowClick={onRowClick ? (order) => onRowClick(order.id) : undefined}
                emptyMessage="找不到符合條件的訂單。"
            />
        </div>
    );
};