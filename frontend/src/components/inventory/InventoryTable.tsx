// src/components/inventory/InventoryTable.tsx
import { useContext } from "react";
import type { KatanaInventoryItem } from "../../models/katana/inventory";
import { ProductContext } from "../../context/ProductContext";
import { DataTable, type Column } from "../DataTable";

interface InventoryTableProps {
    items: KatanaInventoryItem[];
    /** Opens a stock adjustment prefilled with the clicked variant. */
    onRowClick?: (variantId: number) => void;
}

export const InventoryTable = ({ items, onRowClick }: InventoryTableProps) => {
    const productCtx = useContext(ProductContext);

    // Define column schemas tailored to inventory items
    const columns: Column<KatanaInventoryItem>[] = [
        {
            header: "商品 / 規格",
            render: (item) => {
                const details = productCtx?.getVariantDetails(item.variant_id);
                return (
                    <div className="font-sans">
                        <div className="font-medium text-foreground text-sm">
                            {details?.product_name ?? `Variant #${item.variant_id}`}
                        </div>
                        {details?.variant_details && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                                {details.variant_details}
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            header: "SKU",
            render: (item) => {
                const details = productCtx?.getVariantDetails(item.variant_id);
                return (
                    <span className="text-slate-400 font-mono text-xs">
                        {details?.sku || "N/A"}
                    </span>
                );
            },
        },
        {
            header: "現貨",
            align: "right",
            render: (item) => {
                const details = productCtx?.getVariantDetails(item.variant_id);
                return (
                    <span className="font-bold text-foreground">
                        {parseFloat(item.quantity_in_stock)}{" "}
                        <span className="text-muted-foreground font-normal text-[10px]">
                            {details?.uom}
                        </span>
                    </span>
                );
            },
        },
        {
            header: "使用",
            align: "right",
            render: (item) => (
                <span className="text-foreground">
                    {parseFloat(item.quantity_committed)}
                </span>
            ),
        },
        {
            header: "預期",
            align: "right",
            render: (item) => (
                <span className="text-foreground">
                    {parseFloat(item.quantity_expected)}
                </span>
            ),
        },
        {
            header: "狀態",
            align: "center",
            render: (item) => {
                const missingOrExcess = parseFloat(item.quantity_missing_or_excess);
                const isShortage = missingOrExcess < 0;

                return isShortage ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-950/60 text-amber-400 border border-amber-800/50 font-sans">
                        不足 ({missingOrExcess.toFixed(1)})
                    </span>
                ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 font-sans">
                        正常
                    </span>
                );
            },
        },
        {
            header: "平均成本($)",
            align: "right",
            render: (item) => (
                <span className="text-slate-300">
                    ${parseFloat(item.average_cost).toFixed(2)}
                </span>
            ),
        },
        {
            header: "總價值($)",
            align: "right",
            render: (item) => (
                <span className="text-emerald-400 font-medium">
                    ${parseFloat(item.value_in_stock).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                    })}
                </span>
            ),
        },
    ];

    return (
        <div className="flex flex-col gap-y-3 h-full min-h-0">
            <DataTable
                data={items}
                columns={columns}
                keyExtractor={(item) => `${item.variant_id}-${item.location_id}`}
                onRowClick={onRowClick ? (item) => onRowClick(item.variant_id) : undefined}
                emptyMessage="No matching inventory items found."
            />
        </div>

    );
};