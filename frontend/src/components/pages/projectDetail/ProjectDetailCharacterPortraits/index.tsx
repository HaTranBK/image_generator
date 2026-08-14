"use client";

import React from "react";
import { Project } from "@/lib/projects.api";

interface ProjectDetailCharacterPortraitsProps {
  project: Project;
}

export default function ProjectDetailCharacterPortraits({
  project,
}: ProjectDetailCharacterPortraitsProps) {
  const isShown =
    project.currentStep >= 3 ||
    (project.currentStep === 2 && project.stepState === "running");

  if (!isShown) return null;

  return (
    <div className="bg-white border border-orange-100 rounded-2xl p-6 space-y-3 md:col-span-2 transition-all duration-500 animate-in fade-in slide-in-from-bottom-2 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-md text-stone-700">
          3. Character Portraits
        </h3>
        {project.currentStep >= 3 ? (
          <span className="text-[10px] uppercase font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
            Completed
          </span>
        ) : (
          <span className="text-[10px] uppercase font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full animate-pulse">
            Running
          </span>
        )}
      </div>

      {project.characters && project.characters.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {project.characters.map((char) => {
            const portrait = project.portraits.find(
              (p) => p.characterId === char.id,
            );
            const isImageLoading =
              project.stepState === "running" &&
              project.currentStep === 2 &&
              !portrait;

            return (
              <div
                key={char.id}
                className="flex gap-4 p-4 bg-orange-50/50 border border-orange-100 rounded-2xl items-center hover:border-orange-200 transition"
              >
                <div className="h-24 w-24 rounded-xl border border-orange-100 bg-orange-50 shrink-0 overflow-hidden relative flex items-center justify-center">
                  {portrait ? (
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}${portrait.localPath}`}
                      alt={char.name}
                      className="h-full w-full object-cover transition duration-300 hover:scale-105"
                    />
                  ) : isImageLoading ? (
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
                      <span className="text-[9px] text-stone-400">
                        Generating...
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-stone-400">Pending</span>
                  )}
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-bold text-stone-800">
                    {char.name}
                  </span>
                  <p className="text-xs text-stone-500 line-clamp-3">
                    {char.prompt}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-stone-400 italic">
          Portraits generation starting...
        </p>
      )}
    </div>
  );
}
