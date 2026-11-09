
import api from "../../../lib/api";

import type {
  AuthUser,
  LoginRequest,
  LoginResponse,
} from "../types/auth.types";

const authService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>(
      "/auth/login",
      credentials
    );

    return response.data;
  },

  async getMe(): Promise<AuthUser> {
    const response = await api.get<AuthUser>("/auth/me");

    return response.data;
  },
};

export default authService;
