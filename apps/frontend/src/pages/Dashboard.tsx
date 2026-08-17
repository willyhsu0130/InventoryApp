import { Boxes, Factory, ShoppingCart, ArrowUpRight } from "lucide-react"
import { Link } from "react-router"
import { useMemo } from "react"
import type { ReactNode } from "react"

import { InventoryTable } from "@/components/inventory/InventoryTable"
import { OrdersTable } from "@/components/orders/OrdersTable"
import { ManufactureTable } from "@/components/manufacture/ManufactureTable"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useInventoryCatalog, useOrdersCatalog, useManufactureCatalog } from "@/hooks/useContexts"

const sectionLinks = {
    orders: "/orders",
    inventory: "/inventory",
    manufacture: "/manufacture",
} as const

const ORDER_VISIBLE_COLUMNS: Record<string, boolean> = {
    orderNo: true,
    status: false,
    deliveryDate: false,
    itemCount: true,
    total: true,
    createdAt: false,
};

export const Dashboard = () => {
    const { inventory } = useInventoryCatalog()
    const { orders } = useOrdersCatalog()
    const { manufactureOrders } = useManufactureCatalog()

    const inventoryList = useMemo(() => Array.from(inventory.values()), [inventory])
    const ordersList = useMemo(() => Array.from(orders.values()), [orders])
    const manufactureList = useMemo(() => Array.from(manufactureOrders.values()), [manufactureOrders])

    const stats = [
        { label: "訂單", value: ordersList.length, description: "目前銷售訂單", icon: ShoppingCart },
        { label: "庫存項目", value: inventoryList.length, description: "正在追蹤的品項", icon: Boxes },
        { label: "製造工單", value: manufactureList.length, description: "目前製造排程", icon: Factory },
    ]

    return (
        <div className="min-h-0 flex-1 overflow-y-auto bg-muted/30">
            <div className="mx-auto w-full max-w-[1600px] space-y-6 p-4 md:p-6 lg:p-8">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">快速概覽</h1>
                    <p className="text-sm text-muted-foreground">查看庫存、訂單與製造作業的即時狀態。</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {stats.map((stat) => {
                        const Icon = stat.icon
                        return (
                            <Card key={stat.label}>
                                <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                                    <CardDescription>{stat.label}</CardDescription>
                                    <Icon className="size-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stat.value}</div>
                                    <p className="text-xs text-muted-foreground">{stat.description}</p>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                    <DashboardSection title="訂單總覽" description="最近的銷售訂單" href={sectionLinks.orders}>
                        <OrdersTable items={ordersList} visibleColumns={ORDER_VISIBLE_COLUMNS} />
                    </DashboardSection>
                    <DashboardSection title="庫存預警" description="目前庫存狀態" href={sectionLinks.inventory}>
                        <InventoryTable items={inventoryList} />
                    </DashboardSection>
                </div>

                <DashboardSection title="製造" description="目前製造排程" href={sectionLinks.manufacture}>
                    <ManufactureTable items={manufactureList} />
                </DashboardSection>
            </div>
        </div>
    )
}

function DashboardSection({
    title,
    description,
    href,
    children,
}: {
    title: string
    description: string
    href: string
    children: ReactNode
}) {
    return (
        <Card className="flex h-[30rem] min-w-0 flex-col overflow-hidden">
            <CardHeader className="flex-row items-start justify-between gap-4">
                <div className="space-y-1">
                    <CardTitle className="text-base">{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </div>
                <Link
                    to={href}
                    className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                    查看全部
                    <ArrowUpRight className="size-3.5" />
                </Link>
            </CardHeader>
            <CardContent className="min-h-0 min-w-0 flex-1 overflow-hidden">
                {children}
            </CardContent>
        </Card>
    )
}
