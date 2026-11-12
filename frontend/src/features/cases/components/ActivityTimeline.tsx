
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  FileText,
  MessageSquare,
  UserRound,
  UserRoundPlus,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";

import { useCaseActivities } from "../hooks/useCaseActivities";

import type {
  CaseActivity,
} from "../types/activity.types";

interface ActivityTimelineProps {
  caseId: string;
}

const roleLabels: Record<string, string> = {
  SALES: "Sales",
  MANAGER: "Manager",
  ADMIN: "Admin",
};

const actionConfig: Record<
  string,
  {
    title: string;
    icon: typeof Activity;
    color: string;
    background: string;
  }
> = {
  CASE_CREATED: {
    title: "Case created",
    icon: CheckCircle2,
    color: "text-green-600",
    background: "bg-green-100",
  },

  DOCUMENT_UPLOADED: {
    title: "Document uploaded",
    icon: FileText,
    color: "text-blue-600",
    background: "bg-blue-100",
  },

  STATUS_CHANGED: {
    title: "Status changed",
    icon: Activity,
    color: "text-indigo-600",
    background: "bg-indigo-100",
  },

  ASSIGNMENT_CHANGED: {
    title: "Assignment changed",
    icon: UserRoundPlus,
    color: "text-purple-600",
    background: "bg-purple-100",
  },

  COMMENT_CREATED: {
    title: "Comment added",
    icon: MessageSquare,
    color: "text-cyan-600",
    background: "bg-cyan-100",
  },

  COMMENT_UPDATED: {
    title: "Comment edited",
    icon: MessageSquare,
    color: "text-amber-600",
    background: "bg-amber-100",
  },

  COMMENT_DELETED: {
    title: "Comment deleted",
    icon: MessageSquare,
    color: "text-red-600",
    background: "bg-red-100",
  },
};

function getValue(
  value: Record<string, unknown> | null,
  key: string,
): string | null {
  const result = value?.[key];

  if (result === null || result === undefined) {
    return null;
  }

  return String(result);
}

function formatStatus(value: string | null): string {
  if (!value) return "Unknown";

  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatFileSize(value: string | null): string | null {
  if (!value) return null;

  const bytes = Number(value);

  if (!Number.isFinite(bytes)) return null;

  if (bytes < 1024) return `${bytes} bytes`;

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function ActivityDetails({
  item,
}: {
  item: CaseActivity;
}) {
  const oldStatus = getValue(item.old_value, "status");
  const newStatus = getValue(item.new_value, "status");

  const filename = getValue(item.new_value, "filename");
  const fileSize = getValue(item.new_value, "file_size");

  const oldAssignee = getValue(
    item.old_value,
    "assigned_to_id",
  );

  const newAssignee = getValue(
    item.new_value,
    "assigned_to_id",
  );

  switch (item.action) {
    case "CASE_CREATED": {
      const caseNumber = getValue(
        item.new_value,
        "case_number",
      );

      const status = getValue(
        item.new_value,
        "status",
      );

      return (
        <div className="space-y-1 text-sm text-slate-600">
          {caseNumber && (
            <p>
              Case number:{" "}
              <span className="font-medium text-slate-800">
                {caseNumber}
              </span>
            </p>
          )}

          {status && (
            <p>
              Initial status:{" "}
              <span className="font-medium text-slate-800">
                {formatStatus(status)}
              </span>
            </p>
          )}
        </div>
      );
    }

    case "DOCUMENT_UPLOADED":
      return (
        <div className="space-y-1 text-sm text-slate-600">
          {filename && (
            <p className="break-all font-medium text-slate-800">
              {filename}
            </p>
          )}

          {fileSize && (
            <p>File size: {formatFileSize(fileSize)}</p>
          )}
        </div>
      );

    case "STATUS_CHANGED":
      return (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">
            {formatStatus(oldStatus)}
          </span>

          <ArrowRight size={14} className="text-slate-400" />

          <span className="rounded-md bg-blue-50 px-2 py-1 font-medium text-blue-700">
            {formatStatus(newStatus)}
          </span>
        </div>
      );

    case "ASSIGNMENT_CHANGED":
      return (
        <div className="space-y-1 text-sm text-slate-600">
          <p>
            Previous assignment:{" "}
            <span className="font-medium text-slate-800">
              {oldAssignee
                ? `User ${oldAssignee.slice(0, 8)}`
                : "Unassigned"}
            </span>
          </p>

          <p>
            New assignment:{" "}
            <span className="font-medium text-slate-800">
              {newAssignee
                ? `User ${newAssignee.slice(0, 8)}`
                : "Unassigned"}
            </span>
          </p>
        </div>
      );

    case "COMMENT_CREATED":
      return (
        <p className="text-sm text-slate-600">
          A new comment was added to this case.
        </p>
      );

    case "COMMENT_UPDATED":
      return (
        <p className="text-sm text-slate-600">
          A comment was edited.
        </p>
      );

    case "COMMENT_DELETED":
      return (
        <p className="text-sm text-slate-600">
          A comment was deleted.
        </p>
      );

    default:
      return (
        <p className="text-sm text-slate-600">
          An activity was recorded.
        </p>
      );
  }
}

function ActivityItem({
  item,
  isLast,
}: {
  item: CaseActivity;
  isLast: boolean;
}) {
  const config = actionConfig[item.action] ?? {
    title: item.action.replaceAll("_", " "),
    icon: AlertCircle,
    color: "text-slate-600",
    background: "bg-slate-100",
  };

  const Icon = config.icon;

  return (
    <div className="relative flex gap-3 pb-7">
      {!isLast && (
        <div className="absolute bottom-0 left-5 top-11 w-px bg-slate-200" />
      )}

      <div
        className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${config.background} ${config.color}`}
      >
        <Icon size={18} />
      </div>

      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-slate-800">
            {config.title}
          </h4>

          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Clock size={12} />
            {formatDate(item.created_at)}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-slate-500">
          <UserRound size={13} />

          <span className="font-medium text-slate-700">
            {item.actor.full_name}
          </span>

          <span>·</span>

          <span>
            {roleLabels[item.actor.role] ?? item.actor.role}
          </span>
        </div>

        <div className="mt-3">
          <ActivityDetails item={item} />
        </div>
      </div>
    </div>
  );
}

export default function ActivityTimeline({
  caseId,
}: ActivityTimelineProps) {
  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  } = useCaseActivities(caseId);

  const activities =
    data?.pages.flatMap((page) => page.items) ?? [];

  const total = data?.pages[0]?.total ?? 0;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 size={18} className="animate-spin" />
        Loading activity...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <AlertCircle size={28} className="text-red-500" />

        <p className="text-sm text-red-600">
          Unable to load case activity.
        </p>

        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Try again
        </button>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <Activity size={32} className="text-slate-300" />

        <p className="mt-3 font-medium text-slate-600">
          No activity yet
        </p>

        <p className="mt-1 text-sm text-slate-400">
          Changes and actions performed on this case will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">
            Activity history
          </h3>

          <p className="text-xs text-slate-500">
            {total} recorded activities
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          className="text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          Refresh
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
        <div className="mx-auto max-w-3xl">
          {activities.map((item, index) => (
            <ActivityItem
              key={item.id}
              item={item}
              isLast={
                index === activities.length - 1 &&
                !hasNextPage
              }
            />
          ))}

          {hasNextPage && (
            <div className="flex justify-center pb-4">
              <button
                type="button"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isFetchingNextPage && (
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />
                )}

                {isFetchingNextPage
                  ? "Loading..."
                  : "Load older activity"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
