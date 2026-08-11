import { NavLink, useLocation } from "react-router-dom"
import { Fish } from "lucide-react"

import { navbarItems } from "./navbarItems"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"

export function Navbar() {
    const location = useLocation()

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" render={<NavLink to="/dashboard" />}>
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                    <Fish className="size-4" />
                                </span>
                                <span className="flex min-w-0 flex-col text-left">
                                    <span className="truncate font-semibold">晁欣漁產</span>
                                    <span className="truncate text-xs text-sidebar-foreground/60">庫存管理系統</span>
                                </span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>管理</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navbarItems.map((item) => {
                                const Icon = item.icon

                                return (
                                    <SidebarMenuItem key={item.link}>
                                        <SidebarMenuButton
                                            render={<NavLink to={item.link} />}
                                            isActive={
                                                item.link === "/dashboard"
                                                    ? location.pathname === "/dashboard" || location.pathname === "/"
                                                    : location.pathname.startsWith(item.link)
                                            }
                                            tooltip={item.text}
                                            className="h-9"
                                        >
                                            <Icon />
                                            <span>{item.text}</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton className="text-sidebar-foreground/60">
                            <span className="flex size-6 items-center justify-center rounded-md border border-sidebar-border text-[10px] font-semibold">
                                i
                            </span>
                            <span>Inventory App</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}
