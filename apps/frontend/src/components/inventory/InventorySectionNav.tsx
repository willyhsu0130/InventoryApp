import { NavLink } from "react-router-dom";

const links = [
    { to: "/inventory", label: "庫存" },
    { to: "/inventory/batches", label: "批次" },
];

export const InventorySectionNav = () => (
    <nav className="flex shrink-0 gap-1 border-b text-sm" aria-label="庫存區段">
        {links.map((link) => (
            <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/inventory"}
                className={({ isActive }) =>
                    `border-b-2 px-3 pb-2 font-medium transition-colors ${
                        isActive
                            ? "border-primary text-foreground"
                            : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                    }`
                }
            >
                {link.label}
            </NavLink>
        ))}
    </nav>
);
