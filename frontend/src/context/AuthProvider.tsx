import React, { useState } from "react";
import { AuthContext } from "./AuthContext";
import type { AuthContextType } from "../models/authContexType";

const STORAGE_KEY = 'auth_token';
const USERNAME_STORAGE_KEY = 'auth_username';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY);
  });

  const [username, setUsername] = useState<string>(() => {
    return localStorage.getItem(USERNAME_STORAGE_KEY) ?? "";
  });


  const loginToken = (t: string, uname: string) => {
    setToken(t);
    setUsername(uname);
    localStorage.setItem(STORAGE_KEY, t);
    localStorage.setItem(USERNAME_STORAGE_KEY, uname);
  };

  const logoutToken = () => {
    setToken(null);
    setUsername('');
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USERNAME_STORAGE_KEY);
  };

  const checkAuth = () => !!token;

  const contextValue: AuthContextType = {
    username,
    token,
    loginToken,
    logoutToken,
    isAuthenticated: !!token,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
