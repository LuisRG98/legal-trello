
import type {
  CaseListItem,
  CaseStatus,
} from "../types/case.types";

import { AssigneePicker } from "./AssigneePicker";
import { Trash2 } from "lucide-react";

interface CaseTableProps {
  cases: CaseListItem[];
  canManageAssignments: boolean;
  canUpdateStatus: boolean;
  onViewDocuments: (caseId: string) => void;
  onStatusChange: (
    caseId: string,
    status: CaseStatus,
  ) => void;
  updatingCaseId?: string;
  canDeleteCases: boolean;
  selectedCaseIds: string[];
  onToggleCase: (caseId: string) => void;
  onToggleAllCases: (checked: boolean) => void;
  onDeleteCase: (caseId: string, caseNumber: string) => void;
  isDeleting: boolean;
}

const statusStyles: Record<CaseStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  IN_REVIEW: "bg-purple-100 text-purple-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  DROP: "bg-rose-100 text-rose-800",
  HIT_AND_RUN: "bg-orange-100 text-orange-800",
};

const statusLabels: Record<CaseStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  COMPLETED: "Completed",
  DROP: "Drop",
  HIT_AND_RUN: "Hit & Run",
};

const roleLabels: Record<string, string> = {
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

export default function CaseTable({
  cases,
  canManageAssignments,
  canUpdateStatus,
  onViewDocuments,
  onStatusChange,
  updatingCaseId,
  canDeleteCases,
  selectedCaseIds,
  onToggleCase,
  onToggleAllCases,
  onDeleteCase,
  isDeleting,
}: CaseTableProps) {
  if (cases.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <h3 className="font-semibold text-slate-800">
          No cases found
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          Try changing your search filters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              {canDeleteCases && (
                <th className="px-3 py-4">
                  <input
                    type="checkbox"
                    aria-label="Select all cases on this page"
                    checked={
                      cases.length > 0 &&
                      cases.every((item) => selectedCaseIds.includes(item.id))
                    }
                    onChange={(event) => onToggleAllCases(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                </th>
              )}
              <th className="px-6 py-4">Case number</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Assigned to
              </th>
              <th className="px-6 py-4">Created</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {cases.map((item) => (
              <tr
                key={item.id}
                className="transition hover:bg-slate-50"
              >
                {canDeleteCases && (
                  <td className="px-3 py-4">
                    <input
                      type="checkbox"
                      aria-label={`Select case ${item.case_number}`}
                      checked={selectedCaseIds.includes(item.id)}
                      onChange={() => onToggleCase(item.id)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  </td>
                )}
                <td className="px-6 py-4 font-semibold text-slate-800">
                  {item.case_number}
                </td>

                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      statusStyles[item.status_code]
                    }`}
                  >
                    {statusLabels[item.status_code]}
                  </span>
                </td>

                <td className="px-4 py-3">
                  {canManageAssignments ? (
                    <AssigneePicker caseItem={item} />
                  ) : item.assigned_to ? (
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {item.assigned_to.full_name}
                      </p>

                      <p className="text-xs text-gray-500">
                        {roleLabels[item.assigned_to.role] ??
                          item.assigned_to.role}
                      </p>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">
                      Unassigned
                    </span>
                  )}
                </td>

                <td className="px-6 py-4 text-slate-600">
                  {formatDate(item.created_at)}
                </td>

                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onViewDocuments(item.id)}
                      className="font-medium text-blue-600 hover:text-blue-800"
                    >
                      Documents
                    </button>

                    {canUpdateStatus && (
                      <select
                        aria-label={`Change status for ${item.case_number}`}
                        value={item.status_code}
                        disabled={updatingCaseId === item.id}
                        onChange={(event) =>
                          onStatusChange(
                            item.id,
                            event.target.value as CaseStatus,
                          )
                        }
                        className="max-w-36 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs disabled:opacity-50"
                      >
                        <option value="PENDING">Pending</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="IN_REVIEW">In Review</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="DROP">Drop</option>
                        <option value="HIT_AND_RUN">Hit &amp; Run</option>
                      </select>
                    )}

                    {canDeleteCases && (
                      <button
                        type="button"
                        onClick={() => onDeleteCase(item.id, item.case_number)}
                        disabled={isDeleting}
                        aria-label={`Delete case ${item.case_number}`}
                        title="Delete case"
                        className="rounded-md p-2 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
