// src/layouts/MainLayout.tsx
import { Outlet } from "react-router-dom"
import { Navbar } from "./components/navigation/Navbar"
import { TopNav } from "./components/navigation/TopNav"
import { SidebarInset, SidebarProvider } from "./components/ui/sidebar"
import { GlobalErrorBanner } from "./components/GlobalErrorBanner"

export default function MainLayout() {
    return (
        <SidebarProvider defaultOpen className="h-svh min-h-0 overflow-hidden">
            <Navbar />
            <SidebarInset className="h-full min-h-0 overflow-hidden">
                <TopNav />
                <GlobalErrorBanner />
                <main className="flex min-h-0 flex-1 flex-col overflow-hidden" id="mainContent">
                    <Outlet />
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}