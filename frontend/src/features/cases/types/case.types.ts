
export type CaseStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "IN_REVIEW"
  | "COMPLETED";

export interface CaseListItem {
  id: string;
  case_number: string;
  status_id: string;
  status_code: CaseStatus;
  assigned_to_id: string | null;
  assigned_to: CaseAssignee | null;
  created_by_id: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface CaseListResponse {
  items: CaseListItem[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface CaseStatusUpdate {
  status_code: CaseStatus;
}

export interface CaseAssignmentUpdate {
  assigned_to_id: string | null;
}

export interface DocumentRead {
  id: string;
  case_id: string;
  original_filename: string;
  content_type: string;
  file_size: number;
  uploaded_by_id: string;
  uploaded_at: string;
}

export interface PDFUploadItemResult {
  filename: string;
  case_number: string | null;
  success: boolean;
  message: string;
}

export interface PDFUploadResponse {
  results: PDFUploadItemResult[];
  total: number;
  succeeded: number;
  failed: number;
}

export interface CaseFilters {
  page: number;
  page_size: number;
  status_code?: CaseStatus;
  case_number?: string;
}


export type UserRole = "SALES" | "MANAGER" | "ADMIN";

export interface CaseAssignee {
  id: string;
  full_name: string;
  nickname: string;
  role: UserRole;
}

export interface Assignee {
  id: string;
  full_name: string;
  nickname: string;
  email: string;
  role: UserRole;
}