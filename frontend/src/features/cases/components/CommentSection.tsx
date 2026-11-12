
import CommentForm from "./CommentForm";
import CommentItem from "./CommentItem";
import { useComments } from "../hooks/useComments";

type UserRole = "SALES" | "MANAGER" | "ADMIN";

interface CommentSectionProps {
  caseId: string;
  currentUserId: string;
  currentUserRole: UserRole;
}

export default function CommentSection({
  caseId,
  currentUserId,
  currentUserRole,
}: CommentSectionProps) {
  const {
    data: comments,
    isLoading,
    isError,
    error,
  } = useComments(caseId);

  return (
    <section className="flex h-full min-h-0 flex-col bg-slate-50">
      {/* SECTION HEADER */}
      <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <h3 className="text-lg font-semibold text-slate-800">
          Case comments
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Communicate updates, questions and relevant information about this
          case.
        </p>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
        {isLoading && (
          <div className="flex justify-center py-8">
            <p className="text-sm text-slate-500">
              Loading comments...
            </p>
          </div>
        )}

        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-700">
              Could not load comments.
            </p>

            <p className="mt-1 text-sm text-red-600">
              {error instanceof Error
                ? error.message
                : "An unexpected error occurred."}
            </p>
          </div>
        )}

        {!isLoading &&
          !isError &&
          (!comments || comments.length === 0) && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="font-medium text-slate-600">
                No comments yet
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Be the first person to add a comment to this case.
              </p>
            </div>
          )}

        {!isLoading && !isError && comments && comments.length > 0 && (
          <div className="space-y-4">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                caseId={caseId}
                comment={comment}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
              />
            ))}
          </div>
        )}
      </div>

      {/* COMMENT FORM */}
      <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
        <CommentForm caseId={caseId} />
      </div>
    </section>
  );
}
