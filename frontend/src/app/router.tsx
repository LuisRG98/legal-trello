import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  Outlet,
} from "react-router-dom";

import { useAuth } from "../features/auth/hooks/useAuth";

import LoginPage from "../features/auth/components/LoginPage";
import DashboardPage from "../features/dashboard/DashboardPage";

import AppLayout from "../components/layout/AppLayout";
import RequireRole from "./RequireRole";
import ModulePlaceholder from "../components/shared/ModulePlaceholder";

import CasesPage from "../features/cases/pages/CasesPage";

import ForgotPasswordPage from "../features/auth/pages/ForgotPasswordPage";
import ResetPasswordPage from "../features/auth/pages/ResetPasswordPage";
import ChangeTemporaryPasswordPage from "../features/auth/pages/ChangeTemporaryPasswordPage";

import UsersPage from "../features/users/pages/UsersPage";

function RequireAuth() {
  const {
    isAuthenticated,
    isLoading,
    mustChangePassword,
  } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500">
          Verifying session...
        </p>
      </div>
    );
  }

  if (mustChangePassword) {
    return (
      <Navigate
        to="/change-temporary-password"
        replace
      />
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function RequirePasswordChange() {
  const {
    mustChangePassword,
    isLoading,
  } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500">
          Verifying session...
        </p>
      </div>
    );
  }

  if (!mustChangePassword) {
    return <Navigate to="/login" replace />;
  }

  return <ChangeTemporaryPasswordPage />;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/forgot-password"
          element={<ForgotPasswordPage />}
        />

        <Route
          path="/reset-password"
          element={<ResetPasswordPage />}
        />

        <Route
          path="/change-temporary-password"
          element={<RequirePasswordChange />}
        />

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />

            <Route path="cases" element={<CasesPage />} />

            <Route element={<RequireRole allowedRoles={["ADMIN"]} />}>
              <Route
                path="users"
                element={<UsersPage />}
              />

              <Route
                path="reports"
                element={
                  <ModulePlaceholder
                    title="Reports"
                    description="Review platform activity and case performance."
                  />
                }
              />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}