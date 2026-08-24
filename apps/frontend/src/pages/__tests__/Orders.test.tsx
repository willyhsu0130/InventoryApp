// src/pages/__tests__/Orders.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Orders } from "../Orders";
import * as salesOrderService from "@/services/salesOrderService";
import * as customerService from "@/services/customerService";
import * as locationService from "@/services/locationService";
import * as variantService from "@/services/variantService";
import * as productService from "@/services/productService";
import type { Customer, Location, Product, SalesOrder, Variant } from "@my-inventory-app/shared";
import type { DisplaySalesOrderRow } from "@/components/orders/OrdersTable";

vi.mock("@/services/salesOrderService", () => ({
    getSalesOrdersByStatus: vi.fn(),
    getSalesOrderById: vi.fn(),
}));

vi.mock("@/services/customerService", () => ({
    getCustomers: vi.fn(),
}));

vi.mock("@/services/locationService", () => ({
    getLocations: vi.fn(),
}));

vi.mock("@/services/variantService", () => ({
    getActiveVariants: vi.fn(),
}));

vi.mock("@/services/productService", () => ({
    getActiveProducts: vi.fn(),
}));

vi.mock("@/components/orders/OrdersTable", () => ({
    OrdersTable: ({
        items,
        onRowClick,
    }: {
        items: DisplaySalesOrderRow[];
        onRowClick?: (id: number) => void;
    }) => (
        <div data-testid="mock-orders-table">
            {items.map((order) => (
                <div
                    key={order.id}
                    data-testid={`order-row-${order.id}`}
                    onClick={() => onRowClick?.(order.id)}
                >
                    <span>SO-{order.id}</span>
                    <span>{order.customerName}</span>
                    <span>{order.status}</span>
                </div>
            ))}
        </div>
    ),
}));

vi.mock("@/components/orders/EditOrder", () => ({
    EditOrder: () => <div data-testid="mock-edit-order">訂單表單</div>,
}));

describe("<Orders /> Page", () => {
    const mockCustomers: Customer[] = [
        {
            id: 10,
            firstName: "偉立",
            lastName: "許",
            company: "晁欣實業",
            email: "willy@example.com",
            phoneNumber: "0912345678",
            line1: "信義路四段100號",
            line2: null,
            city: "台北市",
            state: null,
            country: "Taiwan",
        },
    ];

    const mockLocations: Location[] = [
        {
            id: 1,
            name: "台北主倉庫",
            line1: "物流路一段",
            line2: null,
            city: "台北市",
            state: null,
            country: "Taiwan",
        },
    ];

    const mockProducts: Product[] = [
        {
            id: 5,
            name: "特級米酒",
            uom: "bottle",
            batchTracked: false,
            configs: [],
            isArchived: false
        },
    ];

    const mockVariants: Variant[] = [
        {
            id: 50,
            productId: 5,
            sku: "WINE-01",
            salesPrice: 60,
            configs: [],
            isArchived: false
        },

    ];

    const mockPendingOrders: SalesOrder[] = [
        {
            id: 1001,
            customerId: 10,
            locationId: 1,
            salesOrderStatus: "PENDING",
            createdAt: "2026-02-01T10:00:00Z",
            updatedAt: "2026-02-01T10:00:00Z",
            salesOrderItems: [
                {
                    id: 1,
                    salesOrderId: 1001,
                    variantId: 50,
                    batchId: null,
                    quantity: 5,
                    pricePerUnit: 60,
                },
            ],
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(customerService.getCustomers).mockResolvedValue(mockCustomers);
        vi.mocked(locationService.getLocations).mockResolvedValue(mockLocations);
        vi.mocked(productService.getActiveProducts).mockResolvedValue(mockProducts);
        vi.mocked(variantService.getActiveVariants).mockResolvedValue(mockVariants);
        vi.mocked(salesOrderService.getSalesOrdersByStatus).mockImplementation(async (status) =>
            status === "PENDING" ? mockPendingOrders : []
        );
    });

    it("renders loading state initially and hydrates orders catalog", async () => {
        render(<Orders />);
        expect(screen.getByText(/準備畫面中/i)).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByTestId("order-row-1001")).toBeInTheDocument();
            expect(screen.getByText("SO-1001")).toBeInTheDocument();
            expect(screen.getByText("偉立 許")).toBeInTheDocument();
        });
    });

    it("filters orders by customer name or product item info", async () => {
        render(<Orders />);

        await waitFor(() => {
            expect(screen.getByTestId("order-row-1001")).toBeInTheDocument();
        });

        const searchInput = screen.getByPlaceholderText(/搜尋訂單編號/i);
        fireEvent.change(searchInput, { target: { value: "特級米酒" } });
        expect(screen.getByTestId("order-row-1001")).toBeInTheDocument();

        fireEvent.change(searchInput, { target: { value: "NonExistentItem" } });
        expect(screen.queryByTestId("order-row-1001")).not.toBeInTheDocument();
    });

    it("opens order modal when clicking '新增訂單'", async () => {
        render(<Orders />);

        await waitFor(() => {
            expect(screen.getByTestId("order-row-1001")).toBeInTheDocument();
        });

        const addBtn = screen.getByRole("button", { name: /新增訂單/i });
        fireEvent.click(addBtn);

        expect(screen.getByTestId("mock-edit-order")).toBeInTheDocument();
    });
});