import { Menu } from "lucide-react"

type TopNavProps = {
    className?: string
    setNavbarIsOpen: React.Dispatch<React.SetStateAction<boolean>>
}

export const TopNav = ({ className = "", setNavbarIsOpen }: TopNavProps) => {
    return (
        <div className={`border-b border-slate-800 bg-slate-900 ${className}`}>
            <div className="flex gap-10 items-center py-4 px-3">
                <button
                    type="button"
                    onClick={() => setNavbarIsOpen((prev) => !prev)}
                    className="p-1 rounded-md hover:bg-slate-800 transition-colors text-slate-300 hover:text-white z-10"
                    aria-label="Toggle navigation menu"
                >
                    <Menu className="w-6 h-6" />
                </button>

                <p className="text-2xl font-semibold text-slate-100">
                    晁欣漁產庫存管理
                </p>
            </div>
        </div>
    )
}