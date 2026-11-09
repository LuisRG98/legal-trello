
import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../features/auth/hooks/useAuth";
import type { UserRole } from "../features/auth/types/auth.types";

interface RequireRoleProps {
  allowedRoles: UserRole[];
}

export default function RequireRole({
  allowedRoles,
}: RequireRoleProps) {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
