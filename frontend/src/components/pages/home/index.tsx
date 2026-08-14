"use client";

import React from "react";
import { Project } from "@/lib/projects.api";
import Header from "@/components/Header";
import HomeHeader from "./HomeHeader";
import HomeProjectGrid from "./HomeProjectGrid";

interface HomeViewProps {
  projects: Project[];
  isProjectsLoading: boolean;
  onNewProject: () => void;
  onSelectProject: (id: string) => void;
}

export default function HomeView({
  projects,
  isProjectsLoading,
  onNewProject,
  onSelectProject,
}: HomeViewProps) {
  return (
    <Header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <HomeHeader onNewProject={onNewProject} />

        <HomeProjectGrid
          projects={projects}
          isLoading={isProjectsLoading}
          onNewProject={onNewProject}
          onSelectProject={onSelectProject}
        />
      </main>
    </Header>
  );
}
