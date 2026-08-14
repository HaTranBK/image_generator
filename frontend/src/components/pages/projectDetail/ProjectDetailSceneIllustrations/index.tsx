"use client";

import React from "react";
import { Project } from "@/lib/projects.api";

interface ProjectDetailSceneIllustrationsProps {
  project: Project;
}

export default function ProjectDetailSceneIllustrations({
  project,
}: ProjectDetailSceneIllustrationsProps) {
  const isShown =
    project.currentStep >= 5 ||
    (project.currentStep === 4 && project.stepState === "running");

  if (!isShown) return null;

  return (
    <div className="bg-white border border-orange-100 rounded-2xl p-6 space-y-3 relative overflow-hidden transition-all duration-500 animate-in fade-in slide-in-from-bottom-2 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-md text-stone-700">
          5. Scene Illustrations
        </h3>
        {project.currentStep >= 5 ? (
          <span className="text-[10px] uppercase font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
            Completed
          </span>
        ) : (
          <span className="text-[10px] uppercase font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full animate-pulse">
            Running
          </span>
        )}
      </div>

      {project.chapters && project.chapters.length > 0 ? (
        <div className="space-y-4">
          {project.chapters.map((chap) => {
            const illustration = project.illustrations.find(
              (i) => i.chapterId === chap.id,
            );
            const isImageLoading =
              project.stepState === "running" &&
              project.currentStep === 4 &&
              !illustration;

            return (
              <div key={chap.id} className="space-y-3">
                <div className="aspect-video w-full rounded-2xl border border-orange-100 bg-orange-50 overflow-hidden relative flex items-center justify-center">
                  {illustration ? (
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}${illustration.localPath}`}
                      alt={chap.name}
                      className="h-full w-full object-cover transition duration-300 hover:scale-[1.02]"
                    />
                  ) : isImageLoading ? (
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
                      <span className="text-xs text-stone-400">
                        Generating Illustration...
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-stone-400">
                      Not generated yet
                    </span>
                  )}
                </div>
                <div className="p-3 bg-orange-50/60 border border-orange-100 rounded-xl space-y-1">
                  <span className="text-xs font-bold text-stone-500">
                    Scene Name
                  </span>
                  <span className="font-bold text-sm text-stone-800 block">
                    {chap.name}
                  </span>
                  <p className="text-xs text-stone-500 leading-relaxed mt-1">
                    {chap.prompt}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-stone-400 italic">
          Scene illustration generation starting...
        </p>
      )}
    </div>
  );
}
