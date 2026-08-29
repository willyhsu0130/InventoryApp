import { useContext } from "react";
import { AuthContext } from "@/context/auth/AuthContext";

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error(
            "useAuthCatalog must be used within a AuthProvider"
        );
    }
    return context;
};
