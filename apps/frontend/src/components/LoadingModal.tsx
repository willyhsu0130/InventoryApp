import { Loader2 } from "lucide-react"

export const LoadingModal = () => {
    return (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm font-medium">載入產品資訊中...</p>
        </div>
    )
}