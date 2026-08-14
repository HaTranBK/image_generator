"use client";

import React from "react";
import { Project } from "@/lib/projects.api";

interface ProjectDetailHeaderProps {
  project: Project;
  onBack: () => void;
}

export default function ProjectDetailHeader({
  project,
  onBack,
}: ProjectDetailHeaderProps) {
  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div className="flex justify-start">
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-600 transition hover:bg-orange-100 hover:border-orange-300"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Dashboard
        </button>
      </div>

      <div className="bg-white border border-orange-100 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-md shadow-orange-100/50">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl bg-gradient-to-r from-orange-500 via-amber-400 to-orange-400" />
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-orange-200/10 blur-3xl pointer-events-none" />

        {/* Project Header Info */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-1">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-600 mb-2">
              Pipeline Control
            </span>
            <div className="flex items-center gap-3 flex-wrap mt-2">
              <h1 className="text-3xl font-black tracking-tight text-stone-900">
                {project.title}
              </h1>
              {project.status === "Done" ? (
                <span className="inline-flex items-center rounded-full bg-green-50 border border-green-200 px-2.5 py-0.5 text-xs font-semibold text-green-600">
                  Done
                </span>
              ) : project.status === "In Progress" ? (
                <span className="inline-flex items-center rounded-full bg-orange-50 border border-orange-200 px-2.5 py-0.5 text-xs font-semibold text-orange-600">
                  In Progress
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-stone-100 border border-stone-200 px-2.5 py-0.5 text-xs font-semibold text-stone-500">
                  Draft
                </span>
              )}
            </div>
            <p className="text-stone-400 text-xs mt-1.5">
              Project ID: {project.id}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
