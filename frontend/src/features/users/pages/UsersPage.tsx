import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import axios from "axios";
import {
  Search,
  Plus,
  Users,
  UserCheck,
  UserX,
  RefreshCw,
  X,
} from "lucide-react";

import {
  userService,
  type ManagedUser,
  type CreateUserPayload,
} from "../services/userService";

import type { UserRole } from "../types/user.types";

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrator",
  MANAGER: "Manager",
  SALES: "Sales",
};

const EMPTY_FORM: CreateUserPayload = {
  full_name: "",
  email: "",
  nickname: "",
  password: "",
  role: "SALES",
};

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;

    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail)) {
      return detail
        .map((item: { msg?: string }) => item.msg ?? "")
        .filter(Boolean)
        .join(", ");
    }
  }

  return "An unexpected error occurred. Please try again.";
}

function RoleBadge({ role }: { role: UserRole }) {
  const styles: Record<UserRole, string> = {
    ADMIN: "bg-purple-100 text-purple-700",
    MANAGER: "bg-blue-100 text-blue-700",
    SALES: "bg-slate-100 text-slate-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[role]}`}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

function CreateUserModal({
  onClose,
  onCreate,
  isCreating,
  error,
}: {
  onClose: () => void;
  onCreate: (payload: CreateUserPayload) => void;
  isCreating: boolean;
  error: string;
}) {
  const [form, setForm] = useState<CreateUserPayload>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);

  const updateField = <K extends keyof CreateUserPayload>(
    field: K,
    value: CreateUserPayload[K]
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    onCreate({
      ...form,
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase(),
      nickname: form.nickname.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
      <div className="my-auto w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Create new user
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Add a new account to your workspace.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isCreating}
            aria-label="Close modal"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div>
            <label
              htmlFor="full_name"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Full name
            </label>

            <input
              id="full_name"
              type="text"
              required
              minLength={2}
              maxLength={150}
              value={form.full_name}
              onChange={(event) =>
                updateField("full_name", event.target.value)
              }
              placeholder="John Smith"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Email address
            </label>

            <input
              id="email"
              type="email"
              required
              maxLength={255}
              value={form.email}
              onChange={(event) =>
                updateField("email", event.target.value)
              }
              placeholder="john@company.com"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="nickname"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Nickname
            </label>

            <input
              id="nickname"
              type="text"
              required
              minLength={2}
              maxLength={255}
              value={form.nickname}
              onChange={(event) =>
                updateField("nickname", event.target.value)
              }
              placeholder="john.smith"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <p className="mt-1 text-xs text-slate-400">
              This is the user's display nickname.
            </p>
          </div>

          <div>
            <label
              htmlFor="role"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              User role
            </label>

            <select
              id="role"
              value={form.role}
              onChange={(event) =>
                updateField("role", event.target.value as UserRole)
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="SALES">Sales</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Administrator</option>
            </select>

            <p className="mt-1 text-xs text-slate-400">
              Administrators have access to all platform management features.
            </p>
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Initial password
            </label>

            <div className="flex gap-2">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                value={form.password}
                onChange={(event) =>
                  updateField("password", event.target.value)
                }
                placeholder="At least 12 characters"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="rounded-lg border border-slate-300 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <p className="mt-1 text-xs text-slate-400">
              Use at least 12 characters. Share this password with the user
              through a separate, secure channel.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Email invitations are not enabled yet. The account will be
            created immediately, but you must communicate the initial
            password to the user separately.
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isCreating}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreating ? "Creating..." : "Create user"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createError, setCreateError] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: userService.getUsers,
    staleTime: 30_000,
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: userService.createUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["users"],
      });

      setShowCreateModal(false);
      setCreateError("");
      setSuccessMessage("User created successfully.");
    },
    onError: (error) => {
      setCreateError(getErrorMessage(error));
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({
      userId,
      role,
    }: {
      userId: string;
      role: UserRole;
    }) => userService.updateRole(userId, { role }),

    onSuccess: async () => {
      setActionError("");
      setSuccessMessage("User role updated successfully.");

      await queryClient.invalidateQueries({
        queryKey: ["users"],
      });
    },

    onError: (error) => {
      setActionError(getErrorMessage(error));
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({
      userId,
      is_active,
    }: {
      userId: string;
      is_active: boolean;
    }) => userService.updateStatus(userId, { is_active }),

    onSuccess: async () => {
      setActionError("");
      setSuccessMessage("User status updated successfully.");

      await queryClient.invalidateQueries({
        queryKey: ["users"],
      });
    },

    onError: (error) => {
      setActionError(getErrorMessage(error));
    },
  });

  const users = usersQuery.data ?? [];

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !normalizedSearch ||
        user.full_name.toLowerCase().includes(normalizedSearch) ||
        user.email.toLowerCase().includes(normalizedSearch) ||
        user.nickname.toLowerCase().includes(normalizedSearch);

      const matchesRole =
        roleFilter === "ALL" || user.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const activeUsers = users.filter((user) => user.is_active).length;
  const inactiveUsers = users.length - activeUsers;

  const handleCreate = (payload: CreateUserPayload) => {
    setCreateError("");
    setSuccessMessage("");
    createMutation.mutate(payload);
  };

  const handleRoleChange = (
    user: ManagedUser,
    role: UserRole
  ) => {
    if (user.role === role) return;

    const confirmed = window.confirm(
      `Change ${user.full_name}'s role to ${ROLE_LABELS[role]}?`
    );

    if (!confirmed) return;

    setSuccessMessage("");
    setActionError("");

    roleMutation.mutate({
      userId: user.id,
      role,
    });
  };

  const handleStatusChange = (user: ManagedUser) => {
    const nextStatus = !user.is_active;

    const confirmed = window.confirm(
      `${nextStatus ? "Activate" : "Deactivate"} ${user.full_name}?`
    );

    if (!confirmed) return;

    setSuccessMessage("");
    setActionError("");

    statusMutation.mutate({
      userId: user.id,
      is_active: nextStatus,
    });
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Users className="text-blue-600" size={25} />
            <h1 className="text-2xl font-bold text-slate-900">
              User Management
            </h1>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Create accounts and manage platform access.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setCreateError("");
            setShowCreateModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          <Plus size={18} />
          Create user
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Total users</p>
            <Users className="text-blue-600" size={20} />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {users.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Active users</p>
            <UserCheck className="text-emerald-600" size={20} />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {activeUsers}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Inactive users</p>
            <UserX className="text-amber-600" size={20} />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {inactiveUsers}
          </p>
        </div>
      </div>

      {(successMessage || actionError) && (
        <div
          role={actionError ? "alert" : "status"}
          className={`flex items-center justify-between rounded-lg border p-3 text-sm ${
            actionError
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          <span>{actionError || successMessage}</span>
          <button
            type="button"
            onClick={() => {
              setActionError("");
              setSuccessMessage("");
            }}
            aria-label="Dismiss message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email or nickname..."
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          >
            <option value="ALL">All roles</option>
            <option value="ADMIN">Administrators</option>
            <option value="MANAGER">Managers</option>
            <option value="SALES">Sales</option>
          </select>

          <button
            type="button"
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["users"] })
            }
            disabled={usersQuery.isFetching}
            aria-label="Refresh users"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={usersQuery.isFetching ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {usersQuery.isLoading ? (
          <div className="flex min-h-64 items-center justify-center">
            <p className="text-sm text-slate-500">
              Loading users...
            </p>
          </div>
        ) : usersQuery.isError ? (
          <div className="p-8 text-center">
            <p className="text-sm text-red-600">
              {getErrorMessage(usersQuery.error)}
            </p>

            <button
              type="button"
              onClick={() => usersQuery.refetch()}
              className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Try again
            </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
            <Users size={32} className="text-slate-300" />

            <p className="mt-3 font-medium text-slate-700">
              No users found
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Try another search or create a new user.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">User</th>
                    <th className="px-5 py-4 font-semibold">Nickname</th>
                    <th className="px-5 py-4 font-semibold">Role</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-900">
                          {user.full_name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {user.email}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {user.nickname}
                      </td>

                      <td className="px-5 py-4">
                        <select
                          aria-label={`Role for ${user.full_name}`}
                          value={user.role}
                          disabled={roleMutation.isPending}
                          onChange={(event) =>
                            handleRoleChange(
                              user,
                              event.target.value as UserRole
                            )
                          }
                          className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-blue-500 disabled:opacity-50"
                        >
                          <option value="SALES">Sales</option>
                          <option value="MANAGER">Manager</option>
                          <option value="ADMIN">Administrator</option>
                        </select>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-2 text-xs font-semibold ${
                            user.is_active
                              ? "text-emerald-700"
                              : "text-slate-500"
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              user.is_active
                                ? "bg-emerald-500"
                                : "bg-slate-400"
                            }`}
                          />
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          disabled={statusMutation.isPending}
                          onClick={() => handleStatusChange(user)}
                          className={`rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50 ${
                            user.is_active
                              ? "bg-red-50 text-red-700 hover:bg-red-100"
                              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          }`}
                        >
                          {user.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 md:hidden">
              {filteredUsers.map((user) => (
                <div key={user.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {user.full_name}
                      </p>
                      <p className="break-all text-xs text-slate-500">
                        {user.email}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        @{user.nickname}
                      </p>
                    </div>

                    <RoleBadge role={user.role} />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor={`mobile-role-${user.id}`}>
                      Role for {user.full_name}
                    </label>

                    <select
                      id={`mobile-role-${user.id}`}
                      value={user.role}
                      disabled={roleMutation.isPending}
                      onChange={(event) =>
                        handleRoleChange(
                          user,
                          event.target.value as UserRole
                        )
                      }
                      className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <option value="SALES">Sales</option>
                      <option value="MANAGER">Manager</option>
                      <option value="ADMIN">Administrator</option>
                    </select>

                    <button
                      type="button"
                      disabled={statusMutation.isPending}
                      onClick={() => handleStatusChange(user)}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                        user.is_active
                          ? "bg-red-50 text-red-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {user.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      </div>

      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
          isCreating={createMutation.isPending}
          error={createError}
        />
      )}
    </section>
  );
}