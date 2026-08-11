// src/components/common/DataTable.tsx
import type { ReactNode } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

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
            className="relative flex h-full min-h-0 min-w-0 w-full overflow-hidden overscroll-contain rounded-md border bg-card [&_td]:text-foreground [&_.text-slate-100]:!text-foreground [&_.text-slate-200]:!text-foreground [&_.text-slate-300]:!text-foreground [&_.text-slate-400]:!text-muted-foreground [&_.text-slate-500]:!text-muted-foreground"
            id="dataTable"
        >
            <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow className="hover:bg-card">
                        {columns.map((col, idx) => (
                            <TableHead
                                key={idx}
                                className={`whitespace-nowrap text-xs uppercase tracking-wider ${
                                    col.align === "right"
                                        ? "text-right"
                                        : col.align === "center"
                                        ? "text-center"
                                        : "text-left"
                                } ${col.className || ""}`}
                            >
                                {col.header}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody className="font-mono text-xs">
                    {data.length === 0 ? (
                        <TableRow>
                            <TableCell
                                colSpan={columns.length}
                                className="h-24 text-center font-sans text-muted-foreground"
                            >
                                {emptyMessage}
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((item) => (
                            <TableRow
                                key={keyExtractor(item)}
                                onClick={() => onRowClick?.(item)}
                                className={`${
                                    onRowClick ? "cursor-pointer" : ""
                                }`}
                            >
                                {columns.map((col, idx) => (
                                    <TableCell
                                        key={idx}
                                        className={`whitespace-nowrap ${
                                            col.align === "right"
                                                ? "text-right"
                                                : col.align === "center"
                                                ? "text-center"
                                                : "text-left"
                                        }`}
                                    >
                                        {col.render(item)}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}