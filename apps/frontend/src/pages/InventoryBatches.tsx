// src/pages/InventoryBatches.tsx
import { useMemo, useState, useEffect, useCallback } from "react";
import { DataTable, type Column } from "@/components/DataTable";
import { PageLayout } from "@/components/PageLayout";
import { CONTROL_INPUT, ERROR_PANEL, PLACEHOLDER_PANEL } from "@/lib/styles";
import type { Batch, Product } from "@my-inventory-app/shared";
import { getBatchesByVariantId } from "@/services/batchService";
import { getActiveProducts } from "@/services/productService";
import { getActiveVariants } from "@/services/variantService";
import { InventorySectionNav } from "@/components/inventory/InventorySectionNav";
import { formatQuantity } from "@/lib/formatQuantity";
import { RefreshButton } from "@/components/RefreshButton";

export interface DisplayBatchRow {
    id: number;
    batchNumber: string;
    variantId: number;
    productId: number;
    productName: string;
    displayName: string;
    sku: string;
    uom: string;
    quantity: number;
    createdAt: string;
    expiredAt: string;
}

async function loadBatchCatalog(): Promise<DisplayBatchRow[]> {
    // 1. Fetch active variants and products
    const [variants, products] = await Promise.all([
        getActiveVariants(),
        getActiveProducts(),
    ]);

    const productMap = new Map<number, Product>();
    products.forEach((p) => productMap.set(p.id, p));

    // 2. Fetch batches for each variant using existing getBatchesByVariantId
    const batchArrays = await Promise.all(
        variants.map((v) => getBatchesByVariantId(v.id).catch(() => []))
    );

    // 3. Flatten and attach metadata
    return variants.flatMap((variant, index): DisplayBatchRow[] => {
        const variantBatches = batchArrays[index] ?? [];
        const parentProduct = productMap.get(variant.productId);
        const parentName = parentProduct?.name ?? `款式 #${variant.id}`;
        const uom = parentProduct?.uom ?? "pcs";

        const configValues = (variant.configs ?? [])
            .map((c) => c.value)
            .filter((val): boolean => Boolean(val?.trim()));

        const displayName =
            configValues.length > 0
                ? `${parentName} - ${configValues.join(" / ")}`
                : parentName;

        return variantBatches.map((batch: Batch): DisplayBatchRow => ({
            id: batch.id,
            batchNumber: batch.batchNumber,
            variantId: batch.variantId,
            productId: variant.productId,
            productName: parentName,
            displayName,
            sku: variant.sku ?? "",
            uom,
            quantity: batch.quantity,
            createdAt: batch.createdAt,
            expiredAt: batch.expiredAt,
        }));
    });
}

export const InventoryBatches = () => {
    const [batches, setBatches] = useState<DisplayBatchRow[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>("");

    const refreshBatches = useCallback(async () => {
        setIsLoading(true);
        setErrorMessage(null);
        try {
            const data = await loadBatchCatalog();
            setBatches(data);
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : "無法載入批次資料。");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        loadBatchCatalog()
            .then((data) => {
                if (isMounted) {
                    setBatches(data);
                    setIsLoading(false);
                }
            })
            .catch((err) => {
                if (isMounted) {
                    setErrorMessage(err instanceof Error ? err.message : "無法載入批次資料。");
                    setIsLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, []);

    const filteredBatches = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return batches;

        return batches.filter((item) => {
            return [
                item.batchNumber,
                item.displayName,
                item.productName,
                item.sku,
                String(item.variantId),
            ].some((value) => value.toLowerCase().includes(term));
        });
    }, [batches, searchTerm]);

    const columns: Column<DisplayBatchRow>[] = [
        {
            header: "批次號碼",
            render: (item) => (
                <span className="font-mono font-medium text-foreground">
                    {item.batchNumber}
                </span>
            ),
        },
        {
            header: "產品 / 款式",
            render: (item) => (
                <div className="font-sans">
                    <span className="font-medium text-foreground">{item.displayName}</span>
                    {item.sku && (
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">
                            SKU: {item.sku}
                        </div>
                    )}
                </div>
            ),
        },
        {
            header: "現有庫存",
            align: "right",
            render: (item) => (
                <span className="font-mono font-bold text-foreground">
                    {formatQuantity(item.quantity)}{" "}
                    <span className="text-muted-foreground font-normal text-[10px]">
                        {item.uom}
                    </span>
                </span>
            ),
        },
        {
            header: "建立日期",
            render: (item) => (
                <span className="font-mono text-xs text-muted-foreground">
                    {item.createdAt ? item.createdAt.slice(0, 10) : "—"}
                </span>
            ),
        },
        {
            header: "有效期限",
            render: (item) => {
                const isExpired = new Date(item.expiredAt).getTime() <= Date.now();
                return (
                    <span
                        className={`font-mono text-xs ${isExpired ? "text-destructive font-semibold" : "text-muted-foreground"
                            }`}
                    >
                        {item.expiredAt ? item.expiredAt.slice(0, 10) : "—"}
                        {isExpired && " (已過期)"}
                    </span>
                );
            },
        },
    ];

    return (
        <PageLayout
            id="inventoryBatchesPage"
            title="庫存批次"
            subnav={<InventorySectionNav />}
            actions={
                <>
                    <RefreshButton label="重新整理批次" onClick={refreshBatches} />
                    <div className="w-full sm:w-80">
                        <input
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="搜尋批次、產品或 SKU..."
                            className={CONTROL_INPUT}
                        />
                    </div>
                </>
            }
        >
            {isLoading ? (
                <div className={PLACEHOLDER_PANEL}>載入批次中...</div>
            ) : errorMessage ? (
                <div className={ERROR_PANEL}>
                    <p className="font-semibold">無法讀取批次</p>
                    <p className="text-xs font-mono mt-1 text-red-300">{errorMessage}</p>
                </div>
            ) : (
                <DataTable
                    data={filteredBatches}
                    columns={columns}
                    keyExtractor={(item) => String(item.id)}
                    emptyMessage="目前沒有可用批次。"
                />
            )}
        </PageLayout>
    );
};