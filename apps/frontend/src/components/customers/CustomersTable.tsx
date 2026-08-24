// src/components/customers/CustomersTable.tsx
import type { FC } from "react";
import type { Customer } from "@my-inventory-app/shared";
import { DataTable, type Column } from "../DataTable";

interface CustomersTableProps {
    items: Customer[];
    /** Callback fired when clicking a customer row. */
    onRowClick?: (customerId: number) => void;
}

export const CustomersTable: FC<CustomersTableProps> = ({ items, onRowClick }) => {
    const columns: Column<Customer>[] = [
        {
            header: "客戶全名",
            render: (customer) => {
                const fullName = `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim();
                const displayName = fullName || "未命名客戶";

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
                    {customer.phoneNumber || "—"}
                </span>
            ),
        },
        {
            header: "城市 / 國家",
            render: (customer) => {
                const parts = [customer.city, customer.country].filter(Boolean);
                return (
                    <span className="text-slate-400 text-xs font-sans">
                        {parts.length > 0 ? parts.join(", ") : "—"}
                    </span>
                );
            },
        },
        {
            header: "地址",
            render: (customer) => {
                const addressParts = [customer.line1, customer.line2, customer.state]
                    .filter(Boolean)
                    .join(" ");

                return (
                    <span className="text-slate-400 text-xs font-sans max-w-xs truncate block" title={addressParts || undefined}>
                        {addressParts || "—"}
                    </span>
                );
            },
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