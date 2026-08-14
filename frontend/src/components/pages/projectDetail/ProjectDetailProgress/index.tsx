"use client";

import React from "react";
import { Project } from "@/lib/projects.api";

interface ProjectDetailProgressProps {
  project: Project;
}

export default function ProjectDetailProgress({
  project,
}: ProjectDetailProgressProps) {
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
    <div className="space-y-6">
      <h2 className="text-xl font-black text-stone-900">Pipeline Progress</h2>

      <div className="relative flex items-start justify-between w-full overflow-x-auto pb-4">
        {[1, 2, 3, 4, 5].map((stepNum, idx) => {
          const isCompleted = project.currentStep >= stepNum;
          const isCurrent = project.currentStep === stepNum - 1;
          const isPending = project.currentStep < stepNum - 1;

          return (
            <div
              key={stepNum}
              className="flex-1 flex flex-col items-center relative text-center min-w-[90px] sm:min-w-[120px]"
            >
              {idx < 4 && (
                <div
                  className={`absolute left-[50%] right-[-50%] top-[18px] h-[2px] transition-colors ${
                    isCompleted
                      ? "bg-gradient-to-r from-orange-400 to-amber-400"
                      : "bg-stone-200"
                  }`}
                />
              )}

              <div
                className={`h-9 w-9 rounded-full flex items-center justify-center border-2 font-bold text-sm shrink-0 transition z-10 ${
                  isCompleted
                    ? "bg-gradient-to-br from-orange-500 to-amber-400 border-orange-400 text-white shadow-md shadow-orange-300/40"
                    : isCurrent
                      ? "bg-white border-orange-400 text-orange-500 shadow-md shadow-orange-200/60 animate-pulse"
                      : "bg-white border-stone-200 text-stone-400"
                }`}
              >
                {isCompleted ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  stepNum
                )}
              </div>

              <div className="mt-2.5 px-1">
                <h3
                  className={`font-semibold text-xs md:text-sm transition-colors break-words max-w-[85px] sm:max-w-[120px] ${
                    isCurrent
                      ? "text-orange-500 font-bold"
                      : isPending
                        ? "text-stone-400"
                        : "text-stone-600"
                  }`}
                >
                  {getStepName(stepNum)}
                </h3>
                {isCurrent && project.stepState === "running" && (
                  <span className="text-[10px] text-amber-600 block animate-pulse mt-0.5">
                    Running...
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
