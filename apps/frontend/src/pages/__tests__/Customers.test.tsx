// src/pages/__tests__/Customers.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Customers } from "../Customers";
import * as customerService from "@/services/customerService";
import type { Customer } from "@my-inventory-app/shared";

vi.mock("@/services/customerService", () => ({
    getCustomers: vi.fn(),
    deleteCustomerById: vi.fn(),
}));

vi.mock("@/components/customers/CustomersTable", () => ({
    CustomersTable: ({
        items,
        onRowClick,
    }: {
        items: Customer[];
        onRowClick?: (id: number) => void;
    }) => (
        <div data-testid="mock-customers-table">
            {items.map((cust) => (
                <div
                    key={cust.id}
                    data-testid={`customer-row-${cust.id}`}
                    onClick={() => onRowClick?.(cust.id)}
                >
                    <span>{cust.firstName} {cust.lastName}</span>
                    <span>{cust.company}</span>
                </div>
            ))}
        </div>
    ),
}));

vi.mock("@/components/customers/EditCustomer", () => ({
    EditCustomer: () => <div data-testid="mock-edit-customer">編輯客戶內容</div>,
}));

describe("<Customers /> Page", () => {
    const mockCustomers: Customer[] = [
        {
            id: 1,
            firstName: "偉立",
            lastName: "許",
            company: "晁欣實業有限公司",
            email: "willy@example.com",
            phoneNumber: "0912345678",
            line1: "信義路四段100號",
            line2: null,
            city: "台北市",
            state: null,
            country: "Taiwan",
        },
        {
            id: 2,
            firstName: "John",
            lastName: "Doe",
            company: "Acme Corp",
            email: "john@acme.com",
            phoneNumber: "0987654321",
            line1: "Main St",
            line2: null,
            city: "Toronto",
            state: "ON",
            country: "Canada",
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(customerService.getCustomers).mockResolvedValue(mockCustomers);
        vi.mocked(customerService.deleteCustomerById).mockResolvedValue(undefined);
    });

    it("renders loading state initially and hydrates customer list", async () => {
        render(<Customers />);
        expect(screen.getByText(/準備畫面中/i)).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByTestId("customer-row-1")).toBeInTheDocument();
            expect(screen.getByText("偉立 許")).toBeInTheDocument();
            expect(screen.getByTestId("customer-row-2")).toBeInTheDocument();
            expect(screen.getByText("John Doe")).toBeInTheDocument();
        });
    });

    it("filters customer list based on search term", async () => {
        render(<Customers />);

        await waitFor(() => {
            expect(screen.getByTestId("customer-row-1")).toBeInTheDocument();
        });

        const searchInput = screen.getByPlaceholderText(/搜尋客戶/i);
        fireEvent.change(searchInput, { target: { value: "Acme" } });

        expect(screen.queryByTestId("customer-row-1")).not.toBeInTheDocument();
        expect(screen.getByTestId("customer-row-2")).toBeInTheDocument();
    });

    it("opens customer creation modal when clicking '新增客戶'", async () => {
        render(<Customers />);

        await waitFor(() => {
            expect(screen.getByTestId("customer-row-1")).toBeInTheDocument();
        });

        const addBtn = screen.getByRole("button", { name: /新增客戶/i });
        fireEvent.click(addBtn);

        expect(screen.getByTestId("mock-edit-customer")).toBeInTheDocument();
    });

    it("deletes a customer when triggering delete action", async () => {
        render(<Customers />);

        await waitFor(() => {
            expect(screen.getByTestId("customer-row-1")).toBeInTheDocument();
        });

        // 1. Open edit modal
        fireEvent.click(screen.getByTestId("customer-row-1"));

        // 2. Open action dropdown menu in EditModal header
        const menuTrigger = document.querySelector('button[data-slot="dropdown-menu-trigger"]');
        expect(menuTrigger).toBeInTheDocument();
        fireEvent.click(menuTrigger!);

        // 3. Click the delete menu item
        const deleteItem = await screen.findByText("刪除");
        fireEvent.click(deleteItem);

        await waitFor(() => {
            expect(customerService.deleteCustomerById).toHaveBeenCalledWith(1);
            expect(customerService.getCustomers).toHaveBeenCalledTimes(2);
        });
    });
});