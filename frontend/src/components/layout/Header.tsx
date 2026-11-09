
import {
  Menu,
  LogOut,
  UserRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../features/auth/hooks/useAuth";

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  if (!user) {
    return null;
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <Menu size={21} />
        </button>

        <div>
          <p className="text-sm font-semibold text-slate-800">
            Workspace
          </p>
          <p className="hidden text-xs text-slate-500 sm:block">
            Case Management Platform
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-5">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-slate-800">
            {user.full_name}
          </p>
          <p className="text-xs text-slate-500">
            {user.role}
          </p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700">
          <UserRound size={19} />
        </div>

        <button
          type="button"
          onClick={handleLogout}
          title="Sign out"
          aria-label="Sign out"
          className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={19} />
        </button>
      </div>
    </header>
  );
}
