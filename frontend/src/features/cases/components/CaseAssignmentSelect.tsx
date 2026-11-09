
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
  const {
    data: assignees = [],
    isLoading: isLoadingAssignees,
    isError: isAssigneesError,
  } = useAssignees();

  const updateAssignment = useUpdateCaseAssignment();

  const handleAssignmentChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const newUserId = event.target.value;

    updateAssignment.mutate({
      caseId: caseItem.id,
      assignedToId: newUserId || null,
    });
  };

  if (isLoadingAssignees) {
    return (
      <span className="text-xs text-gray-500">
        Loading users...
      </span>
    );
  }

  if (isAssigneesError) {
    return (
      <span className="text-xs text-red-600">
        Unable to load users
      </span>
    );
  }

  return (
    <div className="min-w-44">
      <select
        value={caseItem.assigned_to_id ?? ""}
        onChange={handleAssignmentChange}
        disabled={updateAssignment.isPending}
        aria-label={`Assign ${caseItem.case_number}`}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <option value="">
          Unassigned
        </option>

        {assignees.map((assignee) => (
          <option key={assignee.id} value={assignee.id}>
            {assignee.full_name} (
              {roleLabels[assignee.role] ?? assignee.role}
            )
          </option>
        ))}
      </select>

      {updateAssignment.isPending && (
        <p className="mt-1 text-xs text-blue-600">
          Saving assignment...
        </p>
      )}

      {updateAssignment.isError && (
        <p className="mt-1 text-xs text-red-600">
          Assignment failed. Please try again.
        </p>
      )}
    </div>
  );
}
