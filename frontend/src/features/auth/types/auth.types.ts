
export type UserRole = "SALES" | "MANAGER" | "ADMIN";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  password_change_required?: boolean;
}

export interface AuthUser {
  id: string;
  full_name: string;
  nickname: string;
  email: string;
  role: UserRole;
  is_active: boolean;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface ResetPasswordResponse {
  message: string;
}
