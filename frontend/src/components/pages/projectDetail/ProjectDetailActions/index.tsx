"use client";

import React from "react";
import { Project } from "@/lib/projects.api";

interface ProjectDetailActionsProps {
  project: Project;
  isRunning: boolean;
  localRunningTime: number;
  customStyle: string;
  setCustomStyle: (val: string) => void;
  isStyleSubmitting: boolean;
  handleRunNextStep: () => void;
  handleResetStep: () => void;
}

export default function ProjectDetailActions({
  project,
  isRunning,
  localRunningTime,
  customStyle,
  setCustomStyle,
  isStyleSubmitting,
  handleRunNextStep,
  handleResetStep,
}: ProjectDetailActionsProps) {
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

  const isFinished = project.currentStep >= 5;
  const showForceRetry = isRunning && localRunningTime >= 60;

  return (
    <div className="mt-12 pt-6 border-t border-orange-100 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>
        {project.stepState === "failed" && (
          <div className="text-red-500 text-sm flex flex-col gap-1">
            <span className="flex items-center gap-1.5 font-bold">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
              Execution Failed
            </span>
            <span className="text-xs text-stone-500 max-w-md">
              {project.errorMessage}
            </span>
          </div>
        )}
        {project.stepState === "running" && (
          <span className="text-amber-600 text-sm flex items-center gap-2 font-semibold">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            Running Step {project.currentStep + 1} ({localRunningTime}s elapsed)
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
        {/* Optional Custom Style Input on Step 1 */}
        {project.currentStep === 0 && project.stepState === "idle" && (
          <div className="flex flex-col gap-1.5 mr-2">
            <input
              type="text"
              placeholder="Custom Art Style (optional)..."
              value={customStyle}
              onChange={(e) => setCustomStyle(e.target.value)}
              className="rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs text-stone-800 placeholder-stone-400 focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400/20 focus:bg-white transition"
              disabled={isStyleSubmitting}
            />
          </div>
        )}

        {/* Force Retry / Reset Step button */}
        {(project.stepState === "failed" || showForceRetry) && (
          <button
            onClick={handleResetStep}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-50 border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
          >
            Force Stop & Retry
          </button>
        )}

        {!isFinished ? (
          <button
            onClick={handleRunNextStep}
            disabled={project.stepState === "running" || isStyleSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-300/40 transition hover:from-orange-600 hover:to-amber-600 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {isStyleSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Triggering...
              </>
            ) : (
              `Run Step ${project.currentStep + 1}: ${getStepName(project.currentStep + 1)}`
            )}
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-green-50 border border-green-200 px-6 py-2.5 text-sm font-bold text-green-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4.5 w-4.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Pipeline Completed
          </span>
        )}
      </div>
    </div>
  );
}
