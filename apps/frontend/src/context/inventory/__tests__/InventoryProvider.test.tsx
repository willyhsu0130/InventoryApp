import { useContext } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { InventoryContext } from "../InventoryContext";
import { InventoryProvider } from "../InventoryProvider";
import { inventoryService } from "@/services/inventoryMovementService";
import { useError } from "@/hooks/useError";
import type {
    KatanaInventoryItem,
    KatanaBatch,
    KatanaStockAdjustment,
    KatanaCreateBatchInput,
    KatanaUpdateBatchInput,
    KatanaStockAdjustmentInput,
} from "@my-inventory-app/shared";

// Mock inventoryService and useError
vi.mock("@/services/inventoryService", () => ({
    inventoryService: {
        getInventoryLevels: vi.fn(),
        getBatches: vi.fn(),
        getStockAdjustments: vi.fn(),
        createBatch: vi.fn(),
        updateBatch: vi.fn(),
        deleteBatch: vi.fn(),
        createStockAdjustment: vi.fn(),
        updateStockAdjustment: vi.fn(),
        deleteStockAdjustment: vi.fn(),
    },
}));

vi.mock("@/hooks/useError", () => ({
    useError: vi.fn(),
}));

const mockedInventoryService = vi.mocked(inventoryService);
const mockedUseError = vi.mocked(useError);

const mockInventoryItem: KatanaInventoryItem = {
    variant_id: 101,
    location_id: 1,
    reorder_point: 10,
    average_cost: 12.5,
    value_in_stock: 312.5,
    quantity_in_stock: 25,
    quantity_committed: 5,
    quantity_expected: 10,
    quantity_missing_or_excess: 15,
    quantity_potential: 3,
};

const mockBatch: KatanaBatch = {
    id: 501,
    batch_number: "BATCH-2026-001",
    variant_id: 101,
    location_id: 1,
    quantity_in_stock: 25,
    expiration_date: "2027-12-31",
    batch_created_date: "2026-01-01",
    batch_barcode: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
};

