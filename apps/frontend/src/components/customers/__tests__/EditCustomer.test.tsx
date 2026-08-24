// src/components/customers/__tests__/EditCustomer.test.tsx
import { createRef } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { EditCustomer, type EditCustomerHandle } from "../EditCustomer";
import * as customerService from "@/services/customerService";
import type { Customer } from "@my-inventory-app/shared";

// Mock customer service functions
vi.mock("@/services/customerService", () => ({
    createCustomer: vi.fn(),
    updateCustomerById: vi.fn(),
    getCustomerById: vi.fn(),
}));

describe("<EditCustomer />", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("Create Mode (id = -1 or <= 0)", () => {
        it("submits new customer payload successfully via imperative ref handle", async () => {
            const onSuccess = vi.fn();
            const onSavingChange = vi.fn();
            const ref = createRef<EditCustomerHandle>();

            const mockCreatedCustomer: Customer = {
                id: 101,
                firstName: "偉立",
                lastName: "許",
                company: "晁欣實業有限公司",
                email: "willy@example.com",
                phoneNumber: "0912345678",
                line1: "信義路四段100號",
                line2: "5樓",
                city: "台北市大安區",
                state: null,
                country: "Taiwan",
            };

            vi.mocked(customerService.createCustomer).mockResolvedValue(mockCreatedCustomer);

            render(
                <EditCustomer
                    id={-1}
                    onSavingChange={onSavingChange}
                    onSuccess={onSuccess}
                    ref={ref}
                />
            );

            // Populate form inputs
            fireEvent.change(screen.getByPlaceholderText(/例: 偉立/i), {
                target: { value: "偉立" },
            });
            fireEvent.change(screen.getByPlaceholderText(/例: 許/i), {
                target: { value: "許" },
            });
            fireEvent.change(screen.getByPlaceholderText(/例: 晁欣實業有限公司/i), {
                target: { value: "晁欣實業有限公司" },
            });
            fireEvent.change(screen.getByPlaceholderText(/customer@example.com/i), {
                target: { value: "willy@example.com" },
            });
            fireEvent.change(screen.getByPlaceholderText(/0912345678/i), {
                target: { value: "0912345678" },
            });
            fireEvent.change(screen.getByPlaceholderText(/街道名稱、門牌號碼/i), {
                target: { value: "信義路四段100號" },
            });
            fireEvent.change(screen.getByPlaceholderText(/樓層、房號/i), {
                target: { value: "5樓" },
            });
            fireEvent.change(screen.getByPlaceholderText(/台北市大安區/i), {
                target: { value: "台北市大安區" },
            });

            await act(async () => {
                await ref.current?.submit();
            });

            await waitFor(() => {
                expect(customerService.createCustomer).toHaveBeenCalledWith({
                    firstName: "偉立",
                    lastName: "許",
                    company: "晁欣實業有限公司",
                    email: "willy@example.com",
                    phoneNumber: "0912345678",
                    line1: "信義路四段100號",
                    line2: "5樓",
                    city: "台北市大安區",
                    state: null,
                    country: "Taiwan",
                });
                expect(onSavingChange).toHaveBeenCalledWith(true);
                expect(onSavingChange).toHaveBeenCalledWith(false);
                expect(onSuccess).toHaveBeenCalledWith(101);
            });
        });

        it("validates that at least name or company must be provided before submission", async () => {
            const ref = createRef<EditCustomerHandle>();
            render(<EditCustomer id={-1} ref={ref} />);

            await act(async () => {
                await ref.current?.submit();
            });

            expect(
                screen.getByText(/請至少填寫客戶姓名或公司名稱/i)
            ).toBeInTheDocument();
            expect(customerService.createCustomer).not.toHaveBeenCalled();
        });

        it("renders error panel when createCustomer service throws", async () => {
            const ref = createRef<EditCustomerHandle>();
            vi.mocked(customerService.createCustomer).mockRejectedValue(
                new Error("Email already exists")
            );

            render(<EditCustomer id={-1} ref={ref} />);

            fireEvent.change(screen.getByPlaceholderText(/例: 偉立/i), {
                target: { value: "偉立" },
            });

            await act(async () => {
                await ref.current?.submit();
            });

            await waitFor(() => {
                expect(screen.getByText(/Email already exists/i)).toBeInTheDocument();
            });
        });
    });

    describe("Edit Mode (id > 0)", () => {
        const existingCustomer: Customer = {
            id: 42,
            firstName: "John",
            lastName: "Doe",
            company: "Tech Corp",
            email: "john@techcorp.com",
            phoneNumber: "0987654321",
            line1: "Sec 2, Dunhua S. Rd.",
            line2: "Suite 301",
            city: "Taipei",
            state: null,
            country: "Taiwan",
        };

        beforeEach(() => {
            vi.mocked(customerService.getCustomerById).mockResolvedValue(existingCustomer);
            vi.mocked(customerService.updateCustomerById).mockResolvedValue({
                ...existingCustomer,
                company: "Updated Tech Corp",
            });
        });

        it("renders loading state initially and populates inputs once customer data resolves", async () => {
            render(<EditCustomer id={42} />);

            // Loading state on initial mount
            expect(screen.getByText(/載入客戶資訊中/i)).toBeInTheDocument();

            // Form inputs hydrated after promise resolution
            await waitFor(() => {
                expect(screen.getByDisplayValue("John")).toBeInTheDocument();
                expect(screen.getByDisplayValue("Doe")).toBeInTheDocument();
                expect(screen.getByDisplayValue("Tech Corp")).toBeInTheDocument();
                expect(screen.getByDisplayValue("john@techcorp.com")).toBeInTheDocument();
                expect(screen.getByDisplayValue("0987654321")).toBeInTheDocument();
                expect(screen.getByDisplayValue("Sec 2, Dunhua S. Rd.")).toBeInTheDocument();
                expect(screen.getByDisplayValue("Suite 301")).toBeInTheDocument();
                expect(screen.getByDisplayValue("Taipei")).toBeInTheDocument();
            });
        });

        it("submits updated customer fields with updateCustomerById", async () => {
            const onSuccess = vi.fn();
            const ref = createRef<EditCustomerHandle>();

            render(<EditCustomer id={42} onSuccess={onSuccess} ref={ref} />);

            await waitFor(() => {
                expect(screen.getByDisplayValue("Tech Corp")).toBeInTheDocument();
            });

            // Modify company name
            const companyInput = screen.getByDisplayValue("Tech Corp");
            fireEvent.change(companyInput, { target: { value: "Updated Tech Corp" } });

            await act(async () => {
                await ref.current?.submit();
            });

            await waitFor(() => {
                expect(customerService.updateCustomerById).toHaveBeenCalledWith(42, {
                    firstName: "John",
                    lastName: "Doe",
                    company: "Updated Tech Corp",
                    email: "john@techcorp.com",
                    phoneNumber: "0987654321",
                    line1: "Sec 2, Dunhua S. Rd.",
                    line2: "Suite 301",
                    city: "Taipei",
                    state: null,
                    country: "Taiwan",
                });
                expect(onSuccess).toHaveBeenCalledWith(42);
            });
        });
    });
});