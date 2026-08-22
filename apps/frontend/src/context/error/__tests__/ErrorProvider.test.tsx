import { useContext } from "react";
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ErrorContext } from "../ErrorContext";
import { ErrorProvider } from "../ErrorProvider";

const useTestError = () => {
    const ctx = useContext(ErrorContext);
    if (!ctx) {
        throw new Error("Missing ErrorProvider in test tree");
    }
    return ctx;
};

describe("ErrorProvider", () => {
    it("initializes with empty string messages", () => {
        const { result } = renderHook(() => useTestError(), {
            wrapper: ErrorProvider,
        });

        expect(result.current.errorMessage).toBe("");
        expect(result.current.warningMessage).toBe("");
    });

    it("sets and clears error message independently", () => {
        const { result } = renderHook(() => useTestError(), {
            wrapper: ErrorProvider,
        });

        act(() => {
            result.current.setErrorMessage("Supabase connection failed");
        });
        expect(result.current.errorMessage).toBe("Supabase connection failed");
        expect(result.current.warningMessage).toBe("");

        act(() => {
            result.current.clearError();
        });
        expect(result.current.errorMessage).toBe("");
    });

    it("sets and clears warning message independently", () => {
        const { result } = renderHook(() => useTestError(), {
            wrapper: ErrorProvider,
        });

        act(() => {
            result.current.setWarningMessage("Inventory stock is low");
        });
        expect(result.current.warningMessage).toBe("Inventory stock is low");
        expect(result.current.errorMessage).toBe("");

        act(() => {
            result.current.clearWarning();
        });
        expect(result.current.warningMessage).toBe("");
    });

    it("clearAll clears both error and warning messages simultaneously", () => {
        const { result } = renderHook(() => useTestError(), {
            wrapper: ErrorProvider,
        });

        act(() => {
            result.current.setErrorMessage("Fatal database timeout");
            result.current.setWarningMessage("Pending background sync");
        });

        expect(result.current.errorMessage).toBe("Fatal database timeout");
        expect(result.current.warningMessage).toBe("Pending background sync");

        act(() => {
            result.current.clearAll();
        });

        expect(result.current.errorMessage).toBe("");
        expect(result.current.warningMessage).toBe("");
    });
});