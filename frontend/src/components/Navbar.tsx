import { navbarItems } from "./navbarItems"

export const Navbar = ({ className, open }: {
    className?: string
    open: boolean
}) => {
    return (
        <aside className={`flex flex-col bg-black h-full transition-all duration-300 ${open ? "w-50" : "w-16"} ${className}`}>
            {navbarItems.map((item) => {
                // Destructure and capitalize as a React component
                const Icon = item.icon

                return (
                    <a
                        key={item.link}
                        href={item.link}
                        className="flex items-center gap-10 p-3 rounded-md hover:bg-slate-800 transition-colors"
                    >
                        <Icon className="w-7 h-7 text-slate-400 shrink-0 z-10" />
                        {
                            open &&
                            <span
                                className={`text-xl font-small transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden ${open
                                    ? "opacity-100 max-w-xs"
                                    : "opacity-0 max-w-0"
                                    }`}
                            >
                                {item.text}
                            </span>
                        }
                    </a>
                )
            })}
        </aside>
    )

}