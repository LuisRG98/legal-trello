
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { BriefcaseBusiness, LockKeyhole, Mail } from "lucide-react";

import { useAuth } from "../hooks/useAuth";

const loginSchema = z.object({
  email: z.string().email("Ingresa un correo válido."),
  password: z.string().min(1, "La contraseña es obligatoria."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError("");

    try {
      await login(values);
      navigate("/", { replace: true });
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail;

        setServerError(
          typeof detail === "string"
            ? detail
            : "No fue posible iniciar sesión."
        );
      } else {
        setServerError("Ocurrió un error inesperado.");
      }
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white">
          <BriefcaseBusiness size={28} />
        </div>

        <h1 className="text-2xl font-bold text-slate-900">
          Case Management
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Ingresa a tu cuenta para continuar
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Correo electrónico
          </label>

          <div className="relative">
            <Mail
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="usuario@empresa.com"
              {...register("email")}
              className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {errors.email && (
            <p className="mt-1 text-xs text-red-600">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Contraseña
          </label>

          <div className="relative">
            <LockKeyhole
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Ingresa tu contraseña"
              {...register("password")}
              className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {errors.password && (
            <p className="mt-1 text-xs text-red-600">
              {errors.password.message}
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
          {isSubmitting ? "Ingresando..." : "Iniciar sesión"}
        </button>
      </form>

      <p className="mt-8 text-center text-xs text-slate-400">
        Plataforma interna de gestión de casos
      </p>
    </div>
  );
}
