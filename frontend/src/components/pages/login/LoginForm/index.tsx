"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { LoginPayload } from "@/lib/auth.api";

interface LoginFormProps {
  onSubmit: (data: LoginPayload) => void;
  isPending: boolean;
  isError: boolean;
  error: unknown;
}

export default function LoginForm({
  onSubmit,
  isPending,
  isError,
  error,
}: LoginFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginPayload>();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {/* Email */}
      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-sm font-semibold text-stone-700"
        >
          Email address
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 focus:bg-white"
          {...register("email", {
            required: "Email is required",
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: "Enter a valid email address",
            },
          })}
        />
        {errors.email && (
          <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>
        )}
      </div>

      {/* Name */}
      <div>
        <label
          htmlFor="name"
          className="mb-1.5 block text-sm font-semibold text-stone-700"
        >
          Your name
        </label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          placeholder="Jane Doe"
          className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 focus:bg-white"
          {...register("name", {
            required: "Name is required",
            minLength: { value: 1, message: "Name is required" },
            maxLength: { value: 100, message: "Name is too long" },
          })}
        />
        {errors.name && (
          <p className="mt-1.5 text-xs text-red-500">{errors.name.message}</p>
        )}
      </div>

      {/* Error from server */}
      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {(error as Error)?.message ?? "Login failed. Please try again."}
        </div>
      )}

      {/* Submit */}
      <button
        id="login-submit"
        type="submit"
        disabled={isSubmitting || isPending}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-orange-300/40 transition hover:from-orange-600 hover:to-amber-600 hover:shadow-orange-400/40 focus:outline-none focus:ring-2 focus:ring-orange-400/50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Signing in…
          </>
        ) : (
          "Continue →"
        )}
      </button>
    </form>
  );
}
