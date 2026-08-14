/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { ProjectsRepository } from './provider/projects.repository';
import { randomUUID } from 'crypto';
import type { Project } from '@prisma/client';
import { Character, Chapter, Portrait, Illustration } from '../common/types';
import {
  STUCK_THRESHOLD_MS,
  MAX_CHARACTERS,
  MAX_CHAPTERS,
} from '../common/constants';

/** Derive a human-readable project status from state machine fields */
export function deriveProjectStatus(
  currentStep: number,
  stepState: string,
): 'Draft' | 'In Progress' | 'Done' {
  if (currentStep >= 5 && stepState === 'idle') return 'Done';
  if (stepState === 'running') return 'In Progress';
  if (currentStep > 0) return 'In Progress';
  return 'Draft';
}

/** Check if a project is stuck (running state > STUCK_THRESHOLD_MS) */
export function isProjectStuck(project: Project): boolean {
  if (project.stepState !== 'running') return false;
  if (!project.stuckAt) return false;
  return Date.now() - new Date(project.stuckAt).getTime() > STUCK_THRESHOLD_MS;
}

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projectsRepository: ProjectsRepository,
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
    bookText?: string,
  ): Promise<Project> {
    let text: string;

    if (bookBuffer) {
      text = bookBuffer.toString('utf-8');
    } else if (bookText) {
      text = bookText;
    } else {
      throw new BadRequestException(
        'Book content is required (either file or text).',
      );
    }

    if (!text.trim()) {
      throw new BadRequestException('Book content is empty or invalid.');
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
      if (bookBuffer) {
        const mockFile = {
          originalname: 'book.txt',
          buffer: bookBuffer,
          mimetype: 'text/plain',
        } as Express.Multer.File;
        savedFilePath = await this.storageService.saveBookFile(
          projectId,
          mockFile,
        );
      } else {
        // Paste text: save as file too for resumability
        savedFilePath = await this.storageService.saveBookText(projectId, text);
      }

      const result = await this.projectsRepository.create({
        id: projectId,
        userId,
        title,
        bookText: text,
        bookFilePath: savedFilePath,
        style: style || null,
        currentStep: 0,
        stepState: 'idle',
      });

      if (result.isErr()) {
        await this.storageService.deleteProjectDir(projectId).catch(() => {});
        throw new InternalServerErrorException(result.error.message);
      }

      return result.value;
    } catch (error) {
      try {
        await this.storageService.deleteProjectDir(projectId);
      } catch {
        // Log cleanup error but throw original database error
      }
      throw error;
    }
  }

  /**
   * Lists all projects belonging to the specified user.
   * Auto-fails any stuck projects (running > threshold) on read.
   */
  async findUserProjects(
    userId: string,
  ): Promise<(Project & { status: string })[]> {
    const result = await this.projectsRepository.findMany(userId);
    if (result.isErr())
      throw new InternalServerErrorException(result.error.message);

    const projects = result.value;
    const results = await Promise.all(
      projects.map(async (p) => {
        const project = await this.autoFailIfStuck(p);
        return {
          ...project,
          status: deriveProjectStatus(project.currentStep, project.stepState),
        };
      }),
    );
    return results;
  }

  /**
   * Fetches details of a project if it belongs to the user.
   * Auto-fails if stuck on read.
   */
  async findOneUserProject(
    userId: string,
    projectId: string,
  ): Promise<Project & { status: string }> {
    const result = await this.projectsRepository.findUnique(projectId);
    if (result.isErr())
      throw new InternalServerErrorException(result.error.message);

    const project = result.value;
    if (!project) throw new NotFoundException('Project not found');
    if (project.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this project',
      );
    }

    const finalProject = await this.autoFailIfStuck(project);
    return {
      ...finalProject,
      status: deriveProjectStatus(
        finalProject.currentStep,
        finalProject.stepState,
      ),
    };
  }

  /** Internal: if project is stuck, mark as failed and return updated */
  private async autoFailIfStuck(project: Project): Promise<Project> {
    if (isProjectStuck(project)) {
      const result = await this.projectsRepository.update(project.id, {
        stepState: 'failed',
        stuckAt: null,
        errorMessage:
          'Step was stuck in running state and has been auto-failed. Please retry.',
      });
      if (result.isErr()) return project; // best-effort, return original if update fails
      return result.value;
    }
    return project;
  }

  // ─── State Machine Methods (used by PipelineService) ─────────────────────

  /** Mark the current step as running; record stuckAt timestamp */
  async setStepRunning(projectId: string): Promise<Project> {
    const result = await this.projectsRepository.update(projectId, {
      stepState: 'running',
      stuckAt: new Date(),
      errorMessage: null,
    });
    if (result.isErr())
      throw new InternalServerErrorException(result.error.message);
    return result.value;
  }

  /** Advance to next step on success; clear stuckAt */
  async advanceStep(projectId: string): Promise<Project> {
    const findResult =
      await this.projectsRepository.findUniqueOrThrow(projectId);
    if (findResult.isErr())
      throw new InternalServerErrorException(findResult.error.message);

    const result = await this.projectsRepository.update(projectId, {
      currentStep: findResult.value.currentStep + 1,
      stepState: 'idle',
      stuckAt: null,
      errorMessage: null,
    });
    if (result.isErr())
      throw new InternalServerErrorException(result.error.message);
    return result.value;
  }

  /** Mark current step as failed with error message */
  async setStepFailed(
    projectId: string,
    errorMessage: string,
  ): Promise<Project> {
    const result = await this.projectsRepository.update(projectId, {
      stepState: 'failed',
      stuckAt: null,
      errorMessage,
    });
    if (result.isErr())
      throw new InternalServerErrorException(result.error.message);
    return result.value;
  }

  /** Reset stuck step back to idle so user can retry */
  async resetStuckStep(projectId: string, userId: string): Promise<Project> {
    const findResult = await this.projectsRepository.findUnique(projectId);
    if (findResult.isErr())
      throw new InternalServerErrorException(findResult.error.message);

    const project = findResult.value;
    if (!project) throw new NotFoundException('Project not found');
    if (project.userId !== userId)
      throw new ForbiddenException('Access denied');
    if (project.stepState !== 'running' && project.stepState !== 'failed') {
      throw new BadRequestException(
        'Step is not stuck or failed — cannot reset',
      );
    }

    const result = await this.projectsRepository.update(projectId, {
      stepState: 'idle',
      stuckAt: null,
      errorMessage: null,
    });
    if (result.isErr())
      throw new InternalServerErrorException(result.error.message);
    return result.value;
  }

  // ─── Result Persistence Methods ───────────────────────────────────────────

  async saveBookFileUri(
    projectId: string,
    bookFileUri: string,
    bookInteractionId: string,
  ): Promise<Project> {
    const result = await this.projectsRepository.update(projectId, {
      bookFileUri,
      bookInteractionId,
    });
    if (result.isErr())
      throw new InternalServerErrorException(result.error.message);
    return result.value;
  }

  async saveStyleResult(
    projectId: string,
    style: string,
    styleInteractionId: string,
  ): Promise<Project> {
    const result = await this.projectsRepository.update(projectId, {
      style,
      styleInteractionId,
    });
    if (result.isErr())
      throw new InternalServerErrorException(result.error.message);
    return result.value;
  }

  async saveCharactersResult(
    projectId: string,
    characters: Character[],
    charactersInteractionId: string,
  ): Promise<Project> {
    // Server-side cap enforcement: max 2 characters
    const capped = characters.slice(0, MAX_CHARACTERS);
    const result = await this.projectsRepository.update(projectId, {
      characters: capped as any,
      charactersInteractionId,
    });
    if (result.isErr())
      throw new InternalServerErrorException(result.error.message);
    return result.value;
  }

  async savePortrait(projectId: string, portrait: Portrait): Promise<Project> {
    const result = await this.projectsRepository.savePortrait(
      projectId,
      portrait,
    );
    if (result.isErr())
      throw new InternalServerErrorException(result.error.message);
    return result.value;
  }

  async saveChaptersResult(
    projectId: string,
    chapters: Chapter[],
    chaptersInteractionId: string,
  ): Promise<Project> {
    // Server-side cap enforcement: max 1 chapter
    const capped = chapters.slice(0, MAX_CHAPTERS);
    const result = await this.projectsRepository.update(projectId, {
      chapters: capped as any,
      chaptersInteractionId,
    });
    if (result.isErr())
      throw new InternalServerErrorException(result.error.message);
    return result.value;
  }

  async saveIllustration(
    projectId: string,
    illustration: Illustration,
  ): Promise<Project> {
    const result = await this.projectsRepository.saveIllustration(
      projectId,
      illustration,
    );
    if (result.isErr())
      throw new InternalServerErrorException(result.error.message);
    return result.value;
  }

  /** Validate that the project can run the next step */
  async validateCanRun(projectId: string, userId: string): Promise<Project> {
    const findResult = await this.projectsRepository.findUnique(projectId);
    if (findResult.isErr())
      throw new InternalServerErrorException(findResult.error.message);

    const project = findResult.value;
    if (!project) throw new NotFoundException('Project not found');
    if (project.userId !== userId)
      throw new ForbiddenException('Access denied');
    if (project.stepState === 'running') {
      throw new ConflictException('A step is already running for this project');
    }
    if (project.currentStep >= 5) {
      throw new BadRequestException(
        'All pipeline steps have already been completed',
      );
    }
    return project;
  }
}
