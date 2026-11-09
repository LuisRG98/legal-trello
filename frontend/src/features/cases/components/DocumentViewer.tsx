
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { caseService } from "../services/caseService";
import { useCaseDocuments } from "../hooks/useCases";

interface DocumentViewerProps {
  caseId: string;
  onClose: () => void;
}

export default function DocumentViewer({
  caseId,
  onClose,
}: DocumentViewerProps) {
  const documentsQuery = useCaseDocuments(caseId);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState("");

  const viewMutation = useMutation({
    mutationFn: (documentId: string) =>
      caseService.viewDocument(documentId),

    onSuccess: (blob, documentId) => {
      const document = documentsQuery.data?.find(
        (item) => item.id === documentId,
      );

      const url = URL.createObjectURL(blob);

      setPdfUrl(url);
      setPdfName(document?.original_filename ?? "Document.pdf");
    },
  });

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Case documents"
    >
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div>
            <h2 className="font-semibold text-slate-800">
              Case documents
            </h2>

            <p className="text-xs text-slate-500">
              Case ID: {caseId}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-[280px_1fr]">
          <aside className="overflow-y-auto border-b border-slate-200 p-4 md:border-b-0 md:border-r">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">
              Available documents
            </h3>

            {documentsQuery.isLoading && (
              <p className="text-sm text-slate-500">
                Loading documents...
              </p>
            )}

            {documentsQuery.isError && (
              <p role="alert" className="text-sm text-red-600">
                Could not load documents.
              </p>
            )}

            {documentsQuery.data?.length === 0 && (
              <p className="text-sm text-slate-500">
                No documents available for this case.
              </p>
            )}

            <div className="space-y-2">
              {documentsQuery.data?.map((document) => (
                <button
                  key={document.id}
                  type="button"
                  onClick={() =>
                    viewMutation.mutate(document.id)
                  }
                  disabled={viewMutation.isPending}
                  className="w-full rounded-lg border border-slate-200 p-3 text-left hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50"
                >
                  <p className="break-all text-sm font-medium text-slate-700">
                    {document.original_filename}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {(document.file_size / 1024).toFixed(1)} KB
                  </p>
                </button>
              ))}
            </div>

            {viewMutation.isError && (
              <p role="alert" className="mt-3 text-sm text-red-600">
                Could not open this PDF. Please try again.
              </p>
            )}
          </aside>

          <main className="flex min-h-[350px] flex-col bg-slate-100">
            {viewMutation.isPending && (
              <p className="m-auto text-sm text-slate-500">
                Loading PDF...
              </p>
            )}

            {!viewMutation.isPending && pdfUrl && (
              <>
                <div className="border-b border-slate-200 bg-white px-4 py-2">
                  <p className="truncate text-sm font-medium text-slate-700">
                    {pdfName}
                  </p>
                </div>

                <iframe
                  title={`PDF viewer: ${pdfName}`}
                  src={pdfUrl}
                  className="min-h-0 flex-1"
                />
              </>
            )}

            {!viewMutation.isPending && !pdfUrl && (
              <div className="m-auto p-6 text-center">
                <p className="font-medium text-slate-700">
                  Select a document
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Choose a PDF from the list to preview it here.
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
