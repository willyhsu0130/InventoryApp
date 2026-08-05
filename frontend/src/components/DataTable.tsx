// src/components/common/DataTable.tsx
import type { ReactNode } from "react";

export interface Column<T> {
    header: string;
    align?: "left" | "center" | "right";
    className?: string;
    render: (item: T) => ReactNode;
}

interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    keyExtractor: (item: T) => string | number;
    emptyMessage?: string;
    onRowClick?: (item: T) => void; 
}

export function DataTable<T>({
    data,
    columns,
    keyExtractor,
    emptyMessage = "查無符合條件的項目。",
    onRowClick,
}: DataTableProps<T>) {
    return (
        <div
            className="overflow-auto overscroll-contain h-full rounded-lg border border-slate-800 bg-slate-900/50 shadow-sm relative"
            id="dataTable"
        >
            <table className="w-full text-left text-sm text-slate-300 border-separate border-spacing-0">
                <thead className="sticky top-0 z-10 text-slate-400 font-medium text-xs uppercase tracking-wider">
                    <tr>
                        {columns.map((col, idx) => (
                            <th
                                key={idx}
                                className={`py-3 px-4 bg-slate-950 border-b border-slate-800 ${
                                    col.align === "right"
                                        ? "text-right"
                                        : col.align === "center"
                                        ? "text-center"
                                        : "text-left"
                                } ${col.className || ""}`}
                            >
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                    {data.length === 0 ? (
                        <tr>
                            <td
                                colSpan={columns.length}
                                className="py-8 text-center text-slate-500 font-sans"
                            >
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        data.map((item) => (
                            <tr
                                key={keyExtractor(item)}
                                onClick={() => onRowClick?.(item)}
                                className={`hover:bg-slate-800/60 transition-colors ${
                                    onRowClick ? "cursor-pointer" : ""
                                }`}
                            >
                                {columns.map((col, idx) => (
                                    <td
                                        key={idx}
                                        className={`py-3 px-4 border-b border-slate-800/40 ${
                                            col.align === "right"
                                                ? "text-right"
                                                : col.align === "center"
                                                ? "text-center"
                                                : "text-left"
                                        }`}
                                    >
                                        {col.render(item)}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}