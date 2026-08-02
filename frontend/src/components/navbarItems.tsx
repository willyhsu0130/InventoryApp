import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Factory,
  Settings,
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
    link: "/production",
    text: "製造",
  },
  {
    icon: Factory,
    link: "/products",
    text: "商品",
  },
  {
    icon: Settings,
    link: "/settings",
    text: "設定",
  },
]