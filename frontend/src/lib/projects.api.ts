import apiClient from "./apiClient";
import { Character, Chapter, Portrait, Illustration } from "./types";

export type ProjectStatus = "Draft" | "In Progress" | "Done";

export interface Project {
  id: string;
  userId: string;
  title: string;
  bookText: string;
  bookFilePath: string;
  style?: string | null;
  currentStep: number;
  stepState: "idle" | "running" | "failed";
  stepName?: string;
  stuckAt?: string | null;
  errorMessage?: string | null;
  characters: Character[];
  chapters: Chapter[];
  portraits: Portrait[];
  illustrations: Illustration[];
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * POST /projects — accepts EITHER:
 *   - FormData with { title, style?, file (.txt) }
 *   - JSON with { title, style?, bookText }
 */
export async function createProject(
  data: FormData | { title: string; style?: string; bookText: string },
): Promise<Project> {
  if (data instanceof FormData) {
    const res = await apiClient.post<Project>("/projects", data, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  } else {
    const res = await apiClient.post<Project>("/projects", data);
    return res.data;
  }
}

/** GET /projects — project list */
export async function getProjects(): Promise<Project[]> {
  const res = await apiClient.get<Project[]>("/projects");
  return res.data;
}

/** GET /projects/:id — full project detail */
export async function getProject(id: string): Promise<Project> {
  const res = await apiClient.get<Project>(`/projects/${id}`);
  return res.data;
}

/** POST /projects/:id/steps/run — trigger next step (202) */
export async function runStep(
  id: string,
  options: { style?: string } = {},
): Promise<{ message: string }> {
  const res = await apiClient.post<{ message: string }>(
    `/projects/${id}/steps/run`,
    options,
  );
  return res.data;
}

/** POST /projects/:id/steps/reset — reset stuck/failed step */
export async function resetStep(id: string): Promise<{ message: string }> {
  const res = await apiClient.post<{ message: string }>(
    `/projects/${id}/steps/reset`,
  );
  return res.data;
}
