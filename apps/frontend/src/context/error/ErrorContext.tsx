import { createContext } from "react";

export interface ErrorContextType {
    errorMessage: string;
    warningMessage: string;
    setErrorMessage: (msg: string) => void;
    setWarningMessage: (msg: string) => void;
    clearError: () => void;
    clearWarning: () => void;
    clearAll: () => void;
}

export const ErrorContext = createContext<ErrorContextType | null>(null);