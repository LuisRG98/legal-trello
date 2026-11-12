
import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Minus,
  Plus,
} from "lucide-react";

import { useCaseDocuments } from "../hooks/useCases";
import { caseService } from "../services/caseService";
import CommentSection from "./CommentSection";
import ActivityTimeline from "./ActivityTimeline";

// Configure PDF.js worker in the same module as Document and Page.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

type UserRole = "SALES" | "MANAGER" | "ADMIN";

interface DocumentViewerProps {
  caseId: string;
  currentUserId: string;
  currentUserRole: UserRole;
  onClose: () => void;
}

type ViewerTab = "documents" | "comments" | "activity";

export default function DocumentViewer({
  caseId,
  currentUserId,
  currentUserRole,
  onClose,
}: DocumentViewerProps) {
  const [activeTab, setActiveTab] = useState<ViewerTab>("documents");

  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    null
  );

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);

  const viewerRef = useRef<HTMLDivElement | null>(null);
  const [viewerWidth, setViewerWidth] = useState(800);

  const canDownload =
    currentUserRole === "MANAGER" || currentUserRole === "ADMIN";

  const {
    data: documents,
    isLoading,
    isError,
  } = useCaseDocuments(caseId);

  const selectedDocument = documents?.find(
    (document) => document.id === selectedDocumentId
  );

  // Measure the PDF viewer to make the page responsive.
  useEffect(() => {
    const element = viewerRef.current;

    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;

      if (width) {
        setViewerWidth(Math.max(280, width - 40));
      }
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  // Load the selected PDF.
  useEffect(() => {
    if (!selectedDocumentId) {
      setPdfUrl(null);
      setNumPages(0);
      setPageNumber(1);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    const loadDocument = async () => {
      try {
        setPdfLoading(true);
        setPdfError(null);
        setPdfUrl(null);
        setNumPages(0);
        setPageNumber(1);

        const blob = await caseService.viewDocument(selectedDocumentId);

        if (cancelled) return;

        objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
      } catch {
        if (!cancelled) {
          setPdfError("No se pudo cargar el documento.");
        }
      } finally {
        if (!cancelled) {
          setPdfLoading(false);
        }
      }
    };

    loadDocument();

    return () => {
      cancelled = true;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [selectedDocumentId]);

  const handleClose = () => {
    onClose();
  };

  const handleDocumentLoad = ({
    numPages: totalPages,
  }: {
    numPages: number;
  }) => {
    setNumPages(totalPages);
    setPageNumber(1);
  };

  const handlePreviousPage = () => {
    setPageNumber((current) => Math.max(1, current - 1));
  };

  const handleNextPage = () => {
    setPageNumber((current) => Math.min(numPages, current + 1));
  };

  const handleZoomIn = () => {
    setScale((current) => Math.min(2, current + 0.1));
  };

  const handleZoomOut = () => {
    setScale((current) => Math.max(0.5, current - 0.1));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4"
      onClick={handleClose}
    >
      <div
        className="
          flex h-[calc(100dvh-1rem)]
          max-h-[calc(100dvh-1rem)]
          min-h-0 w-full max-w-6xl
          flex-col overflow-hidden
          rounded-xl bg-white shadow-2xl
          sm:h-[90dvh] sm:max-h-[90dvh]
        "
        onClick={(event) => event.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-800">
              Case documents and comments
            </h2>

            <p className="text-sm text-slate-500">
              Case ID: {caseId}
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close viewer"
          >
            &times;
          </button>
        </div>

        {/* TABS */}
        <div className="flex shrink-0 border-b border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab("documents")}
            className={`px-5 py-3 text-sm font-medium transition ${
              activeTab === "documents"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Documents
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("comments")}
            className={`px-5 py-3 text-sm font-medium transition ${
              activeTab === "comments"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Comments
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("activity")}
            className={`px-5 py-3 text-sm font-medium transition ${
              activeTab === "activity"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Activity
          </button>
        </div>

        {/* CONTENT */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {activeTab === "documents" && (
            <div className="flex h-full min-h-0 flex-col md:flex-row">
              {/* DOCUMENT LIST */}
              <aside className="max-h-40 shrink-0 overflow-y-auto border-b border-slate-200 bg-slate-50 md:max-h-none md:w-72 md:border-b-0 md:border-r">
                <div className="p-4">
                  <h3 className="mb-3 text-sm font-semibold text-slate-700">
                    Available documents
                  </h3>

                  {isLoading && (
                    <p className="text-sm text-slate-500">
                      Loading documents...
                    </p>
                  )}

                  {isError && (
                    <p className="text-sm text-red-600">
                      Could not load documents.
                    </p>
                  )}

                  {!isLoading && !isError && documents?.length === 0 && (
                    <p className="text-sm text-slate-500">
                      No documents available.
                    </p>
                  )}

                  <div className="space-y-2">
                    {documents?.map((document) => (
                      <button
                        key={document.id}
                        type="button"
                        onClick={() => setSelectedDocumentId(document.id)}
                        className={`w-full rounded-lg border p-3 text-left transition ${
                          selectedDocumentId === document.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-slate-200 bg-white hover:bg-slate-100"
                        }`}
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
                </div>
              </aside>

              {/* PDF VIEWER */}
              <section className="flex min-h-0 flex-1 flex-col bg-slate-100">
                {!selectedDocumentId && (
                  <div className="flex flex-1 items-center justify-center p-6 text-center">
                    <div>
                      <p className="font-medium text-slate-600">
                        Select a document
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        Choose a PDF from the document list to preview it.
                      </p>
                    </div>
                  </div>
                )}

                {pdfLoading && (
                  <div className="flex flex-1 items-center justify-center">
                    <p className="text-sm text-slate-500">
                      Loading PDF...
                    </p>
                  </div>
                )}

                {pdfError && (
                  <div className="flex flex-1 items-center justify-center p-6">
                    <p className="text-sm text-red-600">{pdfError}</p>
                  </div>
                )}

                {pdfUrl && !pdfLoading && !pdfError && (
                  <>
                    {/* PDF TOOLBAR */}
                    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handlePreviousPage}
                          disabled={pageNumber <= 1}
                          className="rounded-md p-2 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Previous page"
                        >
                          <ChevronLeft size={18} />
                        </button>

                        <span className="text-sm tabular-nums text-slate-600">
                          Page {pageNumber} of {numPages || "..."}
                        </span>

                        <button
                          type="button"
                          onClick={handleNextPage}
                          disabled={pageNumber >= numPages}
                          className="rounded-md p-2 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Next page"
                        >
                          <ChevronRight size={18} />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleZoomOut}
                          disabled={scale <= 0.5}
                          className="rounded-md p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                          aria-label="Zoom out"
                        >
                          <Minus size={17} />
                        </button>

                        <span className="min-w-12 text-center text-sm text-slate-600">
                          {Math.round(scale * 100)}%
                        </span>

                        <button
                          type="button"
                          onClick={handleZoomIn}
                          disabled={scale >= 2}
                          className="rounded-md p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                          aria-label="Zoom in"
                        >
                          <Plus size={17} />
                        </button>

                        {canDownload && (
                          <a
                            href={pdfUrl}
                            download={
                              selectedDocument?.original_filename ??
                              "document.pdf"
                            }
                            className="ml-2 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                          >
                            <Download size={16} />
                            <span className="hidden sm:inline">
                              Download
                            </span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* PDF CANVAS */}
                    <div
                      ref={viewerRef}
                      className="min-h-0 flex-1 overflow-auto p-4"
                    >
                      <div className="flex justify-center">
                        <Document
                          file={pdfUrl}
                          onLoadSuccess={handleDocumentLoad}
                          onLoadError={() =>
                            setPdfError("No se pudo interpretar el PDF.")
                          }
                          loading={
                            <p className="text-sm text-slate-500">
                              Rendering PDF...
                            </p>
                          }
                          error={
                            <p className="text-sm text-red-600">
                              Could not render this PDF.
                            </p>
                          }
                        >
                          <Page
                            pageNumber={pageNumber}
                            width={Math.min(viewerWidth, 1000)}
                            scale={scale}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                            className="overflow-hidden rounded shadow-lg"
                          />
                        </Document>
                      </div>
                    </div>
                  </>
                )}
              </section>
            </div>
          )}

          {activeTab === "comments" && (
            <div className="h-full min-h-0 overflow-hidden">
              <CommentSection
                caseId={caseId}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
              />
            </div>
          )}

          {activeTab === "activity" && (
            <div className="h-full min-h-0 overflow-hidden">
              <ActivityTimeline caseId={caseId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
