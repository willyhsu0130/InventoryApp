import type { KatanaManufacturingOrder } from "@/models/katana/manufacture";
import { DataTable, type Column } from "../DataTable";
import { useProductCatalog } from "@/hooks/useContexts";
import { format } from "date-fns";

interface ManufactureTableProps {
    items: KatanaManufacturingOrder[];
    onRowClick?: (moId: number) => void;
}

export const ManufactureTable = ({ items, onRowClick }: ManufactureTableProps) => {
    const { getVariantDetails } = useProductCatalog();

    const getStatusBadge = (status: KatanaManufacturingOrder["status"]) => {
        switch (status) {
            case "DONE":
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                        已完成 (DONE)
                    </span>
                );
            case "IN_PROGRESS":
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-950 text-blue-400 border border-blue-800/60">
                        進行中 (IN_PROGRESS)
                    </span>
                );
            case "BLOCKED":
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-950 text-red-400 border border-red-800/60">
                        已阻塞 (BLOCKED)
                    </span>
                );
            case "NOT_STARTED":
            default:
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        未開始 (NOT_STARTED)
                    </span>
                );
        }
    };

    const columns: Column<KatanaManufacturingOrder>[] = [
        {
            header: "工單編號",
            render: (mo) => (
                <div className="flex flex-col">
                    <span className="font-mono text-sm font-medium text-slate-100">
                        {mo.order_no || `MO-${mo.id}`}
                    </span>
                    {mo.is_linked_to_sales_order && (
                        <span className="text-[10px] text-purple-400 font-mono">
                            MTO 訂單連動
                        </span>
                    )}
                </div>
            ),
        },
        {
            header: "製造商品 / 規格",
            render: (mo) => {
                const details = getVariantDetails(mo.variant_id);
                return (
                    <div className="flex flex-col">
                        <span className="font-medium text-slate-100 text-sm">
                            {details?.product_name ?? `Variant #${mo.variant_id}`}
                        </span>
                        {details?.variant_details && (
                            <span className="text-xs text-slate-400 mt-0.5">
                                {details.variant_details}
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            header: "狀態",
            align: "center",
            render: (mo) => getStatusBadge(mo.status),
        },
        {
            header: "計畫 / 實際產量",
            align: "right",
            render: (mo) => (
                <div className="font-mono text-xs text-slate-200">
                    <span>{mo.planned_quantity}</span>
                    <span className="text-slate-500 mx-1">/</span>
                    <span className={mo.actual_quantity ? "text-emerald-400 font-bold" : "text-slate-500"}>
                        {mo.actual_quantity ?? "0"}
                    </span>
                </div>
            ),
        },
        {
            header: "預計完工日",
            align: "right",
            render: (mo) => (
                <span className="text-slate-400 text-xs font-mono">
                    {mo.production_deadline_date
                        ? format(new Date(mo.production_deadline_date), "yyyy/MM/dd")
                        : "—"}
                </span>
            ),
        },
    ];

    return (
        <DataTable
            data={items}
            columns={columns}
            keyExtractor={(mo) => mo.id.toString()}
            onRowClick={onRowClick ? (mo) => onRowClick(mo.id) : undefined}
            emptyMessage="尚無任何製造工單。"
        />
    );
};