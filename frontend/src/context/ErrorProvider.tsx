import type { ReactNode } from "react";
import { useState } from "react";
import { ErrorContext } from "./ErrorContext";

export const ErrorProvider = ({ children }: { children: ReactNode }) => {

    const [errorMessage, setErrorMessage] = useState<string>("");
    const [warningMessage, setWarningMessage] = useState<string>("")

    const clearErrorMessages = () => {
        setErrorMessage("");
        setWarningMessage("");
    }
    const value = {
        errorMessage,
        setErrorMessage,
        warningMessage,
        setWarningMessage,
        clearErrorMessages
    }
    return (
        <ErrorContext.Provider value={value}>
            {children}
        </ErrorContext.Provider>
    );
}