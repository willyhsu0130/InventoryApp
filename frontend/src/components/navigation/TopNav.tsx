import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

type TopNavProps = {
    className?: string
}

export function TopNav({ className }: TopNavProps) {
    return (
        <header className={`flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4 ${className ?? ""}`}>
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex min-w-0 flex-1 items-center">
                <p className="truncate text-sm font-semibold">晁欣漁產庫存管理系統</p>
            </div>
        </header>
    )
}
