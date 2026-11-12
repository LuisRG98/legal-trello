
import { useState } from "react";

import type { CaseListItem } from "../types/case.types";
import { useAssignees } from "../../users/hooks/useAssignees";
import { useUpdateCaseAssignment } from "../hooks/useCases";

interface CaseAssignmentSelectProps {
  caseItem: CaseListItem;
}

const roleLabels: Record<string, string> = {
  SALES: "Sales",
  MANAGER: "Manager",
  ADMIN: "Admin",
};

export default function CaseAssignmentSelect({
  caseItem,
}: CaseAssignmentSelectProps) {
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(
    caseItem.assigned_to_id ?? ""
  );

  const normalizedSearch = search.trim();

  const {
    data: assignees = [],
    isLoading: isLoadingAssignees,
    isError: isAssigneesError,
  } = useAssignees(normalizedSearch, true);

  const updateAssignment = useUpdateCaseAssignment();

  const handleAssignmentChange = (newUserId: string) => {
    setSelectedUserId(newUserId);

    updateAssignment.mutate(
      {
        caseId: caseItem.id,
        assignedToId: newUserId || null,
      },
      {
        onError: () => {
          setSelectedUserId(caseItem.assigned_to_id ?? "");
        },
      }
    );
  };

  return (
    <div className="min-w-52 space-y-2">
      <input
        type="text"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search users..."
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />

      {normalizedSearch.length < 2 && (
        <p className="text-xs text-gray-500">
          Enter at least 2 characters to search.
        </p>
      )}

      {isLoadingAssignees && (
        <p className="text-xs text-gray-500">
          Searching users...
        </p>
      )}

      {isAssigneesError && (
        <p className="text-xs text-red-600">
          Unable to load users.
        </p>
      )}

      {normalizedSearch.length >= 2 &&
        !isLoadingAssignees &&
        !isAssigneesError && (
          <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            {assignees.length === 0 ? (
              <p className="p-3 text-xs text-gray-500">
                No users found.
              </p>
            ) : (
              assignees.map((assignee) => (
                <button
                  key={assignee.id}
                  type="button"
                  disabled={updateAssignment.isPending}
                  onClick={() => handleAssignmentChange(assignee.id)}
                  className={`block w-full px-3 py-2 text-left text-sm transition hover:bg-blue-50 disabled:opacity-50 ${
                    selectedUserId === assignee.id
                      ? "bg-blue-50"
                      : ""
                  }`}
                >
                  <span className="block font-medium text-gray-700">
                    {assignee.full_name}
                  </span>

                  <span className="text-xs text-gray-500">
                    {roleLabels[assignee.role] ?? assignee.role}
                  </span>
                </button>
              ))
            )}
          </div>
        )}

      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs text-gray-500">
          {selectedUserId
            ? `Assigned user: ${caseItem.assigned_to?.full_name ?? selectedUserId}`
            : "Unassigned"}
        </p>

        {selectedUserId && (
          <button
            type="button"
            disabled={updateAssignment.isPending}
            onClick={() => handleAssignmentChange("")}
            className="shrink-0 text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
          >
            Remove
          </button>
        )}
      </div>

      {updateAssignment.isPending && (
        <p className="text-xs text-blue-600">
          Saving assignment...
        </p>
      )}

      {updateAssignment.isError && (
        <p className="text-xs text-red-600">
          Assignment failed. Please try again.
        </p>
      )}
    </div>
  );
}
