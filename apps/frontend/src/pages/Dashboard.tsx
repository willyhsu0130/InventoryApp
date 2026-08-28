// src/pages/Dashboard.tsx
import { useState, useEffect, useMemo, type FC, type ReactNode } from "react";
import { Boxes, ShoppingCart, ArrowUpRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { InventoryTable } from "@/components/inventory/InventoryTable";
import { OrdersTable, type DisplaySalesOrderRow } from "@/components/orders/OrdersTable";
import type { DisplayInventoryRow } from "@/pages/Inventory";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Customer, Location, Product, SalesOrder, Variant } from "@my-inventory-app/shared";
import { getSalesOrdersByStatus } from "@/services/salesOrderService";
import { getActiveProducts } from "@/services/productService";
import { getActiveVariants } from "@/services/variantService";
import { getTotalStockByVariantId } from "@/services/inventoryLevelService";
import { getCustomers } from "@/services/customerService";
import { getLocations } from "@/services/locationService";

const sectionLinks = {
    orders: "/orders",
    inventory: "/inventory",
} as const;

export const Dashboard: FC = () => {
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const [orders, setOrders] = useState<DisplaySalesOrderRow[]>([]);
    const [inventory, setInventory] = useState<DisplayInventoryRow[]>([]);

    useEffect(() => {
        let isMounted = true;

        const loadDashboardData = async () => {
            setIsLoading(true);
            setErrorMessage(null);

            try {
                // 1. Fetch all core resources in parallel
                const [
                    pendingOrders,
                    completedOrders,
                    products,
                    variants,
                    customers,
                    locations,
                ] = await Promise.all([
                    getSalesOrdersByStatus("PENDING").catch(() => [] as SalesOrder[]),
                    getSalesOrdersByStatus("COMPLETED").catch(() => [] as SalesOrder[]),
                    getActiveProducts().catch(() => [] as Product[]),
                    getActiveVariants().catch(() => [] as Variant[]),
                    getCustomers().catch(() => [] as Customer[]),
                    getLocations().catch(() => [] as Location[]),
                ]);

                if (!isMounted) return;

                // 2. Build fast lookup maps
                const productMap = new Map<number, Product>();
                products.forEach((p) => productMap.set(p.id, p));

                const variantMap = new Map<number, Variant>();
                variants.forEach((v) => variantMap.set(v.id, v));

                const customerMap = new Map<number, Customer>();
                customers.forEach((c) => customerMap.set(c.id, c));

                const locationMap = new Map<number, Location>();
                locations.forEach((l) => locationMap.set(l.id, l));

                // 3. Hydrate live stock rows
                const inventoryRows: DisplayInventoryRow[] = await Promise.all(
                    variants.map(async (variant: Variant): Promise<DisplayInventoryRow> => {
                        const parentProduct = productMap.get(variant.productId);
                        const parentName = parentProduct?.name ?? "未命名產品";
                        const uom = parentProduct?.uom ?? "pcs";

                        const configValues = (variant.configs ?? [])
                            .map((c) => c.value)
                            .filter((val): boolean => Boolean(val?.trim()));

                        const displayName =
                            configValues.length > 0
                                ? `${parentName} - ${configValues.join(" / ")}`
                                : parentName;

                        const inStock = await getTotalStockByVariantId(variant.id).catch(() => 0);

                        return {
                            variantId: variant.id,
                            productId: variant.productId,
                            productName: parentName,
                            displayName,
                            sku: variant.sku ?? "",
                            uom,
                            inStock,
                            configValues,
                        };
                    })
                );

                // 4. Hydrate sales order rows
                const allOrders = [...pendingOrders, ...completedOrders].sort(
                    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );

                const orderRows: DisplaySalesOrderRow[] = allOrders.map((order): DisplaySalesOrderRow => {
                    const customer = customerMap.get(order.customerId);
                    const customerName = customer
                        ? `${customer.firstName} ${customer.lastName}`.trim()
                        : `客戶 #${order.customerId}`;

                    const location = locationMap.get(order.locationId);
                    const locationName = location?.name ?? `倉庫 #${order.locationId}`;

                    let totalQuantity = 0;
                    let totalPrice = 0;

                    const items = (order.salesOrderItems ?? []).map((item) => {
                        totalQuantity += item.quantity;
                        totalPrice += item.quantity * item.pricePerUnit;

                        const variant = variantMap.get(item.variantId);
                        const parentProduct = variant ? productMap.get(variant.productId) : undefined;
                        const productName = parentProduct?.name ?? `款式 #${item.variantId}`;

                        const specs = (variant?.configs ?? [])
                            .map((c) => c.value)
                            .filter(Boolean)
                            .join(" / ");

                        return {
                            variantId: item.variantId,
                            productName,
                            sku: variant?.sku ?? "",
                            specs,
                            quantity: item.quantity,
                            pricePerUnit: item.pricePerUnit,
                        };
                    });

                    return {
                        id: order.id,
                        customerId: order.customerId,
                        customerName,
                        locationId: order.locationId,
                        locationName,
                        status: order.salesOrderStatus,
                        totalQuantity,
                        totalPrice,
                        createdAt: order.createdAt,
                        items,
                    };
                });

                if (isMounted) {
                    setInventory(inventoryRows);
                    setOrders(orderRows);
                    setIsLoading(false);
                }
            } catch (err) {
                if (isMounted) {
                    setErrorMessage(err instanceof Error ? err.message : "載入總覽資料失敗。");
                    setIsLoading(false);
                }
            }
        };

        loadDashboardData();

        return () => {
            isMounted = false;
        };
    }, []);

    const stats = useMemo(() => [
        {
            label: "訂單",
            value: orders.length,
            description: "目前銷售訂單總數",
            icon: ShoppingCart,
        },
        {
            label: "庫存項目",
            value: inventory.length,
            description: "正在追蹤的商品款式",
            icon: Boxes,
        },
    ], [orders.length, inventory.length]);

    if (isLoading) {
        return (
            <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-muted/30 p-8 text-muted-foreground">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-medium">載入系統儀表板中...</p>
                </div>
            </div>
        );
    }

    if (errorMessage) {
        return (
            <div className="min-h-0 flex-1 overflow-y-auto bg-muted/30 p-8">
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-destructive">
                    <h2 className="text-lg font-semibold">無法載入總覽儀表板</h2>
                    <p className="mt-1 font-mono text-sm">{errorMessage}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-0 flex-1 overflow-y-auto bg-muted/30" id="dashboardPage">
            <div className="mx-auto w-full max-w-[1600px] space-y-6 p-4 md:p-6 lg:p-8">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">快速概覽</h1>
                    <p className="text-sm text-muted-foreground">查看庫存與銷售訂單的即時狀態。</p>
                </div>

                {/* Metric Summary Cards */}
                <div className="grid gap-4 sm:grid-cols-2">
                    {stats.map((stat) => {
                        const Icon = stat.icon;
                        return (
                            <Card key={stat.label}>
                                <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                                    <CardDescription>{stat.label}</CardDescription>
                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                                    <p className="text-xs text-muted-foreground">{stat.description}</p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Tables Overview */}
                <div className="grid gap-6 xl:grid-cols-2">
                    <DashboardSection
                        title="訂單總覽"
                        description="最近建立的銷售訂單"
                        href={sectionLinks.orders}
                    >
                        <OrdersTable items={orders.slice(0, 5)} />
                    </DashboardSection>

                    <DashboardSection
                        title="庫存狀態"
                        description="當前追蹤之庫存款式"
                        href={sectionLinks.inventory}
                    >
                        <InventoryTable items={inventory.slice(0, 5)} />
                    </DashboardSection>
                </div>
            </div>
        </div>
    );
};

interface DashboardSectionProps {
    title: string;
    description: string;
    href: string;
    children: ReactNode;
}

const DashboardSection: FC<DashboardSectionProps> = ({
    title,
    description,
    href,
    children,
}) => {
    return (
        <Card className="flex h-128 min-w-0 flex-col overflow-hidden">
            <CardHeader className="flex-row items-start justify-between gap-4 border-b border-border/40 pb-4">
                <div className="space-y-1">
                    <CardTitle className="text-base text-foreground">{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </div>
                <Link
                    to={href}
                    className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                    查看全部
                    <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
            </CardHeader>
            <CardContent className="min-h-0 min-w-0 flex-1 overflow-hidden p-0">
                {children}
            </CardContent>
        </Card>
    );
};