"use client";

import { useQuery } from "@tanstack/react-query";
import { getProjects } from "../lib/projects.api";
import { useAuth } from "@/providers/AuthProvider";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logoutFn } = useAuth();

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
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  const getStepName = (step: number) => {
    const steps = [
      "Upload Book",
      "Analyze Style",
      "Generate Characters",
      "Generate Portraits",
      "Extract Chapters",
      "Generate Illustrations",
    ];
    return steps[step] || "Unknown";
  };

  return (
    <Header>
      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Your Projects</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Manage and resume your book illustration pipelines
            </p>
          </div>

          <button
            onClick={() => router.push("/projects/new")}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 shadow-lg shadow-violet-600/20"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            New Project
          </button>
        </div>

        {/* Project Grid */}
        {isProjectsLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mx-auto h-12 w-12 text-zinc-600 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <h3 className="font-semibold text-lg text-zinc-300">
              No projects yet
            </h3>
            <p className="text-sm text-zinc-500 mt-1">
              Get started by creating your first project.
            </p>
            <button
              onClick={() => router.push("/projects/new")}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600/10 border border-violet-500/20 px-4 py-2 text-sm font-semibold text-violet-400 hover:bg-violet-600/20 transition"
            >
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => router.push(`/projects/${project.id}`)}
                className="group relative rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 transition hover:border-zinc-700 hover:bg-zinc-900/60 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-lg leading-6 group-hover:text-violet-400 transition">
                      {project.title}
                    </h3>

                    {/* Project Status Pill */}
                    {project.status === "Done" ? (
                      <span className="shrink-0 inline-flex items-center rounded-full bg-green-500/10 border border-green-500/20 px-2.5 py-0.5 text-xs font-semibold text-green-400">
                        Done
                      </span>
                    ) : project.status === "In Progress" ? (
                      <span className="shrink-0 inline-flex items-center rounded-full bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 text-xs font-semibold text-violet-400">
                        In Progress
                      </span>
                    ) : (
                      <span className="shrink-0 inline-flex items-center rounded-full bg-zinc-800 border border-zinc-700 px-2.5 py-0.5 text-xs font-semibold text-zinc-400">
                        Draft
                      </span>
                    )}
                  </div>

                  {/* Status and Progress Info */}
                  <div className="mt-6 space-y-4">
                    <div>
                      <div className="flex justify-between text-xs text-zinc-400 mb-1">
                        <span>Progress</span>
                        <span>Step {project.currentStep}/5</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-violet-500 transition-all duration-500"
                          style={{
                            width: `${(project.currentStep / 5) * 100}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500">Current Step:</span>
                        <span className="font-medium text-zinc-300">
                          {getStepName(project.currentStep)}
                        </span>
                      </div>

                      {project.stepState === "running" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-500 animate-pulse">
                          Running
                        </span>
                      ) : project.stepState === "failed" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-500">
                          Failed
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Footer action */}
                <div className="mt-6 pt-4 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500">
                  <span>
                    Updated {new Date(project.updatedAt).toLocaleDateString()}
                  </span>
                  <span className="font-semibold text-violet-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    Resume
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3 w-3"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </Header>
  );
}
