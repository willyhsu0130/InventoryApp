import React, { useState, useEffect } from "react";
import { AuthContext } from "@/context/auth/AuthContext";
import type { AuthContextType } from "@/models/authContexType";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // 1. Fetch initial session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // 2. Subscribe to auth state updates (sign-in, sign-out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loginToken = async (email: string, pass: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    if (error) throw error;
  };

  const logoutToken = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const token = session?.access_token ?? null;
  const username = user?.user_metadata?.username ?? user?.email ?? "";

  const contextValue: AuthContextType = {
    username,
    token,
    loginToken,
    logoutToken,
    isAuthenticated: Boolean(session),
    checkAuth: () => Boolean(session),
  };

  // Optional: Prevent flash of unauthenticated layout during initial token read
  if (isLoading) {
    return null;
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};