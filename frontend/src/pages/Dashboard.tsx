import { useEffect, useState } from "react"
import { katanaFetch } from "../lib/katanaFetch"
import { KATANA_API_ROUTES } from "../lib/routes/routes"

export const Dashboard = () => {
    const [data, setData] = useState<unknown>(null)
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const testKatanaRoute = async () => {
            setLoading(true)

            // Test fetching inventory stock levels (or VARIANTS)
            const res = await katanaFetch(KATANA_API_ROUTES.INVENTORY)

            if (res.success) {
                console.log("Katana Connection Successful:", res.data)
                setData(res.data)
            } else {
                console.error("Katana Fetch Error:", res.message)
                setError(res.message)
            }

            setLoading(false)
        }

        testKatanaRoute()
    }, []) // Empty array ensures this runs once on mount

    return (
        <div className="p-6">
            <h2 className="text-xl font-bold text-slate-100 mb-4">Katana API Route Test</h2>

            {loading && <p className="text-slate-400">Connecting to Katana API...</p>}

            {error && (
                <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-md text-red-200">
                    <p className="font-semibold">Fetch Failed:</p>
                    <p className="text-sm font-mono mt-1">{error}</p>
                </div>
            )}

            {data !== null && (
                <div className="bg-slate-900 p-4 rounded-md border border-slate-800">
                    <p className="text-emerald-400 font-semibold mb-2">Connected Successfully!</p>
                    <pre className="text-xs font-mono text-slate-300 max-h-96 overflow-auto">
                        {JSON.stringify(data, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    )
}