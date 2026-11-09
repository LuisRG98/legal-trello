export type UserRole = "SALES" | "MANAGER" | "ADMIN";

export interface Assignee {
  id: string;
  full_name: string;
  nickname: string;
  email: string;
  role: UserRole;
}