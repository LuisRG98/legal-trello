import { useState } from "react";
import { Search, X, LoaderCircle } from "lucide-react";

import type { CaseFilters } from "../types/case.types";
import type { Assignee } from "../../users/types/user.types";

import { useAssignees } from "../../users/hooks/useAssignees";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";

interface AdminCaseFiltersProps {
  filters: CaseFilters;
  onChange: (filters: CaseFilters) => void;
}

const roleOptions = [
  { value: "SALES", label: "Sales" },
  { value: "MANAGER", label: "Manager" },
  { value: "ADMIN", label: "Admin" },
] as const;

export function AdminCaseFilters({
  filters,
  onChange,
}: AdminCaseFiltersProps) {
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] =
    useState<Assignee | null>(null);

  const debouncedSearch = useDebouncedValue(search, 300);

  const assigneesQuery = useAssignees(
    debouncedSearch,
    true,
  );

  function handleRoleChange(value: string) {
    onChange({
      ...filters,
      assigned_to_role:
        value === ""
          ? undefined
          : (value as "SALES" | "MANAGER" | "ADMIN"),
      assigned_to_id: undefined,
      unassigned_only: false,
    });

    setSelectedUser(null);
    setSearch("");
  }

  function handleUserSelection(user: Assignee) {
    onChange({
      ...filters,
      assigned_to_id: user.id,
      assigned_to_role: undefined,
      unassigned_only: false,
    });

    setSelectedUser(user);
    setSearch("");
  }

  function handleUnassignedChange(checked: boolean) {
    onChange({
      ...filters,
      unassigned_only: checked,
      assigned_to_id: undefined,
      assigned_to_role: undefined,
    });

    setSelectedUser(null);
    setSearch("");
  }

  function clearFilters() {
    onChange({
      ...filters,
      assigned_to_id: undefined,
      assigned_to_role: undefined,
      unassigned_only: false,
    });

    setSelectedUser(null);
    setSearch("");
  }

  const hasAssignmentFilter =
    Boolean(filters.assigned_to_id) ||
    Boolean(filters.assigned_to_role) ||
    Boolean(filters.unassigned_only);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">
            Assignment filters
          </h3>

          <p className="text-sm text-gray-500">
            Filter cases by assigned user or role.
          </p>
        </div>

        {hasAssignmentFilter && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Filter by role */}
        <div>
          <label
            htmlFor="assigned-role"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Assigned user role
          </label>

          <select
            id="assigned-role"
            value={filters.assigned_to_role ?? ""}
            onChange={(event) =>
              handleRoleChange(event.target.value)
            }
            disabled={Boolean(
              filters.assigned_to_id ||
              filters.unassigned_only,
            )}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-100"
          >
            <option value="">All roles</option>

            {roleOptions.map((role) => (
              <option
                key={role.value}
                value={role.value}
              >
                {role.label}
              </option>
            ))}
          </select>
        </div>

        {/* Search specific user */}
        <div className="relative">
          <label
            htmlFor="assigned-user-search"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Assigned user
          </label>

          {selectedUser && filters.assigned_to_id ? (
            <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {selectedUser.full_name}
                </p>

                <p className="truncate text-xs text-gray-500">
                  {selectedUser.email}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  onChange({
                    ...filters,
                    assigned_to_id: undefined,
                  });

                  setSelectedUser(null);
                }}
                className="ml-2 rounded p-1 text-gray-500 hover:bg-gray-100"
                aria-label="Remove selected user"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  id="assigned-user-search"
                  type="text"
                  value={search}
                  disabled={Boolean(
                    filters.assigned_to_role ||
                    filters.unassigned_only,
                  )}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search user..."
                  className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm disabled:bg-gray-100"
                />
              </div>

              {debouncedSearch.trim().length >= 2 && (
                <div className="absolute z-40 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                  {assigneesQuery.isFetching ? (
                    <div className="flex items-center justify-center gap-2 p-3 text-sm text-gray-500">
                      <LoaderCircle
                        size={15}
                        className="animate-spin"
                      />
                      Searching...
                    </div>
                  ) : assigneesQuery.isError ? (
                    <p className="p-3 text-sm text-red-600">
                      Could not search users.
                    </p>
                  ) : assigneesQuery.data?.length === 0 ? (
                    <p className="p-3 text-sm text-gray-500">
                      No users found.
                    </p>
                  ) : (
                    assigneesQuery.data?.map((user: Assignee) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() =>
                          handleUserSelection(user)
                        }
                        className="w-full border-b border-gray-100 px-3 py-2 text-left hover:bg-gray-50"
                      >
                        <span className="block text-sm font-medium">
                          {user.full_name}
                        </span>

                        <span className="block text-xs text-gray-500">
                          {user.email} · {user.role}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Unassigned cases */}
        <div className="flex items-end">
          <label className="flex items-center gap-2 pb-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={filters.unassigned_only ?? false}
              onChange={(event) =>
                handleUnassignedChange(event.target.checked)
              }
              disabled={Boolean(
                filters.assigned_to_id ||
                filters.assigned_to_role,
              )}
              className="h-4 w-4 rounded border-gray-300"
            />

            Only unassigned cases
          </label>
        </div>
      </div>
    </div>
  );
}