// src/layouts/MainLayout.tsx
import { Outlet } from "react-router-dom"
import { Navbar } from "./components/navigation/Navbar"
import { TopNav } from "./components/navigation/TopNav"
import { useState } from "react"

export default function MainLayout() {
    const [navbarIsOpen, setNavbarIsOpen] = useState(true)

    return (
        <div className="flex flex-col w-screen h-screen overflow-hidden">
            {/* TopNav automatically takes its natural height */}
            <TopNav className="flex shrink-0" setNavbarIsOpen={setNavbarIsOpen} />

            {/* Changed h-full -> flex-1 min-h-0 to claim ONLY the remaining screen space */}
            <div className="flex-1 min-h-0 flex text-slate-100">
                {/* Persistent Navigation */}
                <Navbar open={navbarIsOpen} />

                {/* Main Content Area: Added min-h-0 and flex flex-col so Outlet height is bounded */}
                <main className="flex-1 min-h-0 flex flex-col" id="mainContent">
                    <Outlet /> {/* Active page route (Dashboard, Orders, Inventory) renders here */}
                </main>
            </div>
        </div>
    )
}