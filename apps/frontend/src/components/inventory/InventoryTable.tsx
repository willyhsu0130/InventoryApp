import type { FC } from "react";
import { DataTable, type Column } from "../DataTable";

export interface DisplayInventoryRow {
    variantId: number;
    productId: number;
    productName: string;
    displayName: string;
    sku: string;
    uom: string;
    inStock: number;
    configValues: string[];
}

interface InventoryTableProps {
    items: DisplayInventoryRow[];
    /** Opens a stock adjustment prefilled with the clicked variant. */
    onRowClick?: (variantId: number) => void;
}

export const InventoryTable: FC<InventoryTableProps> = ({ items, onRowClick }) => {
    const columns: Column<DisplayInventoryRow>[] = [
        {
            header: "商品 / 規格",
            render: (item) => {
                const specDetails = item.configValues.join(" / ");
                return (
                    <div className="font-sans">
                        <div className="font-medium text-foreground text-sm">
                            {item.productName}
                        </div>
                        {specDetails && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                                {specDetails}
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            header: "SKU",
            render: (item) => (
                <span className="text-slate-400 font-mono text-xs">
                    {item.sku || "—"}
                </span>
            ),
        },
        {
            header: "現有庫存",
            align: "right",
            render: (item) => (
                <span className="font-bold text-foreground font-mono">
                    {item.inStock.toLocaleString()}{" "}
                    <span className="text-muted-foreground font-normal text-[10px]">
                        {item.uom}
                    </span>
                </span>
            ),
        },
        {
            header: "庫存狀態",
            align: "center",
            render: (item) => {
                const isOutOfStock = item.inStock <= 0;

                return isOutOfStock ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-950/60 text-amber-400 border border-amber-800/50 font-sans">
                        缺貨 / 需補貨
                    </span>
                ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 font-sans">
                        正常
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
                keyExtractor={(item) => `${item.variantId}`}
                onRowClick={onRowClick ? (item) => onRowClick(item.variantId) : undefined}
                emptyMessage="查無庫存項目。"
            />
        </div>
    );
};