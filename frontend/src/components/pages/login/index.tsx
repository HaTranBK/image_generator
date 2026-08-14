"use client";

import React from "react";
import { GRADION_LOGO_BASE64 } from "@/lib/logo";
import LoginForm from "./LoginForm";
import { LoginPayload } from "@/lib/auth.api";

interface LoginViewProps {
  onSubmit: (data: LoginPayload) => void;
  isPending: boolean;
  isError: boolean;
  error: unknown;
}

export default function LoginView({
  onSubmit,
  isPending,
  isError,
  error,
}: LoginViewProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-white px-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-orange-200/30 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-amber-200/20 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-orange-100/20 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Header / Branding */}
        <div className="mb-10 text-center">
          <div className="mb-5 inline-flex items-center justify-center p-4">
            <img
              src={GRADION_LOGO_BASE64}
              alt="GRADION Logo"
              className="h-9 w-auto object-contain"
            />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-stone-900">
            GRADION <span className="text-orange-500">IG</span>
          </h1>
          <p className="mt-2 text-sm font-medium text-stone-500">
            AI-powered Book Illustration Generator
          </p>
          <p className="mt-1 text-xs text-stone-400">
            Enter your email and name to get started
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-orange-100 bg-white p-8 shadow-xl shadow-orange-100/60">
          <LoginForm
            onSubmit={onSubmit}
            isPending={isPending}
            isError={isError}
            error={error}
          />
        </div>

        <p className="mt-6 text-center text-xs text-stone-400">
          No password required — your identity is your email.
        </p>
      </div>
    </div>
  );
}
