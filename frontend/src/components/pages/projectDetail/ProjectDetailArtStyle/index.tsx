"use client";

import React from "react";
import { Project } from "@/lib/projects.api";

interface ProjectDetailArtStyleProps {
  project: Project;
}

export default function ProjectDetailArtStyle({
  project,
}: ProjectDetailArtStyleProps) {
  const isShown =
    project.currentStep >= 1 ||
    (project.currentStep === 0 && project.stepState === "running");

  if (!isShown) return null;

  return (
    <div className="bg-white border border-orange-100 rounded-2xl p-6 space-y-3 relative overflow-hidden transition-all duration-500 animate-in fade-in slide-in-from-bottom-2 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-md text-stone-700">1. Art Style</h3>
        {project.currentStep >= 1 ? (
          <span className="text-[10px] uppercase font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
            Completed
          </span>
        ) : (
          <span className="text-[10px] uppercase font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full animate-pulse">
            Running
          </span>
        )}
      </div>
      {project.style ? (
        <p className="text-sm text-stone-500 italic bg-orange-50 p-4 border border-orange-100 rounded-xl leading-relaxed">
          &ldquo;{project.style}&rdquo;
        </p>
      ) : (
        <div className="flex flex-col items-center justify-center p-4 space-y-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
          <p className="text-xs text-stone-400 italic">
            Analyzing style from text...
          </p>
        </div>
      )}
    </div>
  );
}
