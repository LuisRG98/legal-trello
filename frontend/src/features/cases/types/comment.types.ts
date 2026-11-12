export type UserRole = "SALES" | "MANAGER" | "ADMIN";

export interface CommentAuthor {
  id: string;
  full_name: string;
  nickname: string;
  role: UserRole;
}

export interface CaseComment {
  id: string;
  case_id: string;
  user_id: string;
  author: CommentAuthor;
  content: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommentCreate {
  content: string;
}

export interface CommentUpdate {
  content: string;
}

export interface CommentHistory {
  id: string;
  comment_id: string;
  user_id: string;
  author: CommentAuthor;
  version: number;
  action: "CREATED" | "UPDATED" | "DELETED";
  content: string;
  created_at: string;
}