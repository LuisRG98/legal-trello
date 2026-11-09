
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import type { ReactNode } from "react";

import authService from "../services/authService";

import type {
  AuthUser,
  LoginRequest,
} from "../types/auth.types";

import { AuthContext } from "./auth-context";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore the authenticated session when the application loads.
  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      const token = sessionStorage.getItem("access_token");

      if (!token) {
        if (active) {
          setIsLoading(false);
        }

        return;
      }

      try {
        const currentUser = await authService.getMe();

        if (active) {
          setUser(currentUser);
        }
      } catch {
        sessionStorage.removeItem("access_token");

        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void restoreSession();

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(
    async (credentials: LoginRequest) => {
      const tokenResponse = await authService.login(credentials);

      sessionStorage.setItem(
        "access_token",
        tokenResponse.access_token,
      );

      try {
        const currentUser = await authService.getMe();

        setUser(currentUser);
      } catch (error) {
        sessionStorage.removeItem("access_token");
        setUser(null);

        throw error;
      }
    },
    [],
  );

  const logout = useCallback(() => {
    sessionStorage.removeItem("access_token");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
