"use client";

import React from "react";
import { Project } from "@/lib/projects.api";
import HomeProjectCard from "../HomeProjectCard";

interface HomeProjectGridProps {
  projects: Project[];
  isLoading: boolean;
  onNewProject: () => void;
  onSelectProject: (id: string) => void;
}

export default function HomeProjectGrid({
  projects,
  isLoading,
  onNewProject,
  onSelectProject,
}: HomeProjectGridProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-16 border-2 border-dashed border-orange-200 rounded-2xl bg-orange-50/50">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-7 w-7 text-orange-400"
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
        </div>
        <h3 className="font-bold text-lg text-stone-700">No projects yet</h3>
        <p className="text-sm text-stone-400 mt-1">
          Get started by creating your first project.
        </p>
        <button
          onClick={onNewProject}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-300/30 transition hover:from-orange-600 hover:to-amber-600 hover:-translate-y-0.5"
        >
          Create Your First Project
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <HomeProjectCard
          key={project.id}
          project={project}
          onClick={() => onSelectProject(project.id)}
        />
      ))}
    </div>
  );
}
