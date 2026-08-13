// src/pages/Customers.tsx
import { useState, useMemo, useRef } from "react";
import { Plus } from "lucide-react";
import { PageLayout } from "../components/PageLayout";
import { CustomersTable } from "@/components/customers/CustomersTable";
import { useError } from "../hooks/useError";
import {
    CONTROL_INPUT,
    ERROR_PANEL,
    PLACEHOLDER_PANEL,
    PRIMARY_BUTTON,
} from "../lib/styles";
import { useCustomersCatalog } from "@/hooks/useContexts";
import { EditModal } from "@/components/EditModal";
import { EditCustomer, type EditCustomerHandle } from "@/components/customers/EditCustomer";
import type { KatanaCustomer } from "@/models/katana/customers";
import { Button } from "@/components/ui/button";
import { RefreshButton } from "@/components/RefreshButton";

/** null = closed, -1 = new customer creation, number = editing customer id */
type CustomerTarget = { customerId: number } | null;

export const Customers = () => {
    const { customers, loading, refetchCustomers, deleteCustomer } = useCustomersCatalog();

    const { errorMessage } = useError();
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [customerTarget, setCustomerTarget] = useState<CustomerTarget>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    const editCustomerRef = useRef<EditCustomerHandle>(null);

    const customersList = useMemo(() => {
        return Array.from(customers.values());
    }, [customers]);

    const handleDeleteCustomer = () => {
        const customerId = customerTarget?.customerId
        if (!customerId) return

        deleteCustomer(customerId)

        setCustomerTarget(null)
    }
    // Filter across Name, Company, Email, Phone, and Comment
    const filteredItems = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return customersList;

        return customersList.filter((customer) => {
            const nameMatch = customer.name?.toLowerCase().includes(term);
            const firstNameMatch = customer.first_name?.toLowerCase().includes(term);
            const lastNameMatch = customer.last_name?.toLowerCase().includes(term);
            const companyMatch = customer.company?.toLowerCase().includes(term);
            const emailMatch = customer.email?.toLowerCase().includes(term);
            const phoneMatch = customer.phone?.toLowerCase().includes(term);

            return (
                nameMatch ||
                firstNameMatch ||
                lastNameMatch ||
                companyMatch ||
                emailMatch ||
                phoneMatch
            );
        });
    }, [customersList, searchTerm]);

    return (
        <PageLayout
            id="customersPage"
            title="客戶管理"
            actions={
                <>
                    <Button
                        onClick={() => setCustomerTarget({ customerId: -1 })}
                        className={PRIMARY_BUTTON}
                    >
                        <Plus width="14" height="14" />
                        新增客戶
                    </Button>

                    <RefreshButton label="重新整理客戶" onClick={() => refetchCustomers()} />

                    <div className="w-full sm:w-80">
                        <input
                            type="text"
                            placeholder="搜尋客戶姓名, 公司, 信箱, 或電話..."
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
                    <p className="font-semibold">無法讀取客戶資料</p>
                    <p className="text-xs font-mono mt-1 text-red-300">{errorMessage}</p>
                </div>
            ) : (
                <CustomersTable
                    items={filteredItems}
                    onRowClick={(customerId: KatanaCustomer["id"]) => setCustomerTarget({ customerId })}
                />
            )}

            <EditModal
                showSaveButton={true}
                title={customerTarget?.customerId !== -1 ? "編輯客戶" : "新增客戶"}
                isOpen={customerTarget !== null}
                onClose={() => setCustomerTarget(null)}
                isSaving={isSaving}
                onSave={() => editCustomerRef.current?.submit()}
                onDelete={handleDeleteCustomer}
            >
                {customerTarget && (
                    <EditCustomer
                        onSavingChange={setIsSaving}
                        id={customerTarget.customerId}
                        ref={editCustomerRef}
                        onSuccess={() => setCustomerTarget(null)}
                    />
                )}
            </EditModal>
        </PageLayout >
    );
};