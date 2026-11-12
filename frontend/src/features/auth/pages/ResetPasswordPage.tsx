
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import {
  ArrowLeft,
  CheckCircle2,
  LockKeyhole,
} from "lucide-react";

import authService from "../services/authService";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(12, "La contraseña debe tener al menos 12 caracteres.")
      .max(128, "La contraseña no puede superar 128 caracteres."),

    confirmPassword: z.string().min(
      1,
      "Confirma tu nueva contraseña."
    ),
  })
  .refine(
    (values) => values.password === values.confirmPassword,
    {
      message: "Las contraseñas no coinciden.",
      path: ["confirmPassword"],
    }
  );

type ResetPasswordValues = z.infer<
  typeof resetPasswordSchema
>;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token") ?? "";

  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: ResetPasswordValues) => {
    setServerError("");

    if (!token || token.length < 32) {
      setServerError(
        "The password recovery link is invalid or incomplete."
      );
      return;
    }

    try {
      await authService.resetPassword({
        token,
        new_password: values.password,
      });

      setSuccess(true);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail;

        setServerError(
          typeof detail === "string"
            ? detail
            : "The recovery link is invalid or has expired."
        );
      } else {
        setServerError("An unexpected error occurred.");
      }
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white">
            {success ? (
              <CheckCircle2 size={28} />
            ) : (
              <LockKeyhole size={28} />
            )}
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            {success
              ? "Password updated"
              : "Create a new password"}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {success
              ? "Your password has been changed successfully."
              : "Choose a strong password for your account."}
          </p>
        </div>

        {success ? (
          <button
            type="button"
            onClick={() => navigate("/login", { replace: true })}
            className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Go to login
          </button>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
          >
            {!token && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                The recovery token is missing from this link.
              </div>
            )}

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                New password
              </label>

              <input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 12 characters"
                {...register("password")}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

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
                placeholder="Repeat your password"
                {...register("confirmPassword")}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
              disabled={isSubmitting || !token}
              className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? "Updating password..."
                : "Reset password"}
            </button>
          </form>
        )}

        <div className="mt-8 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft size={16} />
            Back to login
          </Link>
        </div>
      </section>
    </main>
  );
}
