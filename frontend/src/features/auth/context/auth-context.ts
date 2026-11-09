
import { createContext } from "react";

import type { AuthUser, LoginRequest } from "../types/auth.types";

export interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<
  AuthContextType | undefined
>(undefined);
