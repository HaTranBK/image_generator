"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { getProject, Project } from "../../../lib/projects.api";
import { useAuth } from "../../../providers/AuthProvider";
import { useProjectDetail } from "@/components/pages/projectDetail/hooks/useProjectDetail";
import ProjectDetailView from "@/components/pages/projectDetail";

export default function ProjectDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();

  // 1. Initial State Fetch with TanStack Query (refetch on mount, staleTime 30s)
  const {
    data: project,
    isLoading,
    error,
  } = useQuery<Project>({
    queryKey: ["project", id],
    queryFn: () => getProject(id),
    enabled: !!id,
    refetchOnMount: true,
    staleTime: 30_000,
  });

  const detailState = useProjectDetail({ id, project, user });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafaf8]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white text-stone-800 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-orange-100 rounded-2xl p-6 text-center shadow-xl shadow-orange-100/40">
          <h2 className="text-xl font-bold text-red-500 mb-2">
            Error Loading Project
          </h2>
          <p className="text-stone-500 text-sm mb-6">
            {error instanceof Error
              ? error.message
              : "The project you are looking for does not exist."}
          </p>
          <button
            onClick={() => router.push("/")}
            className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-300/30 hover:from-orange-600 hover:to-amber-600 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <ProjectDetailView
      project={project}
      isRunning={detailState.isRunning}
      localRunningTime={detailState.localRunningTime}
      wsError={detailState.wsError}
      customStyle={detailState.customStyle}
      setCustomStyle={detailState.setCustomStyle}
      isStyleSubmitting={detailState.isStyleSubmitting}
      handleRunNextStep={detailState.handleRunNextStep}
      handleResetStep={detailState.handleResetStep}
      onBack={() => router.push("/")}
    />
  );
}
