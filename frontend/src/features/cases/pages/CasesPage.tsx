
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";

import { useAuth } from "../../auth/hooks/useAuth";

import CaseFilters from "../components/CaseFilters";
import CaseTable from "../components/CaseTable";
import DocumentViewer from "../components/DocumentViewer";
import PDFUpload from "../components/PDFUpload";
import { AdminCaseFilters } from "../components/AdminCaseFilters";
import { caseService } from "../services/caseService";

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


  const isManagerOrAdmin =
    user?.role === "MANAGER" ||
    user?.role === "ADMIN";

  const canManageAssignments = isManagerOrAdmin;
  const canDeleteCases = user?.role === "ADMIN";

  // --------------------------------------------------
  // Local state
  // --------------------------------------------------

  const [caseNumber, setCaseNumber] = useState("");

  const [status, setStatus] = useState<CaseStatus | "">("");

  const [page, setPage] = useState(1);
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);

  const [selectedCaseId, setSelectedCaseId] =
    useState<string | null>(null);

  // Administrative assignment filters
  const [assignmentFilters, setAssignmentFilters] =
    useState<CaseFiltersType>({});

  const [myCasesOnly, setMyCasesOnly] = useState(false);

  const pageSize = 20;

  // --------------------------------------------------
  // Build query filters
  // --------------------------------------------------

  const queryFilters: CaseFiltersType = {
    page,
    page_size: pageSize,

    case_number: caseNumber.trim() || undefined,

    status_code: status || undefined,
    my_cases: myCasesOnly ? true : undefined,

    ...(isManagerOrAdmin && !myCasesOnly ? assignmentFilters : {}),
  };

  // --------------------------------------------------
  // Queries and mutations
  // --------------------------------------------------

  const casesQuery = useCases(queryFilters);
  const queryClient = useQueryClient();

  const updateStatusMutation = useUpdateCaseStatus();

  const deleteCaseMutation = useMutation({
    mutationFn: caseService.deleteCase,
    onSuccess: async () => {
      setSelectedCaseIds([]);
      setPage(1);
      await queryClient.invalidateQueries({ queryKey: ["cases"] });
    },
  });

  const deleteCasesMutation = useMutation({
    mutationFn: caseService.deleteCases,
    onSuccess: async () => {
      setSelectedCaseIds([]);
      setPage(1);
      await queryClient.invalidateQueries({ queryKey: ["cases"] });
    },
  });

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
    setSelectedCaseIds([]);
    setCaseNumber(value);
    setPage(1);
  }

  function handleStatusFilterChange(
    value: CaseStatus | "",
  ) {
    setSelectedCaseIds([]);
    setStatus(value);
    setPage(1);
  }

  function handleAssignmentFiltersChange(
    newFilters: CaseFiltersType,
  ) {
    setSelectedCaseIds([]);
    setMyCasesOnly(false);
    setAssignmentFilters(newFilters);
    setPage(1);
  }

  function handleMyCasesChange(checked: boolean) {
    setSelectedCaseIds([]);
    setMyCasesOnly(checked);
    if (checked) {
      setAssignmentFilters({});
    }
    setPage(1);
  }

  function handleToggleCase(caseId: string) {
    setSelectedCaseIds((current) =>
      current.includes(caseId)
        ? current.filter((selectedId) => selectedId !== caseId)
        : [...current, caseId],
    );
  }

  function handleToggleAllCases(checked: boolean) {
    const visibleIds = casesQuery.data?.items.map((item) => item.id) ?? [];

    setSelectedCaseIds((current) => {
      if (!checked) {
        return current.filter((caseId) => !visibleIds.includes(caseId));
      }

      return Array.from(new Set([...current, ...visibleIds]));
    });
  }

  function handleDeleteCase(caseId: string, caseNumberValue: string) {
    const confirmed = window.confirm(
      `Delete case ${caseNumberValue}? Its documents, comments, and activity will also be deleted. This cannot be undone.`,
    );

    if (confirmed) {
      deleteCaseMutation.mutate(caseId);
    }
  }

  function handleDeleteSelectedCases() {
    if (selectedCaseIds.length === 0) return;

    const confirmed = window.confirm(
      `Delete ${selectedCaseIds.length} selected case(s)? Their documents, comments, and activity will also be deleted. This cannot be undone.`,
    );

    if (confirmed) {
      deleteCasesMutation.mutate(selectedCaseIds);
    }
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

        <div className="flex flex-wrap items-center gap-3">
          {casesQuery.data && (
            <div className="text-sm text-slate-500">
              {casesQuery.data.total} total cases
            </div>
          )}

          {canDeleteCases && selectedCaseIds.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteSelectedCases}
              disabled={deleteCasesMutation.isPending || deleteCaseMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 size={16} />
              {deleteCasesMutation.isPending
                ? "Deleting..."
                : `Delete selected (${selectedCaseIds.length})`}
            </button>
          )}
        </div>
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

      {isManagerOrAdmin && (
        <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={myCasesOnly}
            onChange={(event) => handleMyCasesChange(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <span>
            <span className="block font-medium text-gray-900">My cases</span>
            <span className="block text-xs text-gray-500">
              Show only cases assigned to me.
            </span>
          </span>
        </label>
      )}

      {/* Assignment filters for managers and admins */}
      {isManagerOrAdmin && !myCasesOnly && (
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

      {(deleteCaseMutation.isError || deleteCasesMutation.isError) && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          The selected case(s) could not be deleted. Refresh the list and try again.
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
            canDeleteCases={canDeleteCases}
            selectedCaseIds={selectedCaseIds}
            onToggleCase={handleToggleCase}
            onToggleAllCases={handleToggleAllCases}
            onDeleteCase={handleDeleteCase}
            isDeleting={deleteCaseMutation.isPending || deleteCasesMutation.isPending}
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
                onClick={() => {
                  setSelectedCaseIds([]);
                  setPage((current) => current - 1);
                }}
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
                onClick={() => {
                  setSelectedCaseIds([]);
                  setPage((current) => current + 1);
                }}
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
