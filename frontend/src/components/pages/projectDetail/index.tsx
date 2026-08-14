"use client";

import React from "react";
import { Project } from "@/lib/projects.api";
import Header from "@/components/Header";
import ProjectDetailHeader from "./ProjectDetailHeader";
import ProjectDetailProgress from "./ProjectDetailProgress";
import ProjectDetailActions from "./ProjectDetailActions";
import ProjectDetailBento from "./ProjectDetailBento";

interface ProjectDetailViewProps {
  project: Project;
  isRunning: boolean;
  localRunningTime: number;
  wsError: string | null;
  customStyle: string;
  setCustomStyle: (val: string) => void;
  isStyleSubmitting: boolean;
  handleRunNextStep: () => void;
  handleResetStep: () => void;
  onBack: () => void;
}

export default function ProjectDetailView({
  project,
  isRunning,
  localRunningTime,
  wsError,
  customStyle,
  setCustomStyle,
  isStyleSubmitting,
  handleRunNextStep,
  handleResetStep,
  onBack,
}: ProjectDetailViewProps) {
  return (
    <Header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <ProjectDetailHeader project={project} onBack={onBack} />

        {wsError && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-xs text-amber-700 rounded-xl">
            {wsError}
          </div>
        )}

        <div className="bg-white border border-orange-100 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-md shadow-orange-100/50">
          <ProjectDetailProgress project={project} />

          <ProjectDetailActions
            project={project}
            isRunning={isRunning}
            localRunningTime={localRunningTime}
            customStyle={customStyle}
            setCustomStyle={setCustomStyle}
            isStyleSubmitting={isStyleSubmitting}
            handleRunNextStep={handleRunNextStep}
            handleResetStep={handleResetStep}
          />
        </div>

        <ProjectDetailBento project={project} />
      </main>
    </Header>
  );
}
