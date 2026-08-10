import { createContext } from "react";
import type { KatanaCustomer, KatanaCustomerDraft } from "@/models/katana";

export interface CustomersContextType {
    customers: Map<number, KatanaCustomer>;
    loading: boolean;
    refetchCustomers: () => Promise<void>;
    createCustomer: (draft: KatanaCustomerDraft) => Promise<KatanaCustomer>;
    editCustomer: (id: number, draft: Partial<KatanaCustomerDraft>) => Promise<KatanaCustomer>;
    deleteCustomer: (id: number) => Promise<void>;
    getCustomerName: (id: number) => string;
}

export const CustomersContext = createContext<CustomersContextType | null>(null);