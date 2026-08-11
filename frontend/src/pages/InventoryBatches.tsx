import { useMemo, useState } from "react";

import { DataTable, type Column } from "@/components/DataTable";
import { PageLayout } from "@/components/PageLayout";
import { CONTROL_INPUT, PLACEHOLDER_PANEL } from "@/lib/styles";
import { useInventoryCatalog, useProductCatalog } from "@/hooks/useContexts";
import type { KatanaBatch } from "@/models/katana/inventory";
import { InventorySectionNav } from "@/components/inventory/InventorySectionNav";
import { formatQuantity } from "@/lib/formatQuantity";
import { RefreshButton } from "@/components/RefreshButton";

export const InventoryBatches = () => {
    const { batch, loading, refetchInventory } = useInventoryCatalog();
    const { getVariantDetails } = useProductCatalog();
    const [searchTerm, setSearchTerm] = useState("");

    const batches = useMemo(() => Array.from(batch.values()), [batch]);
    const filteredBatches = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return batches;

        return batches.filter((item) => {
            const details = getVariantDetails(item.variant_id);
            return [
                item.batch_number,
                item.batch_barcode ?? "",
                details.product_name,
                details.variant_details ?? "",
                String(item.variant_id),
            ].some((value) => value.toLowerCase().includes(term));
        });
    }, [batches, getVariantDetails, searchTerm]);

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
            render: (item) => formatQuantity(item.quantity_in_stock),
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

    return (
        <PageLayout
            id="inventoryBatchesPage"
            title="庫存批次"
            subnav={<InventorySectionNav />}
            actions={
                <>
                    <RefreshButton label="重新整理批次" onClick={() => refetchInventory()} />
                    <input
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="搜尋批次、產品或條碼..."
                        className={`${CONTROL_INPUT} w-full sm:w-80`}
                    />
                </>
            }
        >
            {loading ? (
                <div className={PLACEHOLDER_PANEL}>載入批次中</div>
            ) : (
                <DataTable
                    data={filteredBatches}
                    columns={columns}
                    keyExtractor={(item) => item.id}
                    emptyMessage="目前沒有可用批次。"
                />
            )}
        </PageLayout>
    );
};
