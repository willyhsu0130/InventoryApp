// src/layouts/MainLayout.tsx
import { Outlet } from "react-router-dom"
import { Navbar } from "./components/Navbar"
import { TopNav } from "./components/TopNav"
import { useState } from "react"
export default function MainLayout() {
    const [navbarIsOpen, setNavbarIsOpen] = useState(true)
    return (
        <div className="flex flex-col w-screen h-screen">
            <TopNav className="flex" setNavbarIsOpen={setNavbarIsOpen} />
            <div className="flex text-slate-100 h-full" >
                {/* Persistent Navigation */}
                <Navbar open={navbarIsOpen} />

                {/* Main Content Area */}
                <main className="flex-1 p-6 overflow-y-auto">
                    <Outlet /> {/* Active page route (Dashboard, Orders, Inventory) renders here */}
                </main>
            </div>
        </div>

    )
}