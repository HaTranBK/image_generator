import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class StorageService {
  private uploadsDir = path.resolve(__dirname, '..', '..', 'uploads');

  /**
   * Helper to resolve and validate that the target directory/file is inside uploadsDir
   */
  private securePath(...parts: string[]): string {
    const resolvedPath = path.resolve(this.uploadsDir, ...parts);
    if (!resolvedPath.startsWith(this.uploadsDir)) {
      throw new BadRequestException(
        'Invalid project ID or path traversal detected',
      );
    }
    return resolvedPath;
  }

  /**
   * Validates project ID format to ensure it cannot contain traversal elements
   */
  private validateProjectId(projectId: string): void {
    if (
      !projectId ||
      typeof projectId !== 'string' ||
      projectId.includes('..') ||
      projectId.includes('/') ||
      projectId.includes('\\')
    ) {
      throw new BadRequestException(
        'Invalid project ID or path traversal detected',
      );
    }
  }

  /**
   * Saves text content to disk and returns the relative path
   */
  async saveBookText(
    projectId: string,
    fileName: string,
    content: string,
  ): Promise<string> {
    this.validateProjectId(projectId);
    const projectDir = this.securePath('projects', projectId);
    const targetFile = this.securePath('projects', projectId, fileName);

    await fs.mkdir(projectDir, { recursive: true });
    await fs.writeFile(targetFile, content, 'utf-8');

    // Return path relative to the backend root directory (using path.relative from backend root)
    const backendRoot = path.resolve(__dirname, '..', '..');
    return path.relative(backendRoot, targetFile);
  }

  /**
   * Writes a Multer buffer to the project folder
   */
  async saveBookFile(
    projectId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    this.validateProjectId(projectId);
    const projectDir = this.securePath('projects', projectId);
    const targetFile = this.securePath('projects', projectId, 'book.txt');

    await fs.mkdir(projectDir, { recursive: true });
    await fs.writeFile(targetFile, file.buffer);

    const backendRoot = path.resolve(__dirname, '..', '..');
    return path.relative(backendRoot, targetFile);
  }

  /**
   * Reads the saved book text file from disk
   */
  async readBookText(projectId: string): Promise<string> {
    this.validateProjectId(projectId);
    const targetFile = this.securePath('projects', projectId, 'book.txt');
    return fs.readFile(targetFile, 'utf-8');
  }

  /**
   * Deletes the directory recursively in case of failure/rollback
   */
  async deleteProjectDir(projectId: string): Promise<void> {
    this.validateProjectId(projectId);
    const projectDir = this.securePath('projects', projectId);
    await fs.rm(projectDir, { recursive: true, force: true });
  }
}
