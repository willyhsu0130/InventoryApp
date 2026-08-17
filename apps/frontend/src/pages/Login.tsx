import { LoginForm } from "@/components/LoginForm"
import { useEffect } from "react"

export default function Login() {
    useEffect(() => {
        document.title = "登入 | 系統";
    }, [])

    return (
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm space-y-6">
                <div className="space-y-2 text-center">
                    <p className="text-sm text-muted-foreground">登入頁面</p>
                    <h1 className="text-3xl font-bold">晁欣漁產庫存管理系統</h1>
                </div>
                <LoginForm />
            </div>
        </div>
    )
}
