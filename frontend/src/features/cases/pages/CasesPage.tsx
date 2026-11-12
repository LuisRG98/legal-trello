
import { useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";

import CaseFilters from "../components/CaseFilters";
import CaseTable from "../components/CaseTable";
import DocumentViewer from "../components/DocumentViewer";
import PDFUpload from "../components/PDFUpload";
import { AdminCaseFilters } from "../components/AdminCaseFilters";

import {
  useCases,
  useUpdateCaseStatus,
} from "../hooks/useCases";

import type {
  CaseFilters as CaseFiltersType,
  CaseStatus,
} from "../types/case.types";

export default function CasesPage() {
  const { user } = useAuth();

  // --------------------------------------------------
  // Permissions
  // --------------------------------------------------

  const isAdmin = user?.role === "ADMIN";

  const isManagerOrAdmin =
    user?.role === "MANAGER" ||
    user?.role === "ADMIN";

  const canManageAssignments = isManagerOrAdmin;

  // --------------------------------------------------
  // Local state
  // --------------------------------------------------

  const [caseNumber, setCaseNumber] = useState("");

  const [status, setStatus] = useState<CaseStatus | "">("");

  const [page, setPage] = useState(1);

  const [selectedCaseId, setSelectedCaseId] =
    useState<string | null>(null);

  // Administrative assignment filters
  const [assignmentFilters, setAssignmentFilters] =
    useState<CaseFiltersType>({});

  const pageSize = 20;

  // --------------------------------------------------
  // Build query filters
  // --------------------------------------------------

  const queryFilters: CaseFiltersType = {
    page,
    page_size: pageSize,

    case_number: caseNumber.trim() || undefined,

    status_code: status || undefined,

    ...(isAdmin ? assignmentFilters : {}),
  };

  // --------------------------------------------------
  // Queries and mutations
  // --------------------------------------------------

  const casesQuery = useCases(queryFilters);

  const updateStatusMutation = useUpdateCaseStatus();

  // --------------------------------------------------
  // Event handlers
  // --------------------------------------------------

  function handleStatusChange(
    caseId: string,
    newStatus: CaseStatus,
  ) {
    updateStatusMutation.mutate({
      caseId,
      payload: {
        status_code: newStatus,
      },
    });
  }

  function handleSearchChange(value: string) {
    setCaseNumber(value);
    setPage(1);
  }

  function handleStatusFilterChange(
    value: CaseStatus | "",
  ) {
    setStatus(value);
    setPage(1);
  }

  function handleAssignmentFiltersChange(
    newFilters: CaseFiltersType,
  ) {
    setAssignmentFilters(newFilters);
    setPage(1);
  }

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Cases
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage, track and review your cases.
          </p>
        </div>

        {casesQuery.data && (
          <div className="text-sm text-slate-500">
            {casesQuery.data.total} total cases
          </div>
        )}
      </div>

      {/* PDF upload */}
      {isManagerOrAdmin && <PDFUpload />}

      {/* General filters */}
      <CaseFilters
        caseNumber={caseNumber}
        status={status}
        onCaseNumberChange={handleSearchChange}
        onStatusChange={handleStatusFilterChange}
      />

      {/* Administrative assignment filters */}
      {isAdmin && (
        <AdminCaseFilters
          filters={assignmentFilters}
          onChange={handleAssignmentFiltersChange}
        />
      )}

      {/* Status update error */}
      {updateStatusMutation.isError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          The case status could not be updated.
          Please try again.
        </div>
      )}

      {/* Loading state */}
      {casesQuery.isLoading && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading cases...
        </div>
      )}

      {/* Error state */}
      {casesQuery.isError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"
        >
          Could not load cases. Please refresh the page
          or try again.
        </div>
      )}

      {/* Cases table */}
      {casesQuery.data && (
        <>
          <CaseTable
            cases={casesQuery.data.items}
            canManageAssignments={canManageAssignments}
            canUpdateStatus={Boolean(user)}
            onViewDocuments={setSelectedCaseId}
            onStatusChange={handleStatusChange}
            updatingCaseId={
              updateStatusMutation.isPending
                ? updateStatusMutation.variables?.caseId
                : undefined
            }
          />

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Page {casesQuery.data.page} of{" "}
              {Math.max(casesQuery.data.pages, 1)}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={
                  page <= 1 ||
                  casesQuery.isFetching
                }
                onClick={() =>
                  setPage((current) => current - 1)
                }
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-40"
              >
                Previous
              </button>

              <button
                type="button"
                disabled={
                  page >= casesQuery.data.pages ||
                  casesQuery.isFetching
                }
                onClick={() =>
                  setPage((current) => current + 1)
                }
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {/* Document viewer */}
      {selectedCaseId && user && (
        <DocumentViewer
          caseId={selectedCaseId}
          currentUserId={user.id}
          currentUserRole={user.role}
          onClose={() => setSelectedCaseId(null)}
        />
      )}
    </div>
  );
}
