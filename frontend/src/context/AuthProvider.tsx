import React, { useState, useEffect } from "react";
import { AuthContext } from "./AuthContext";
import type { AuthContextType } from "../models/authContexType";

const STORAGE_KEY = 'auth_token';
const USERNAME_STORAGE_KEY = 'auth_username';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');

  useEffect(() => {
    const storedToken = localStorage.getItem(STORAGE_KEY);
    const storedUsername = localStorage.getItem(USERNAME_STORAGE_KEY) ?? '';

    if (storedToken) {
      setToken(storedToken);
      setUsername(storedUsername);
    }
  }, []);

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
