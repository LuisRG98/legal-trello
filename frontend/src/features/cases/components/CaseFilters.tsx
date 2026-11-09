
import type { CaseStatus } from "../types/case.types";

interface CaseFiltersProps {
  caseNumber: string;
  status: CaseStatus | "";
  onCaseNumberChange: (value: string) => void;
  onStatusChange: (value: CaseStatus | "") => void;
}

export default function CaseFilters({
  caseNumber,
  status,
  onCaseNumberChange,
  onStatusChange,
}: CaseFiltersProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row">
      <input
        type="search"
        value={caseNumber}
        onChange={(event) =>
          onCaseNumberChange(event.target.value)
        }
        placeholder="Search by case number..."
        className="min-w-0 flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />

      <select
        value={status}
        onChange={(event) =>
          onStatusChange(event.target.value as CaseStatus | "")
        }
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:border-blue-500"
      >
        <option value="">All statuses</option>
        <option value="PENDING">Pending</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="IN_REVIEW">In Review</option>
        <option value="COMPLETED">Completed</option>
      </select>
    </div>
  );
}
