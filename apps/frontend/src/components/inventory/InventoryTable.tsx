// apps/frontend/src/components/inventory/InventoryTable.tsx
import { useProductCatalog, useVariant } from "@/hooks/useContexts";
import type { KatanaInventoryItem } from "@my-inventory-app/shared"
import { DataTable, type Column } from "../DataTable";

interface InventoryTableProps {
    items: KatanaInventoryItem[];
    /** Opens a stock adjustment prefilled with the clicked variant. */
    onRowClick?: (variantId: number) => void;
}

export const InventoryTable = ({ items, onRowClick }: InventoryTableProps) => {
    const { products } = useProductCatalog();
    const { variants } = useVariant();

    const getDetails = (variantId: number) => {
        const variant = variants.get(variantId);
        const product = variant ? products.get(variant.product_id) : undefined;

        const detailsString = variant?.config_attributes
            ?.map((attr) => attr.config_value)
            .filter(Boolean)
            .join(" / ");

        return {
            product_name: product?.name ?? `Variant #${variantId}`,
            variant_details: detailsString || undefined,
            sku: variant?.sku || "N/A",
            uom: product?.uom || "",
        };
    };

    const columns: Column<KatanaInventoryItem>[] = [
        {
            header: "商品 / 規格",
            render: (item) => {
                const details = getDetails(item.variant_id);
                return (
                    <div className="font-sans">
                        <div className="font-medium text-foreground text-sm">
                            {details.product_name}
                        </div>
                        {details.variant_details && (
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
                const details = getDetails(item.variant_id);
                return (
                    <span className="text-slate-400 font-mono text-xs">
                        {details.sku}
                    </span>
                );
            },
        },
        {
            header: "現貨",
            align: "right",
            render: (item) => {
                const details = getDetails(item.variant_id);
                return (
                    <span className="font-bold text-foreground">
                        {item.quantity_in_stock}{" "}
                        <span className="text-muted-foreground font-normal text-[10px]">
                            {details.uom}
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
                    {item.quantity_committed}
                </span>
            ),
        },
        {
            header: "預期",
            align: "right",
            render: (item) => (
                <span className="text-foreground">
                    {item.quantity_expected}
                </span>
            ),
        },
        {
            header: "狀態",
            align: "center",
            render: (item) => {
                // Coalesce null/undefined to 0
                const missingOrExcess = item.quantity_missing_or_excess ?? 0;
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
                    ${item.average_cost.toFixed(2)}
                </span>
            ),
        },
        {
            header: "總價值($)",
            align: "right",
            render: (item) => (
                <span className="text-emerald-400 font-medium">
                    ${item.value_in_stock.toLocaleString(undefined, {
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
                keyExtractor={(item) => `${item.variant_id}`}
                onRowClick={onRowClick ? (item) => onRowClick(item.variant_id) : undefined}
                emptyMessage="No matching inventory items found."
            />
        </div>
    );
};