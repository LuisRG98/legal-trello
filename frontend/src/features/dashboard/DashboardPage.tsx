
import type { LucideIcon } from "lucide-react";

import {
  FolderKanban,
  Users,
  ChartNoAxesCombined,
  ArrowRight,
} from "lucide-react";

import { Link } from "react-router-dom";
import { useAuth } from "../auth/hooks/useAuth";

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const firstName = user.full_name.split(" ")[0];

  return (
    <section className="space-y-8">
      {/* Page heading */}
      <div>
        <p className="text-sm font-medium text-blue-600">
          Overview
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          Welcome back, {firstName}!
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Here is your workspace for managing cases and daily activities.
        </p>
      </div>

      {/* Welcome card */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 p-6 text-white shadow-sm sm:p-8">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-blue-100">
            CASE MANAGEMENT PLATFORM
          </p>

          <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
            Manage your work in one place.
          </h2>

          <p className="mt-3 text-sm leading-6 text-blue-100">
            Access your cases, follow their progress and collaborate
            with your team.
          </p>

          <Link
            to="/cases"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
          >
            Go to cases
            <ArrowRight size={17} />
          </Link>
        </div>
      </div>

      {/* Workspace information */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Your workspace
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Available sections based on your account permissions.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <WorkspaceCard
            title="Case management"
            description="Access and track your cases."
            icon={FolderKanban}
            href="/cases"
          />

          {user.role === "ADMIN" && (
            <>
              <WorkspaceCard
                title="User management"
                description="Manage users and platform permissions."
                icon={Users}
                href="/users"
              />

              <WorkspaceCard
                title="Reports"
                description="Review platform activity and performance."
                icon={ChartNoAxesCombined}
                href="/reports"
              />
            </>
          )}
        </div>
      </div>

      {/* Account information */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">
          Account information
        </h2>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem label="Full name" value={user.full_name} />
          <InfoItem label="Email" value={user.email} />
          <InfoItem label="Role" value={user.role} />
        </div>
      </div>
    </section>
  );
}


interface WorkspaceCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
}

function WorkspaceCard({
  title,
  description,
  icon: Icon,
  href,
}: WorkspaceCardProps) {
  return (
    <Link
      to={href}
      className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <div className="rounded-lg bg-blue-50 p-3 text-blue-700">
          <Icon size={22} />
        </div>

        <ArrowRight
          size={18}
          className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-600"
        />
      </div>

      <h3 className="mt-5 font-semibold text-slate-900">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-5 text-slate-500">
        {description}
      </p>
    </Link>
  );
}

interface InfoItemProps {
  label: string;
  value: string;
}

function InfoItem({ label, value }: InfoItemProps) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-medium text-slate-800">
        {value}
      </p>
    </div>
  );
}
