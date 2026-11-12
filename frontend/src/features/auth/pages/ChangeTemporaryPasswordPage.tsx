import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import {
  LockKeyhole,
  ShieldCheck,
  LogOut,
} from "lucide-react";

import { useAuth } from "../hooks/useAuth";

const schema = z
  .object({
    password: z
      .string()
      .min(12, "Use at least 12 characters.")
      .max(128, "Password cannot exceed 128 characters."),

    confirmPassword: z.string().min(
      1,
      "Please confirm your password."
    ),
  })
  .refine(
    (values) => values.password === values.confirmPassword,
    {
      message: "Passwords do not match.",
      path: ["confirmPassword"],
    }
  );

type FormValues = z.infer<typeof schema>;

export default function ChangeTemporaryPasswordPage() {
  const {
    changeTemporaryPassword,
    logout,
    mustChangePassword,
  } = useAuth();

  const navigate = useNavigate();

  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError("");

    try {
      await changeTemporaryPassword(values.password);

      navigate("/login", {
        replace: true,
        state: {
          message: "Your password was changed. Please sign in again.",
        },
      });
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail;

        setServerError(
          typeof detail === "string"
            ? detail
            : "Unable to change your password. Please try again."
        );
      } else {
        setServerError("An unexpected error occurred.");
      }
    }
  };

  if (!mustChangePassword) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-xl bg-white p-8 text-center shadow">
          <p className="text-slate-700">
            No password change is pending.
          </p>

          <Link
            to="/login"
            className="mt-4 inline-block text-sm font-semibold text-blue-600"
          >
            Return to login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <ShieldCheck size={28} />
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            Set your new password
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Your account was provided with a temporary password.
            Before accessing Case Management, you must create
            your own permanent password.
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5"
        >
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              New password
            </label>

            <div className="relative">
              <LockKeyhole
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 12 characters"
                {...register("password")}
                className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {errors.password && (
              <p className="mt-1 text-xs text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Confirm new password
            </label>

            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat your new password"
              {...register("confirmPassword")}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-600">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {serverError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? "Updating password..."
              : "Save new password"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            logout();
            navigate("/login", { replace: true });
          }}
          className="mt-6 flex w-full items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-800"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </section>
    </main>
  );
}