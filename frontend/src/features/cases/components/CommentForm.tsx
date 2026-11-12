import { useState } from "react";
import { Send } from "lucide-react";

import { useCreateComment } from "../hooks/useComments";

interface CommentFormProps {
  caseId: string;
}

export default function CommentForm({
  caseId,
}: CommentFormProps) {
  const [content, setContent] = useState("");

  const createMutation = useCreateComment(caseId);

  const canSubmit =
    content.trim().length > 0 &&
    content.trim().length <= 5000 &&
    !createMutation.isPending;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedContent = content.trim();

    if (!normalizedContent || normalizedContent.length > 5000) {
      return;
    }

    createMutation.mutate(
      { content: normalizedContent },
      {
        onSuccess: () => {
          setContent("");
        },
      },
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-white p-4"
    >
      <label
        htmlFor="new-comment"
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        Write a comment
      </label>

      <textarea
        id="new-comment"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="Share an update about this case..."
        rows={4}
        maxLength={5000}
        disabled={createMutation.isPending}
        className="w-full resize-y rounded-lg border border-slate-300 p-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
      />

      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-400">
          {content.length}/5000 characters
        </span>

        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send size={15} />

          {createMutation.isPending
            ? "Publishing..."
            : "Publish comment"}
        </button>
      </div>

      {createMutation.isError && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          Could not publish your comment. Please try again.
        </p>
      )}
    </form>
  );
}