import api from "../../../lib/api";

import type {
  AuthUser,
  LoginRequest,
  LoginResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  TemporaryPasswordChangeRequest,
  PasswordChangeResponse,
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

  async forgotPassword(
    payload: ForgotPasswordRequest
  ): Promise<ForgotPasswordResponse> {
    const response = await api.post<ForgotPasswordResponse>(
      "/auth/password/forgot",
      payload
    );

    return response.data;
  },

  async resetPassword(
    payload: ResetPasswordRequest
  ): Promise<ResetPasswordResponse> {
    const response = await api.post<ResetPasswordResponse>(
      "/auth/password/reset",
      payload
    );

    return response.data;
  },

  async changeTemporaryPassword(
    payload: TemporaryPasswordChangeRequest
  ): Promise<PasswordChangeResponse> {
    const response = await api.post<PasswordChangeResponse>(
      "/auth/change-temporary-password",
      payload
    );

    return response.data;
  },
};

export default authService;