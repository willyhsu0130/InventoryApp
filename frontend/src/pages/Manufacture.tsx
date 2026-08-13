// src/pages/Manufacture.tsx
import { useState, useMemo, useRef } from "react";
import { Plus } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { ManufactureTable } from "@/components/manufacture/ManufactureTable";
import { useError } from "@/hooks/useError";
import {
    CONTROL_INPUT,
    ERROR_PANEL,
    PLACEHOLDER_PANEL,
    PRIMARY_BUTTON,
} from "@/lib/styles";
import { useManufactureCatalog, useProductCatalog } from "@/hooks/useContexts";
import { EditModal } from "@/components/EditModal";
import {
    EditManufacture,
    type EditManufactureHandle,
} from "@/components/manufacture/EditManufacture";
import { Button } from "@/components/ui/button";
import { RefreshButton } from "@/components/RefreshButton";

/** null = closed, -1 = new MO draft, number = editing MO id */
type MOTarget = { moId: number } | null;

export const Manufacture = () => {
    const { manufactureOrders, loading, refetchManufactureOrders, deleteMO } =
        useManufactureCatalog();
    const { getVariantDetails } = useProductCatalog();

    const { errorMessage } = useError();
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [moTarget, setMOTarget] = useState<MOTarget>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    const editManufactureRef = useRef<EditManufactureHandle>(null);

    const moList = useMemo(() => {
        return Array.from(manufactureOrders.values());
    }, [manufactureOrders]);

    const handleDelete = async () => {
        if (!moTarget) return
        setIsSaving(true)
        await deleteMO(moTarget?.moId)
        setIsSaving(false)
        setMOTarget(null)
    }
    // Filter by search term (Order No, Product Name, Notes) and Status
    const filteredItems = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();

        return moList.filter((mo) => {
            // Status match
            if (statusFilter !== "ALL" && mo.status !== statusFilter) {
                return false;
            }

            if (!term) return true;

            const orderNoMatch = mo.order_no?.toLowerCase().includes(term);
            const notesMatch = mo.additional_info?.toLowerCase().includes(term);

            const details = getVariantDetails(mo.variant_id);
            const productNameMatch = details?.product_name.toLowerCase().includes(term);
            const variantDetailsMatch = details?.variant_details?.toLowerCase().includes(term);

            return orderNoMatch || notesMatch || productNameMatch || variantDetailsMatch;
        });
    }, [moList, searchTerm, statusFilter, getVariantDetails]);

    return (
        <PageLayout
            id="manufacturePage"
            title="製造管理"
            actions={
                <>
                    <Button
                        onClick={() => setMOTarget({ moId: -1 })}
                        className={PRIMARY_BUTTON}
                    >
                        <Plus width="14" height="14" />
                        新增工單
                    </Button>

                    <RefreshButton label="重新整理工單" onClick={() => refetchManufactureOrders()} />

                    {/* Status Filter */}
                    <select
                        className={CONTROL_INPUT}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="ALL">所有狀態</option>
                        <option value="NOT_STARTED">未開始 (NOT_STARTED)</option>
                        <option value="IN_PROGRESS">進行中 (IN_PROGRESS)</option>
                        <option value="BLOCKED">已阻塞 (BLOCKED)</option>
                        <option value="DONE">已完工 (DONE)</option>
                    </select>

                    {/* Search Input */}
                    <div className="w-full min-w-xl sm:w-72">
                        <input
                            type="text"
                            placeholder="搜尋工單編號, 商品名稱, 或備註..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={CONTROL_INPUT}
                        />
                    </div>
                </>
            }
        >
            {loading ? (
                <div className={PLACEHOLDER_PANEL}>準備畫面中</div>
            ) : errorMessage ? (
                <div className={ERROR_PANEL}>
                    <p className="font-semibold">無法讀取製造工單資料</p>
                    <p className="text-xs font-mono mt-1 text-red-300">{errorMessage}</p>
                </div>
            ) : (
                <ManufactureTable
                    items={filteredItems}
                    onRowClick={(moId) => setMOTarget({ moId })}
                />
            )}

            <EditModal
                showSaveButton={true}
                title={moTarget?.moId !== -1 ? "編輯製造工單" : "新增製造工單"}
                isOpen={moTarget !== null}
                onClose={() => setMOTarget(null)}
                isSaving={isSaving}
                onSave={() => editManufactureRef.current?.submit()}
                onDelete={handleDelete}
            >
                {moTarget && (
                    <EditManufacture
                        onSavingChange={setIsSaving}
                        id={moTarget.moId}
                        ref={editManufactureRef}
                        onSuccess={() => {
                            setMOTarget(null);
                        }}
                    />
                )}
            </EditModal>
        </PageLayout>
    );
};