const mockStockAdjustment: KatanaStockAdjustment = {
    id: 301,
    location_id: 1,
    stock_adjustment_number: "SA-001",
    stock_adjustment_date: "2026-08-18",
    reason: "Monthly cycle count",
    additional_info: null,
    stock_adjustment_rows: [
        {
            id: 1,
            variant_id: 101,
            quantity: 5,
            cost_per_unit: 12.5,
        },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
};

const useTestInventoryContext = () => {
    const context = useContext(InventoryContext);
    if (!context) {
        throw new Error("InventoryContext must be used within InventoryProvider");
    }
    return context;
};

describe("InventoryProvider", () => {
    const setErrorMessageMock = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        mockedUseError.mockReturnValue({
            errorMessage: "",
            warningMessage: "",
            setErrorMessage: setErrorMessageMock,
            setWarningMessage: vi.fn(),
            clearError: vi.fn(),
            clearWarning: vi.fn(),
            clearAll: vi.fn(),
        });

        mockedInventoryService.getInventoryLevels.mockResolvedValue([mockInventoryItem]);
        mockedInventoryService.getBatches.mockResolvedValue([mockBatch]);
        mockedInventoryService.getStockAdjustments.mockResolvedValue([mockStockAdjustment]);
    });

    it("fetches inventory levels, batches, and adjustments on mount and clears loading", async () => {
        const { result } = renderHook(() => useTestInventoryContext(), {
            wrapper: InventoryProvider,
        });

        expect(result.current.loading).toBe(true);

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(mockedInventoryService.getInventoryLevels).toHaveBeenCalledTimes(1);
        expect(mockedInventoryService.getBatches).toHaveBeenCalledTimes(1);
        expect(mockedInventoryService.getStockAdjustments).toHaveBeenCalledTimes(1);

        expect(result.current.inventoryItems.get(101)).toEqual(mockInventoryItem);
        expect(result.current.batches.get(501)).toEqual(mockBatch);
        expect(result.current.stockAdjustments.get(301)).toEqual(mockStockAdjustment);
    });

    it("surfaces error to useError when initial mount fetch fails", async () => {
        mockedInventoryService.getInventoryLevels.mockRejectedValue(new Error("Database offline"));

        const { result } = renderHook(() => useTestInventoryContext(), {
            wrapper: InventoryProvider,
        });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(setErrorMessageMock).toHaveBeenCalledWith("Database offline");
    });

    it("createBatch adds a new batch to state and returns the created batch", async () => {
        const newBatch: KatanaBatch = {
            ...mockBatch,
            id: 502,
            batch_number: "BATCH-2026-002",
        };
        mockedInventoryService.createBatch.mockResolvedValue(newBatch);

        const { result } = renderHook(() => useTestInventoryContext(), {
            wrapper: InventoryProvider,
        });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        const input: KatanaCreateBatchInput = {
            batch_number: "BATCH-2026-002",
            variant_id: 101,
        };

        let created: KatanaBatch | undefined;
        await act(async () => {
            created = await result.current.createBatch(input);
        });

        expect(mockedInventoryService.createBatch).toHaveBeenCalledWith(input);
        expect(created).toEqual(newBatch);
        expect(result.current.batches.get(502)).toEqual(newBatch);
    });

    it("updateBatch modifies existing batch in state", async () => {
        const updatedBatch: KatanaBatch = {
            ...mockBatch,
            batch_number: "BATCH-2026-UPDATED",
        };
        mockedInventoryService.updateBatch.mockResolvedValue(updatedBatch);

        const { result } = renderHook(() => useTestInventoryContext(), {
            wrapper: InventoryProvider,
        });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        const input: KatanaUpdateBatchInput = {
            batch_number: "BATCH-2026-UPDATED",
        };

        let updated: KatanaBatch | undefined;
        await act(async () => {
            updated = await result.current.updateBatch(501, input);
        });

        expect(mockedInventoryService.updateBatch).toHaveBeenCalledWith(501, input);
        expect(updated).toEqual(updatedBatch);
        expect(result.current.batches.get(501)?.batch_number).toBe("BATCH-2026-UPDATED");
    });

    it("deleteBatch removes the batch from state", async () => {
        mockedInventoryService.deleteBatch.mockResolvedValue();

        const { result } = renderHook(() => useTestInventoryContext(), {
            wrapper: InventoryProvider,
        });

        await waitFor(() => {
            expect(result.current.batches.has(501)).toBe(true);
        });

        await act(async () => {
            await result.current.deleteBatch(501);
        });

        expect(mockedInventoryService.deleteBatch).toHaveBeenCalledWith(501);
        expect(result.current.batches.has(501)).toBe(false);
    });

    it("createStockAdjustment adds adjustment and triggers refetchInventory", async () => {
        const newAdjustment: KatanaStockAdjustment = {
            ...mockStockAdjustment,
            id: 302,
            stock_adjustment_number: "SA-002",
        };
        mockedInventoryService.createStockAdjustment.mockResolvedValue(newAdjustment);

        // Allow getStockAdjustments to return the new list when refetchInventory is triggered
        mockedInventoryService.getStockAdjustments
            .mockResolvedValueOnce([mockStockAdjustment]) // Initial mount
            .mockResolvedValue([mockStockAdjustment, newAdjustment]); // After create

        const { result } = renderHook(() => useTestInventoryContext(), {
            wrapper: InventoryProvider,
        });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // 1 call during initial mount
        expect(mockedInventoryService.getInventoryLevels).toHaveBeenCalledTimes(1);

        const input: KatanaStockAdjustmentInput = {
            location_id: 1,
            stock_adjustment_rows: [{ variant_id: 101, quantity: 2 }],
        };

        let created: KatanaStockAdjustment | undefined;
        await act(async () => {
            created = await result.current.createStockAdjustment(input);
        });

        expect(mockedInventoryService.createStockAdjustment).toHaveBeenCalledWith(input);
        expect(created).toEqual(newAdjustment);
        expect(result.current.stockAdjustments.get(302)).toEqual(newAdjustment);

        // Expect second fetch call after successful adjustment creation
        expect(mockedInventoryService.getInventoryLevels).toHaveBeenCalledTimes(2);
    });

    it("updateStockAdjustment updates the record in state", async () => {
        const updatedAdjustment: KatanaStockAdjustment = {
            ...mockStockAdjustment,
            reason: "Updated reason for discrepancy",
        };
        mockedInventoryService.updateStockAdjustment.mockResolvedValue(updatedAdjustment);

        const { result } = renderHook(() => useTestInventoryContext(), {
            wrapper: InventoryProvider,
        });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        await act(async () => {
            await result.current.updateStockAdjustment(301, { reason: "Updated reason for discrepancy" });
        });

        expect(mockedInventoryService.updateStockAdjustment).toHaveBeenCalledWith(301, {
            reason: "Updated reason for discrepancy",
        });
        expect(result.current.stockAdjustments.get(301)?.reason).toBe("Updated reason for discrepancy");
    });

    it("deleteStockAdjustment removes the adjustment from state", async () => {
        mockedInventoryService.deleteStockAdjustment.mockResolvedValue();

        const { result } = renderHook(() => useTestInventoryContext(), {
            wrapper: InventoryProvider,
        });

        await waitFor(() => {
            expect(result.current.stockAdjustments.has(301)).toBe(true);
        });

        await act(async () => {
            await result.current.deleteStockAdjustment(301);
        });

        expect(mockedInventoryService.deleteStockAdjustment).toHaveBeenCalledWith(301);
        expect(result.current.stockAdjustments.has(301)).toBe(false);
    });
});