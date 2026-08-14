import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { randomUUID } from 'crypto';
import type { Project } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Validates UTF-8 buffer and creates a new project record in database and local disk
   */
  async createProject(
    userId: string,
    title: string,
    style?: string,
    bookBuffer?: Buffer,
  ): Promise<Project> {
    if (!bookBuffer) {
      throw new BadRequestException('Book file is required.');
    }

    const text = bookBuffer.toString('utf-8');
    if (!text.trim()) {
      throw new BadRequestException('Book file is empty or invalid.');
    }

    // Limit book size to prevent LLM quota overflow or memory exhaustion (500,000 chars)
    if (text.length > 500000) {
      throw new BadRequestException(
        'Book content exceeds maximum allowed character limit of 500,000.',
      );
    }

    const projectId = randomUUID();
    let savedFilePath = '';

    try {
      // Save book file to storage first
      const mockFile = {
        originalname: 'book.txt',
        buffer: bookBuffer,
        mimetype: 'text/plain',
      } as Express.Multer.File;

      savedFilePath = await this.storageService.saveBookFile(
        projectId,
        mockFile,
      );

      // Create project record in database
      const project = await this.prisma.project.create({
        data: {
          id: projectId,
          userId,
          title,
          bookText: text,
          bookFilePath: savedFilePath,
          style: style || null,
          currentStep: 0,
          stepState: 'idle',
        },
      });

      return project;
    } catch (error) {
      // Cleanup files on database insertion failure
      try {
        await this.storageService.deleteProjectDir(projectId);
      } catch {
        // Log cleanup error but throw original database error
      }
      throw error;
    }
  }

  /**
   * Lists all projects belonging to the specified user
   */
  async findUserProjects(userId: string): Promise<Project[]> {
    return this.prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Fetches details of a project if it belongs to the user
   */
  async findOneUserProject(
    userId: string,
    projectId: string,
  ): Promise<Project> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this project',
      );
    }

    return project;
  }
}
