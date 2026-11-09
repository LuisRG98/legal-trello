
export type UserRole = "SALES" | "MANAGER" | "ADMIN";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface AuthUser {
  id: string;
  full_name: string;
  nickname: string;
  email: string;
  role: UserRole;
  is_active: boolean;
}
