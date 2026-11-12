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

const ACCESS_TOKEN_KEY = "access_token";
const PASSWORD_CHANGE_KEY = "password_change_required";

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] =
    useState(false);

  // Restore the session when the application starts.
  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);

      if (!token) {
        if (active) {
          setIsLoading(false);
        }
        return;
      }

      const passwordChangeRequired =
        sessionStorage.getItem(PASSWORD_CHANGE_KEY) === "true";

      // A temporary token must never call /auth/me.
      if (passwordChangeRequired) {
        if (active) {
          setMustChangePassword(true);
          setUser(null);
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
        sessionStorage.removeItem(ACCESS_TOKEN_KEY);
        sessionStorage.removeItem(PASSWORD_CHANGE_KEY);

        if (active) {
          setUser(null);
          setMustChangePassword(false);
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
        ACCESS_TOKEN_KEY,
        tokenResponse.access_token
      );

      // Handle mandatory password changes separately.
      if (tokenResponse.password_change_required) {
        sessionStorage.setItem(PASSWORD_CHANGE_KEY, "true");

        setUser(null);
        setMustChangePassword(true);

        return;
      }

      sessionStorage.removeItem(PASSWORD_CHANGE_KEY);
      setMustChangePassword(false);

      try {
        const currentUser = await authService.getMe();

        setUser(currentUser);
      } catch (error) {
        sessionStorage.removeItem(ACCESS_TOKEN_KEY);
        setUser(null);

        throw error;
      }
    },
    []
  );

  const changeTemporaryPassword = useCallback(
    async (newPassword: string) => {
      await authService.changeTemporaryPassword({
        new_password: newPassword,
      });

      // The backend invalidates the temporary JWT after changing
      // the password. The user must sign in again.
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(PASSWORD_CHANGE_KEY);

      setUser(null);
      setMustChangePassword(false);
    },
    []
  );

  const logout = useCallback(() => {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(PASSWORD_CHANGE_KEY);

    setUser(null);
    setMustChangePassword(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        mustChangePassword,
        login,
        changeTemporaryPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}