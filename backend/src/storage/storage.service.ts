import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { UPLOADS_DIR } from '../common/constants';

@Injectable()
export class StorageService {
  private uploadsDir = path.resolve(process.cwd(), UPLOADS_DIR);

  /** Helper to resolve and validate that the target path is inside uploadsDir */
  private securePath(...parts: string[]): string {
    const resolvedPath = path.resolve(this.uploadsDir, ...parts);
    if (!resolvedPath.startsWith(this.uploadsDir)) {
      throw new BadRequestException(
        'Invalid project ID or path traversal detected',
      );
    }
    return resolvedPath;
  }

  /** Validates project ID format to ensure no traversal elements */
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
   * Saves a Multer file buffer to disk as book.txt
   * Returns relative path from project root
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

    return path.join(UPLOADS_DIR, 'projects', projectId, 'book.txt');
  }

  /**
   * Saves raw text content to disk as book.txt (for paste-text flow)
   * Returns relative path from project root
   */
  async saveBookText(projectId: string, content: string): Promise<string> {
    this.validateProjectId(projectId);
    const projectDir = this.securePath('projects', projectId);
    const targetFile = this.securePath('projects', projectId, 'book.txt');

    await fs.mkdir(projectDir, { recursive: true });
    await fs.writeFile(targetFile, content, 'utf-8');

    return path.join(UPLOADS_DIR, 'projects', projectId, 'book.txt');
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
   * Saves a base64-encoded image (from Gemini API) to disk.
   * type: 'portraits' | 'illustrations'
   * Returns relative path from project root
   */
  async saveImage(
    projectId: string,
    type: 'portraits' | 'illustrations',
    filename: string,
    base64Data: string,
  ): Promise<string> {
    this.validateProjectId(projectId);
    const dir = this.securePath('projects', projectId, type);
    const targetFile = this.securePath('projects', projectId, type, filename);

    await fs.mkdir(dir, { recursive: true });
    const buffer = Buffer.from(base64Data, 'base64');
    await fs.writeFile(targetFile, buffer);

    return path.join(UPLOADS_DIR, 'projects', projectId, type, filename);
  }

  /**
   * Reads an image file and returns its buffer (for streaming endpoint)
   */
  async readImage(
    projectId: string,
    type: 'portraits' | 'illustrations',
    filename: string,
  ): Promise<Buffer> {
    this.validateProjectId(projectId);
    const targetFile = this.securePath('projects', projectId, type, filename);
    return fs.readFile(targetFile);
  }

  /**
   * Returns the absolute path to an image file (for stream piping)
   */
  getImageAbsPath(
    projectId: string,
    type: 'portraits' | 'illustrations',
    filename: string,
  ): string {
    this.validateProjectId(projectId);
    return this.securePath('projects', projectId, type, filename);
  }

  /**
   * Deletes the project directory recursively (cleanup on failure/rollback)
   */
  async deleteProjectDir(projectId: string): Promise<void> {
    this.validateProjectId(projectId);
    const projectDir = this.securePath('projects', projectId);
    await fs.rm(projectDir, { recursive: true, force: true });
  }
}
