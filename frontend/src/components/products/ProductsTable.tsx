// src/components/products/ProductsTable.tsx
import { DataTable, type Column } from "../DataTable";
import type { DisplayProductRow } from "../../pages/Products";
import { Button } from "@/components/ui/button";

interface ProductsTableProps {
    items: DisplayProductRow[]
    onRowClick: (productId: number) => void;
}
export const ProductsTable = ({ items, onRowClick }: ProductsTableProps) => {
    const columns: Column<DisplayProductRow>[] = [
        {
            header: "",
            align: "center",
            className: "w-10",
            render: () => (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    title="編輯"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-4 h-4"
                    >
                        <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                        <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10a.75.75 0 000-1.5H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                    </svg>
                </Button>
            ),
        },
        {
            header: "產品名稱 / 規格",
            render: (item) => (
                <div className="font-sans font-medium text-slate-100 text-sm">
                    {item.name}
                    {/* {item.variant_details && (
                        <span className="ml-2 text-xs text-slate-400 font-normal">
                            ({item.variant_details})
                        </span>
                    )} */}
                </div>
            ),
        },
        {
            header: "SKU",
            render: (item) => (
                <span className="font-mono text-slate-300">{item.sku || "N/A"}</span>
            ),
        },
        // {
        //     header: "類別",
        //     render: (item) => (
        //         <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700/60 font-sans">
        //             {item.category_name}
        //         </span>
        //     ),
        // },
        {
            header: "單位",
            align: "center",
            render: (item) => (
                <span className="font-mono text-slate-400">{item.uom}</span>
            ),
        },
        {
            header: "Variant ID",
            align: "right",
            render: (item) => (
                <span className="font-mono text-muted-foreground">#{item.variantId}</span>
            ),
        },
    ];

    return (
        <div className="h-full min-h-0 flex flex-col overflow-hidden rounded-xl">
            <DataTable
                data={items}
                columns={columns}
                keyExtractor={(item) => item.variantId}
                onRowClick={(item) => onRowClick(item.id)}
                emptyMessage="查無符合條件的產品。"
            />

            {/* Edit Modal */}
           
        </div>
    );
};