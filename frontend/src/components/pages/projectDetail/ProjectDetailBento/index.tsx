"use client";

import React from "react";
import { Project } from "@/lib/projects.api";
import ProjectDetailArtStyle from "../ProjectDetailArtStyle";
import ProjectDetailCharacterIdentities from "../ProjectDetailCharacterIdentities";
import ProjectDetailCharacterPortraits from "../ProjectDetailCharacterPortraits";
import ProjectDetailScenePrompts from "../ProjectDetailScenePrompts";
import ProjectDetailSceneIllustrations from "../ProjectDetailSceneIllustrations";

interface ProjectDetailBentoProps {
  project: Project;
}

export default function ProjectDetailBento({
  project,
}: ProjectDetailBentoProps) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {/* 1. Art Style Analysis */}
      <ProjectDetailArtStyle project={project} />

      {/* 2. Character Identities */}
      <ProjectDetailCharacterIdentities project={project} />

      {/* 3. Character Portraits */}
      <ProjectDetailCharacterPortraits project={project} />

      {/* 4. Scene Prompts */}
      <ProjectDetailScenePrompts project={project} />

      {/* 5. Scene Illustrations */}
      <ProjectDetailSceneIllustrations project={project} />
    </div>
  );
}
