"use client";

import { useQuery } from "@tanstack/react-query";
import { getProjects } from "../lib/projects.api";
import { useAuth } from "@/providers/AuthProvider";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import HomeView from "@/components/pages/home";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  // Fetch real projects list using TanStack Query
  const { data: projects = [], isLoading: isProjectsLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
    enabled: isAuthenticated,
    refetchOnMount: true,
    staleTime: 0,
  });

  // Chuyển hướng nếu chưa đăng nhập
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafaf8]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <HomeView
      projects={projects}
      isProjectsLoading={isProjectsLoading}
      onNewProject={() => router.push("/projects/new")}
      onSelectProject={(id) => router.push(`/projects/${id}`)}
    />
  );
}
