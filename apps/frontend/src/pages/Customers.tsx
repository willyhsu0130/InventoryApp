// src/pages/Customers.tsx
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Plus, UserPlus, SearchX } from "lucide-react";
import { PageLayout } from "../components/PageLayout";
import { CustomersTable } from "@/components/customers/CustomersTable";
import {
    CONTROL_INPUT,
    ERROR_PANEL,
    PRIMARY_BUTTON,
} from "../lib/styles";
import { EditModal } from "@/components/EditModal";
import { EditCustomer, type EditCustomerHandle } from "@/components/customers/EditCustomer";
import type { Customer } from "@my-inventory-app/shared";
import { getCustomers, deleteCustomerById } from "@/services/customerService";
import { Button } from "@/components/ui/button";
import { RefreshButton } from "@/components/RefreshButton";

const UNSAVED_CUSTOMER_ID = -1;

type CustomerTarget = { customerId: number } | null;

export const Customers = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState<string>("");
    const [customerTarget, setCustomerTarget] = useState<CustomerTarget>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    const editCustomerRef = useRef<EditCustomerHandle>(null);

    const refreshCustomers = useCallback(async () => {
        setIsLoading(true);
        setErrorMessage(null);
        try {
            const data = await getCustomers();
            setCustomers(data);
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : "無法載入客戶清單。");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        getCustomers()
            .then((data) => {
                if (isMounted) {
                    setCustomers(data);
                    setIsLoading(false);
                }
            })
            .catch((err) => {
                if (isMounted) {
                    setErrorMessage(err instanceof Error ? err.message : "無法載入客戶清單。");
                    setIsLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, []);

    const handleDeleteCustomer = async () => {
        const customerId = customerTarget?.customerId;
        if (!customerId || customerId === UNSAVED_CUSTOMER_ID) return;

        try {
            await deleteCustomerById(customerId);
            setCustomerTarget(null);
            await refreshCustomers();
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : "刪除客戶失敗。");
        }
    };

    const handleCloseModal = async () => {
        if (isSaving) return;
        setCustomerTarget(null);
        await refreshCustomers();
    };

    const filteredItems = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return customers;

        return customers.filter((customer) => {
            const fullName = `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.toLowerCase();
            const firstNameMatch = customer.firstName?.toLowerCase().includes(term);
            const lastNameMatch = customer.lastName?.toLowerCase().includes(term);
            const companyMatch = customer.company?.toLowerCase().includes(term);
            const emailMatch = customer.email?.toLowerCase().includes(term);
            const phoneMatch = customer.phoneNumber?.toLowerCase().includes(term);
            const cityMatch = customer.city?.toLowerCase().includes(term);

            return (
                fullName.includes(term) ||
                firstNameMatch ||
                lastNameMatch ||
                Boolean(companyMatch) ||
                Boolean(emailMatch) ||
                Boolean(phoneMatch) ||
                Boolean(cityMatch)
            );
        });
    }, [customers, searchTerm]);

    return (
        <PageLayout
            id="customersPage"
            title="客戶管理"
            actions={
                <>
                    <Button
                        onClick={() => setCustomerTarget({ customerId: UNSAVED_CUSTOMER_ID })}
                        className={PRIMARY_BUTTON}
                    >
                        <Plus width="14" height="14" />
                        新增客戶
                    </Button>

                    <RefreshButton label="重新整理客戶" onClick={refreshCustomers} />

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
            <div className="flex-1 w-full min-h-0 flex flex-col">
                {isLoading ? (
                    <div className="flex-1 flex justify-center items-center text-muted-foreground">
                        <p className="animate-pulse font-medium text-sm">準備畫面中...</p>
                    </div>
                ) : errorMessage ? (
                    <div className={ERROR_PANEL}>
                        <p className="font-semibold">無法讀取客戶資料</p>
                        <p className="text-xs font-mono mt-1 text-red-300">{errorMessage}</p>
                    </div>
                ) : customers.length === 0 ? (
                    /* Full-Height Clean White/Background Empty State */
                    <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-border rounded-xl p-8 text-center bg-background">
                        <div className="p-4 bg-muted rounded-full mb-4 text-muted-foreground">
                            <UserPlus className="w-10 h-10 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">目前尚無任何客戶資料</h3>
                        <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">
                            建立您的第一位客戶資料以開始管理銷售訂單、聯絡地址與出貨資訊。
                        </p>
                        <Button
                            type="button"
                            size="lg"
                            onClick={() => setCustomerTarget({ customerId: UNSAVED_CUSTOMER_ID })}
                            className="mt-6 gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            新增客戶
                        </Button>
                    </div>
                ) : filteredItems.length === 0 ? (
                    /* Full-Height Clean White/Background Search Filter Empty State */
                    <div className="flex-1 flex flex-col items-center justify-center border border-border rounded-xl p-8 text-center bg-background">
                        <SearchX className="w-10 h-10 text-muted-foreground mb-3" />
                        <p className="text-base font-medium text-foreground">找不到符合「{searchTerm}」的客戶</p>
                        <Button
                            variant="link"
                            size="sm"
                            onClick={() => setSearchTerm("")}
                            className="mt-2 text-primary"
                        >
                            清除搜尋條件
                        </Button>
                    </div>
                ) : (
                    <CustomersTable
                        items={filteredItems}
                        onRowClick={(customerId) => setCustomerTarget({ customerId })}
                    />
                )}
            </div>

            <EditModal
                showSaveButton={true}
                title={customerTarget?.customerId !== UNSAVED_CUSTOMER_ID ? "編輯客戶" : "新增客戶"}
                isOpen={customerTarget !== null}
                onClose={handleCloseModal}
                isSaving={isSaving}
                onSave={() => editCustomerRef.current?.submit()}
                onDelete={
                    customerTarget && customerTarget.customerId !== UNSAVED_CUSTOMER_ID
                        ? handleDeleteCustomer
                        : undefined
                }
            >
                {customerTarget && (
                    <EditCustomer
                        onSavingChange={setIsSaving}
                        id={customerTarget.customerId}
                        ref={editCustomerRef}
                        onSuccess={async () => {
                            setCustomerTarget(null);
                            await refreshCustomers();
                        }}
                    />
                )}
            </EditModal>
        </PageLayout>
    );
};