// src/pages/InventoryBatches.tsx
import { useMemo, useState, useCallback } from "react";
import { DataTable, type Column } from "@/components/DataTable";
import { PageLayout } from "@/components/PageLayout";
import { CONTROL_INPUT, PLACEHOLDER_PANEL } from "@/lib/styles";
import {
    useInventoryCatalog,
    useProductCatalog,
    useVariant,
} from "@/hooks/useContexts";
import type { KatanaBatch } from "@my-inventory-app/shared";
import { InventorySectionNav } from "@/components/inventory/InventorySectionNav";
import { formatQuantity } from "@/lib/formatQuantity";
import { RefreshButton } from "@/components/RefreshButton";

export const InventoryBatches = () => {
    const { batches, loading: inventoryLoading, refetchInventory } = useInventoryCatalog();
    const { products, loading: productsLoading } = useProductCatalog();
    const { variants, loading: variantsLoading } = useVariant();

    const [searchTerm, setSearchTerm] = useState("");

    const getVariantDetails = useCallback(
        (variantId: number) => {
            const variant = variants.get(variantId);
            const product = variant ? products.get(variant.product_id) : undefined;
            const detailsString = variant?.config_attributes
                ?.map((attr) => attr.config_value)
                .filter(Boolean)
                .join(" / ");

            return {
                product_name: product?.name ?? `Variant #${variantId}`,
                variant_details: detailsString || undefined,
                sku: variant?.sku || "N/A",
                uom: product?.uom || "",
            };
        },
        [products, variants]
    );

    const batchList = useMemo<KatanaBatch[]>(() => {
        return Array.from(batches.values());
    }, [batches]);

    const filteredBatches = useMemo<KatanaBatch[]>(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return batchList;

        return batchList.filter((item) => {
            const details = getVariantDetails(item.variant_id);
            return [
                item.batch_number,
                item.batch_barcode ?? "",
                details.product_name,
                details.variant_details ?? "",
                String(item.variant_id),
            ].some((value) => value.toLowerCase().includes(term));
        });
    }, [batchList, getVariantDetails, searchTerm]);

    const columns: Column<KatanaBatch>[] = [
        {
            header: "批次號碼",
            render: (item) => <span className="font-medium">{item.batch_number}</span>,
        },
        {
            header: "產品 / 變體",
            render: (item) => {
                const details = getVariantDetails(item.variant_id);
                return details.variant_details
                    ? `${details.product_name} - ${details.variant_details}`
                    : details.product_name;
            },
        },
        {
            header: "庫存數量",
            align: "right",
            render: (item) => {
                const details = getVariantDetails(item.variant_id);
                return (
                    <span>
                        {formatQuantity(item.quantity_in_stock)}{" "}
                        {details.uom && (
                            <span className="text-muted-foreground font-normal text-[10px]">
                                {details.uom}
                            </span>
                        )}
                    </span>
                );
            },
        },
        {
            header: "建立日期",
            render: (item) => item.batch_created_date?.slice(0, 10) ?? "-",
        },
        {
            header: "有效期限",
            render: (item) => item.expiration_date?.slice(0, 10) ?? "-",
        },
        {
            header: "條碼",
            render: (item) => item.batch_barcode ?? "-",
        },
    ];

    const isGlobalLoading = inventoryLoading || productsLoading || variantsLoading;

    return (
        <PageLayout
            id="inventoryBatchesPage"
            title="庫存批次"
            subnav={<InventorySectionNav />}
            actions={
                <>
                    <RefreshButton label="重新整理批次" onClick={() => refetchInventory()} />
                    <div className="w-full sm:w-80">
                        <input
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="搜尋批次、產品或條碼..."
                            className={`${CONTROL_INPUT} w-full sm:w-80`}
                        />
                    </div>
                </>
            }
        >
            {isGlobalLoading ? (
                <div className={PLACEHOLDER_PANEL}>載入批次中</div>
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