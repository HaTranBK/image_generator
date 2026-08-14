"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { LoginPayload } from "@/lib/auth.api";
import LoginView from "@/components/pages/login";

export default function LoginPage() {
  const router = useRouter();
  const { loginMutation, isAuthenticated, isLoading } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, router]);

  const onSubmit = async (data: LoginPayload) => {
    await loginMutation.mutateAsync(data);
    router.replace("/");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafaf8]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <LoginView
      onSubmit={onSubmit}
      isPending={loginMutation.isPending}
      isError={loginMutation.isError}
      error={loginMutation.error}
    />
  );
}
