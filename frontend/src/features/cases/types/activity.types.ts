
export interface ActivityActor {
  id: string;
  full_name: string;
  nickname: string;
  email: string;
  role: "SALES" | "MANAGER" | "ADMIN" | string;
}

export interface CaseActivity {
  id: string;
  case_id: string;
  actor_id: string;
  actor: ActivityActor;
  action: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
}

export interface CaseActivityListResponse {
  items: CaseActivity[];
  total: number;
  skip: number;
  limit: number;
}
