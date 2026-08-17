import { createContext } from "react";
import type { AuthContextType } from "../../models/authContexType";

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
