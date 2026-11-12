import { useState } from "react";
import {
  Clock,
  History,
  Pencil,
  Save,
  Trash2,
  X,
} from "lucide-react";

import {
  useCommentHistory,
  useDeleteComment,
  useUpdateComment,
} from "../hooks/useComments";

import type {
  CaseComment,
  UserRole,
} from "../types/comment.types";

interface CommentItemProps {
  caseId: string;
  comment: CaseComment;
  currentUserId: string;
  currentUserRole: UserRole;
}

const roleLabels: Record<UserRole, string> = {
  SALES: "Sales",
  MANAGER: "Manager",
  ADMIN: "Admin",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function CommentItem({
  caseId,
  comment,
  currentUserId,
  currentUserRole,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(
    comment.content,
  );
  const [showHistory, setShowHistory] = useState(false);

  const updateMutation = useUpdateComment(caseId);
  const deleteMutation = useDeleteComment(caseId);

  const historyQuery = useCommentHistory(
    caseId,
    comment.id,
    showHistory,
  );

  const isManagerOrAdmin =
    currentUserRole === "MANAGER" ||
    currentUserRole === "ADMIN";

  const isAuthor = comment.user_id === currentUserId;

  const canModify = isAuthor || isManagerOrAdmin;

  function handleUpdate() {
    const content = editedContent.trim();

    if (
      !content ||
      content.length > 5000 ||
      content === comment.content
    ) {
      return;
    }

    updateMutation.mutate(
      {
        commentId: comment.id,
        payload: { content },
      },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      },
    );
  }

  function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this comment? This action will be recorded in the comment history.",
    );

    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(comment.id);
  }

  function handleCancelEdit() {
    setEditedContent(comment.content);
    setIsEditing(false);
  }

  const hasChanges =
    editedContent.trim().length > 0 &&
    editedContent.trim() !== comment.content;

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      {/* Author information */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
            {comment.author.full_name
              .split(" ")
              .slice(0, 2)
              .map((part) => part[0])
              .join("")
              .toUpperCase()}
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">
              {comment.author.full_name}
            </p>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>
                {roleLabels[comment.author.role]}
              </span>

              <span>•</span>

              <span>{formatDate(comment.created_at)}</span>
            </div>
          </div>
        </div>

        {canModify && !isEditing && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              title="Edit comment"
              aria-label="Edit comment"
              onClick={() => setIsEditing(true)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
            >
              <Pencil size={16} />
            </button>

            <button
              type="button"
              title="Delete comment"
              aria-label="Delete comment"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Comment content */}
      <div className="mt-4">
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={editedContent}
              onChange={(event) =>
                setEditedContent(event.target.value)
              }
              rows={4}
              maxLength={5000}
              className="w-full resize-y rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400">
                {editedContent.length}/5000
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  <X size={15} />
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={
                    !hasChanges ||
                    updateMutation.isPending
                  }
                  className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save size={15} />

                  {updateMutation.isPending
                    ? "Saving..."
                    : "Save"}
                </button>
              </div>
            </div>

            {updateMutation.isError && (
              <p role="alert" className="text-sm text-red-600">
                Could not update this comment.
              </p>
            )}
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
            {comment.content}
          </p>
        )}
      </div>

      {deleteMutation.isError && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          Could not delete this comment.
        </p>
      )}

      {/* History */}
      <div className="mt-4 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={() => setShowHistory((current) => !current)}
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-blue-600"
        >
          <History size={15} />

          {showHistory ? "Hide history" : "View history"}
        </button>

        {showHistory && (
          <div className="mt-3 space-y-3">
            {historyQuery.isLoading && (
              <p className="text-xs text-slate-500">
                Loading history...
              </p>
            )}

            {historyQuery.isError && (
              <p role="alert" className="text-xs text-red-600">
                Could not load comment history.
              </p>
            )}

            {historyQuery.data?.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg bg-slate-50 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-700">
                    {entry.action} · Version {entry.version}
                  </span>

                  <span className="text-xs text-slate-400">
                    {formatDate(entry.created_at)}
                  </span>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  By {entry.author.full_name} (
                  {roleLabels[entry.author.role]})
                </p>

                <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600">
                  {entry.content}
                </p>
              </div>
            ))}

            {historyQuery.data?.length === 0 && (
              <p className="text-xs text-slate-500">
                No history available.
              </p>
            )}
          </div>
        )}
      </div>

      {comment.updated_at !== comment.created_at && (
        <p className="mt-3 flex items-center gap-1 text-xs text-slate-400">
          <Clock size={12} />
          Last updated: {formatDate(comment.updated_at)}
        </p>
      )}
    </article>
  );
}