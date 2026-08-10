import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Factory,
  Settings,
  User,
  Fish,
  type LucideIcon
} from "lucide-react"

export type NavbarItem = {
  icon: LucideIcon     // Holds the Lucide icon component
  link: string         // Route path
  text: string         // Label text
}

export const navbarItems: NavbarItem[] = [
  {
    icon: LayoutDashboard,
    link: "/dashboard",
    text: "總覽",
  },
  {
    icon: ShoppingCart,
    link: "/orders",
    text: "訂單",
  },
  {
    icon: Boxes,
    link: "/inventory",
    text: "庫存",
  },
  {
    icon: Factory,
    link: "/manufacture",
    text: "製造",
  },
  {
    icon: Fish,
    link: "/products",
    text: "產品",
  },
  {
    icon: User,
    link: "/customers",
    text: "客戶",
  },
  {
    icon: Settings,
    link: "/settings",
    text: "設定",
  },
]