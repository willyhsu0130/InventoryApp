// src/components/orders/OrdersTable.tsx
import type { FC } from "react";
import { DataTable, type Column } from "../DataTable";
import { format } from "date-fns";

export interface DisplaySalesOrderItem {
    variantId: number;
    productName: string;
    sku: string;
    specs: string;
    quantity: number;
    pricePerUnit: number;
}

export interface DisplaySalesOrderRow {
    id: number;
    customerId: number;
    customerName: string;
    locationId: number;
    locationName: string;
    status: "PENDING" | "COMPLETED";
    totalQuantity: number;
    totalPrice: number;
    createdAt: string;
    items: DisplaySalesOrderItem[];
}

interface OrdersTableProps {
    items: DisplaySalesOrderRow[];
    /** Callback fired when clicking an order row. */
    onRowClick?: (orderId: number) => void;
    visibleColumns?: Record<string, boolean>;
}

/** Render styled badges for sales order status */
const renderStatusBadge = (status: DisplaySalesOrderRow["status"]) => {
    switch (status) {
        case "COMPLETED":
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 font-sans">
                    已完成 (Completed)
                </span>
            );
        case "PENDING":
        default:
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-950/60 text-amber-400 border border-amber-800/50 font-sans">
                    處理中 (Pending)
                </span>
            );
    }
};

export const OrdersTable: FC<OrdersTableProps> = ({
    items,
    onRowClick,
    visibleColumns,
}) => {
    const allColumns: (Column<DisplaySalesOrderRow> & { id: string })[] = [
        {
            id: "orderNo",
            header: "訂單編號",
            render: (order) => (
                <span className="font-mono font-medium text-slate-100 text-sm">
                    SO-{order.id.toString().padStart(5, "0")}
                </span>
            ),
        },
        {
            id: "customer",
            header: "客戶名稱",
            render: (order) => (
                <span className="font-sans font-medium text-slate-200">
                    {order.customerName}
                </span>
            ),
        },
        {
            id: "status",
            header: "狀態",
            align: "center",
            render: (order) => renderStatusBadge(order.status),
        },
        {
            id: "itemCount",
            header: "項目數量",
            align: "center",
            render: (order) => (
                <span className="text-slate-300 font-mono text-xs">
                    {order.items.length} 款 ({order.totalQuantity} 件)
                </span>
            ),
        },
        {
            id: "total",
            header: "訂單總額",
            align: "right",
            render: (order) => (
                <span className="text-emerald-400 font-medium font-mono text-sm">
                    ${order.totalPrice.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                    })}
                </span>
            ),
        },
        {
            id: "createdAt",
            header: "建立時間",
            align: "right",
            render: (order) => (
                <span className="text-slate-500 text-xs font-mono">
                    {order.createdAt
                        ? format(new Date(order.createdAt), "yyyy/MM/dd")
                        : "—"}
                </span>
            ),
        },
    ];

    const activeColumns = allColumns.filter(
        (col) => visibleColumns?.[col.id] ?? true
    );

    return (
        <div className="flex flex-col gap-y-3 h-full min-h-0">
            <DataTable
                data={items}
                columns={activeColumns}
                keyExtractor={(order) => order.id.toString()}
                onRowClick={onRowClick ? (order) => onRowClick(order.id) : undefined}
                emptyMessage="找不到符合條件的訂單。"
            />
        </div>
    );
};