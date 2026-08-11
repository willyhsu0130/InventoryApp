import { InventoryTable } from "@/components/inventory/InventoryTable";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { ManufactureTable } from "@/components/manufacture/ManufactureTable";
import {
    useInventoryCatalog,
    useOrdersCatalog,
    useManufactureCatalog,
} from "@/hooks/useContexts";
import { useMemo } from "react";
import { Link } from "react-router";

export const Dashboard = () => {
    const { inventory } = useInventoryCatalog();
    const { orders } = useOrdersCatalog();
    const { manufactureOrders } = useManufactureCatalog();

    const inventoryList = useMemo(() => Array.from(inventory.values()), [inventory]);
    const ordersList = useMemo(() => Array.from(orders.values()), [orders]);
    const manufactureList = useMemo(
        () => Array.from(manufactureOrders.values()),
        [manufactureOrders]
    );

    return (
        /* Full height container with a 2-column grid */
        <div className="w-full h-[calc(100vh-4rem)] p-4 grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* LEFT COLUMN: 1/3 top (Summary), 2/3 bottom (Orders) */}
            <div className="flex flex-col gap-4 h-full min-h-0">
                {/* 1/3 Height Card - Summary Placeholder */}
                <div className="h-1/3 min-h-0 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        快速概覽
                    </h3>
                    <div className="flex-1 min-h-0 bg-slate-950/50 rounded-lg p-3 border border-slate-800/60 overflow-hidden">
                        {/* 1/3 Content */}
                        <div>

                        </div>
                        <div>

                        </div>
                        <div>

                        </div>
                    </div>
                </div>

                {/* 2/3 Height Card - Orders Table */}
                <div className="h-2/3 min-h-0 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            訂單總覽
                        </h3>
                        <Link
                            to="/orders"
                            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                        >
                            查看全部 →
                        </Link>
                    </div>
                    <div className="flex-1 min-h-0 bg-slate-950/50 rounded-lg p-3 border border-slate-800/60 overflow-y-auto">
                        <OrdersTable items={ordersList} />
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: 1/2 top (Inventory), 1/2 bottom (Manufacture) */}
            <div className="flex flex-col gap-4 h-full min-h-0">
                {/* 1/2 Height Card - Inventory Table */}
                <div className="h-1/2 min-h-0 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            庫存預警
                        </h3>
                        <Link
                            to="/inventory"
                            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                        >
                            查看全部 →
                        </Link>
                    </div>

                    <div className="flex-1 min-h-0 bg-slate-950/50 rounded-lg p-3 border border-slate-800/60 overflow-y-auto">
                        <InventoryTable items={inventoryList} />
                    </div>
                </div>

                {/* 1/2 Height Card - Manufacture Table */}
                <div className="h-1/2 min-h-0 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            製造
                        </h3>
                        <Link
                            to="/manufacture"
                            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                        >
                            查看全部 →
                        </Link>
                    </div>
                    <div className="flex-1 min-h-0 bg-slate-950/50 rounded-lg p-3 border border-slate-800/60 overflow-y-auto">
                        <ManufactureTable items={manufactureList} />
                    </div>
                </div>
            </div>

        </div>
    );
};