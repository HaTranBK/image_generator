import apiClient from './apiClient';

export interface Project {
  id: string;
  title: string;
  style?: string;
  currentStep: number;
  stepState: 'idle' | 'running' | 'failed';
  updatedAt: string;
  createdAt: string;
  // Bổ sung các thông tin khác nếu có từ backend (ví dụ: bookFilePath, user, v.v.)
}

/**
 * POST /projects — multipart/form-data.
 * Nhận FormData chứa title, style (nếu có), và file (.txt).
 */
export async function createProject(formData: FormData): Promise<Project> {
  const res = await apiClient.post<Project>('/projects', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
}

/**
 * GET /projects — Danh sách project của user.
 */
export async function getProjects(): Promise<Project[]> {
  const res = await apiClient.get<Project[]>('/projects');
  return res.data;
}

/**
 * GET /projects/:id — Chi tiết dự án.
 */
export async function getProject(id: string): Promise<Project> {
  const res = await apiClient.get<Project>(`/projects/${id}`);
  return res.data;
}
