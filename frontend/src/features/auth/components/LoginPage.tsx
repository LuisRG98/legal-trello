
import { Navigate } from "react-router-dom";
import LoginForm from "./LoginForm";
import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500">
          Verificando sesión...
        </p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <LoginForm />
    </main>
  );
}
