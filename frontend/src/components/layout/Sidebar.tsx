
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  ChartNoAxesCombined,
  BriefcaseBusiness,
  X,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";
import type { UserRole } from "../../features/auth/types/auth.types";

interface SidebarProps {
  role: UserRole;
  isOpen: boolean;
  onClose: () => void;
}

interface NavigationItem {
  label: string;
  path: string;
  icon: LucideIcon;
  allowedRoles: UserRole[];
}

const navigationItems: NavigationItem[] = [
  {
    label: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
    allowedRoles: ["SALES", "MANAGER", "ADMIN"],
  },
  {
    label: "Cases",
    path: "/cases",
    icon: FolderKanban,
    allowedRoles: ["SALES", "MANAGER", "ADMIN"],
  },
  {
    label: "Users",
    path: "/users",
    icon: Users,
    allowedRoles: ["ADMIN"],
  },
  {
    label: "Reports",
    path: "/reports",
    icon: ChartNoAxesCombined,
    allowedRoles: ["ADMIN"],
  },
];

export default function Sidebar({
  role,
  isOpen,
  onClose,
}: SidebarProps) {
  const visibleItems = navigationItems.filter((item) =>
    item.allowedRoles.includes(role)
  );

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-950 text-white transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-600 p-2">
              <BriefcaseBusiness size={20} />
            </div>

            <span className="font-semibold tracking-tight">
              Case Management
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="rounded-md p-2 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-6">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Workspace
          </p>

          {visibleItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <Icon size={19} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <p className="text-xs text-slate-500">
            Case Management Platform
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Internal workspace
          </p>
        </div>
      </aside>
    </>
  );
}
