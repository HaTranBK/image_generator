"use client";

import React from "react";
import { Project } from "@/lib/projects.api";

interface HomeProjectCardProps {
  project: Project;
  onClick: () => void;
}

export default function HomeProjectCard({
  project,
  onClick,
}: HomeProjectCardProps) {
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
    <div
      onClick={onClick}
      className="group relative rounded-2xl border border-orange-100 bg-white p-6 shadow-sm hover:shadow-md hover:shadow-orange-100/80 hover:border-orange-200 cursor-pointer flex flex-col justify-between transition hover:-translate-y-0.5"
    >
      {/* Subtle top accent line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl bg-gradient-to-r from-orange-400 to-amber-300 opacity-0 group-hover:opacity-100 transition" />

      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-lg leading-6 text-stone-800 group-hover:text-orange-600 transition">
            {project.title}
          </h3>

          {/* Project Status Pill */}
          {project.status === "Done" ? (
            <span className="shrink-0 inline-flex items-center rounded-full bg-green-50 border border-green-200 px-2.5 py-0.5 text-xs font-semibold text-green-600">
              Done
            </span>
          ) : project.status === "In Progress" ? (
            <span className="shrink-0 inline-flex items-center rounded-full bg-orange-50 border border-orange-200 px-2.5 py-0.5 text-xs font-semibold text-orange-600">
              In Progress
            </span>
          ) : (
            <span className="shrink-0 inline-flex items-center rounded-full bg-stone-100 border border-stone-200 px-2.5 py-0.5 text-xs font-semibold text-stone-500">
              Draft
            </span>
          )}
        </div>

        {/* Status and Progress Info */}
        <div className="mt-5 space-y-3">
          <div>
            <div className="flex justify-between text-xs text-stone-400 mb-1.5">
              <span>Progress</span>
              <span className="font-semibold text-stone-600">
                Step {project.currentStep}/5
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-orange-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-400 to-amber-400 transition-all duration-700 ease-out"
                style={{
                  width: `${(project.currentStep / 5) * 100}%`,
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-stone-400">Current Step:</span>
              <span className="font-semibold text-stone-600">
                {getStepName(project.currentStep)}
              </span>
            </div>

            {project.stepState === "running" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-600 animate-pulse">
                Running
              </span>
            ) : project.stepState === "failed" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-xs font-medium text-red-500">
                Failed
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Footer action */}
      <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400">
        <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
        <span className="font-bold text-orange-500 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
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
  );
}
