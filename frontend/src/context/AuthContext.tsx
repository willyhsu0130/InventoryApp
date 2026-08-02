import { createContext } from "react";
import type { AuthContextType } from "../models/authContexTypet";

export const AuthContext = createContext<AuthContextType | undefined>(undefined);