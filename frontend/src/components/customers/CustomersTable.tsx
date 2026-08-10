// src/components/customers/CustomersTable.tsx
import type { KatanaCustomer } from "@/models/katana";
import { DataTable, type Column } from "../DataTable";
import { format } from "date-fns";

interface CustomersTableProps {
    items: KatanaCustomer[];
    /** Callback fired when clicking a customer row. */
    onRowClick?: (customerId: number) => void;
}

export const CustomersTable = ({ items, onRowClick }: CustomersTableProps) => {
    const columns: Column<KatanaCustomer>[] = [
        {
            header: "客戶全名",
            render: (customer) => {
                const name = `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim();
                const displayName = customer.name || name || "未命名客戶";

                return (
                    <div className="flex flex-col">
                        <span className="font-medium text-slate-100 text-sm">
                            {displayName}
                        </span>
                        {customer.email && (
                            <span className="text-xs text-slate-400 font-mono">
                                {customer.email}
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            header: "公司名稱",
            render: (customer) => (
                <span className="text-slate-300 text-sm">
                    {customer.company || "—"}
                </span>
            ),
        },
        {
            header: "電話",
            render: (customer) => (
                <span className="text-slate-400 text-xs font-mono">
                    {customer.phone || "—"}
                </span>
            ),
        },
        {
            header: "預設幣別",
            align: "center",
            render: (customer) => (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-slate-800 text-slate-300 border border-slate-700">
                    {customer.currency || "TWD"}
                </span>
            ),
        },
        {
            header: "折扣率",
            align: "right",
            render: (customer) => (
                <span className="text-emerald-400 font-mono text-xs font-medium">
                    {customer.discount_rate != null ? `${customer.discount_rate}%` : "—"}
                </span>
            ),
        },
        {
            header: "建立時間",
            align: "right",
            render: (customer) => (
                <span className="text-slate-500 text-xs font-mono">
                    {customer.created_at
                        ? format(new Date(customer.created_at), "yyyy/MM/dd")
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
                keyExtractor={(customer) => customer.id.toString()}
                onRowClick={onRowClick ? (customer) => onRowClick(customer.id) : undefined}
                emptyMessage="找不到符合條件的客戶。"
            />
        </div>
    );
};