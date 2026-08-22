import { useState, useCallback, useMemo, type ReactNode, type FC } from "react";
import { ErrorContext, type ErrorContextType } from "./ErrorContext";

export const ErrorProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [warningMessage, setWarningMessage] = useState<string>("");

    const clearError = useCallback(() => {
        setErrorMessage("");
    }, []);

    const clearWarning = useCallback(() => {
        setWarningMessage("");
    }, []);

    const clearAll = useCallback(() => {
        setErrorMessage("");
        setWarningMessage("");
    }, []);

    const value = useMemo<ErrorContextType>(
        () => ({
            errorMessage,
            warningMessage,
            setErrorMessage,
            setWarningMessage,
            clearError,
            clearWarning,
            clearAll,
        }),
        [errorMessage, warningMessage, clearError, clearWarning, clearAll]
    );

    return (
        <ErrorContext.Provider value={value}>
            {children}
        </ErrorContext.Provider>
    );
};