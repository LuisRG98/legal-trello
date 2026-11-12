import { useState } from "react";
import {
  Check,
  ChevronDown,
  LoaderCircle,
  Search,
  UserRound,
  X,
} from "lucide-react";

import type { CaseListItem } from "../types/case.types";
import { useAssignees } from "../../users/hooks/useAssignees";
import { useUpdateCaseAssignment } from "../hooks/useCases";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";

interface AssigneePickerProps {
  caseItem: CaseListItem;
}

const roleLabels = {
  SALES: "Sales",
  MANAGER: "Manager",
  ADMIN: "Admin",
};

export function AssigneePicker({
  caseItem,
}: AssigneePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const debouncedSearch = useDebouncedValue(search, 300);

  const assigneesQuery = useAssignees(
    debouncedSearch,
    isOpen,
  );

  const updateAssignment = useUpdateCaseAssignment();

  const currentAssignee = caseItem.assigned_to;

  function assignUser(userId: string | null) {
    updateAssignment.mutate(
      {
        caseId: caseItem.id,
        assignedToId: userId,
      },
      {
        onSuccess: () => {
          setIsOpen(false);
          setSearch("");
        },
      },
    );
  }

  return (
    <div className="relative min-w-48">
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        disabled={updateAssignment.isPending}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50"
      >
        <span className="min-w-0">
          <span className="block truncate font-medium">
            {currentAssignee?.full_name ?? "Unassigned"}
          </span>

          {currentAssignee && (
            <span className="block text-xs text-gray-500">
              {roleLabels[currentAssignee.role]}
            </span>
          )}
        </span>

        <ChevronDown
          size={16}
          className="shrink-0 text-gray-500"
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Assign case
            </h3>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setSearch("");
              }}
              className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, nickname or email..."
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
              autoFocus
            />
          </div>

          <div className="mt-3 max-h-64 overflow-y-auto">
            {debouncedSearch.trim().length < 2 ? (
              <p className="py-5 text-center text-sm text-gray-500">
                Type at least 2 characters to search.
              </p>
            ) : assigneesQuery.isFetching ? (
              <div className="flex items-center justify-center gap-2 py-5 text-sm text-gray-500">
                <LoaderCircle
                  size={16}
                  className="animate-spin"
                />
                Searching users...
              </div>
            ) : assigneesQuery.isError ? (
              <p className="py-5 text-center text-sm text-red-600">
                Could not load users. Please try again.
              </p>
            ) : assigneesQuery.data?.length === 0 ? (
              <p className="py-5 text-center text-sm text-gray-500">
                No active users found.
              </p>
            ) : (
              <div className="space-y-1">
                {assigneesQuery.data?.map((user) => {
                  const isSelected =
                    user.id === caseItem.assigned_to_id;

                  return (
                    <button
                      key={user.id}
                      type="button"
                      disabled={updateAssignment.isPending}
                      onClick={() => assignUser(user.id)}
                      className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-gray-50 disabled:opacity-50"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100">
                        <UserRound
                          size={17}
                          className="text-gray-600"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {user.full_name}
                        </p>

                        <p className="truncate text-xs text-gray-500">
                          {user.email}
                        </p>

                        <p className="text-xs text-gray-400">
                          @{user.nickname} · {roleLabels[user.role]}
                        </p>
                      </div>

                      {isSelected && (
                        <Check
                          size={17}
                          className="shrink-0 text-green-600"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {caseItem.assigned_to_id && (
            <>
              <div className="my-2 border-t border-gray-100" />

              <button
                type="button"
                disabled={updateAssignment.isPending}
                onClick={() => assignUser(null)}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Remove assignment
              </button>
            </>
          )}

          {updateAssignment.isPending && (
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
              <LoaderCircle
                size={13}
                className="animate-spin"
              />
              Updating assignment...
            </div>
          )}

          {updateAssignment.isError && (
            <p className="mt-2 text-xs text-red-600">
              Assignment could not be updated.
            </p>
          )}
        </div>
      )}
    </div>
  );
}