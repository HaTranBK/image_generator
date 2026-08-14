/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProjectsService } from '../projects/projects.service';
import { GeminiService } from '../gemini/gemini.service';
import { Character, Chapter, Portrait } from '../common/types';
import { STEP_NAMES, PipelineWsEvent } from './pipeline.events';

@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);

  /**
   * In-memory lock map — prevents duplicate Gemini calls within the same process.
   * LIMITATION: Not safe across multiple Node.js processes (PM2/cluster).
   * Documented in DECISIONS.md as accepted limitation for single-process local dev.
   */
  private readonly runningJobs = new Map<string, Promise<void>>();

  constructor(
    private readonly projectsService: ProjectsService,
    private readonly geminiService: GeminiService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private emit(projectId: string, event: PipelineWsEvent): void {
    this.eventEmitter.emit(`pipeline.${projectId}`, event);
  }

  /**
   * Trigger the next pipeline step (fire-and-forget, returns immediately).
   * Progress updates sent via WebSocket events.
   */
  async runNextStep(
    projectId: string,
    userId: string,
    options: { style?: string } = {},
  ): Promise<void> {
    if (this.runningJobs.has(projectId)) {
      throw new ConflictException('A step is already running for this project');
    }

    const project = await this.projectsService.validateCanRun(
      projectId,
      userId,
    );
    const step = project.currentStep + 1;

    this.logger.log(
      `Project ${projectId}: starting step ${step} (${STEP_NAMES[step]})`,
    );

    const job = this.executeStep(projectId, step, project, options).finally(
      () => {
        this.runningJobs.delete(projectId);
      },
    );

    this.runningJobs.set(projectId, job);
    // Fire-and-forget: caller gets 202 immediately
  }

  private async executeStep(
    projectId: string,
    step: number,
    project: any,
    options: { style?: string },
  ): Promise<void> {
    await this.projectsService.setStepRunning(projectId);
    this.emit(projectId, {
      type: 'step:start',
      step,
      stepName: STEP_NAMES[step],
    });

    try {
      await this.runStep(projectId, step, project, options);
      await this.projectsService.advanceStep(projectId);
      this.emit(projectId, {
        type: 'step:done',
        step,
        stepName: STEP_NAMES[step],
      });
      this.logger.log(`Project ${projectId}: step ${step} completed`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Project ${projectId}: step ${step} failed — ${errorMsg}`,
      );
      await this.projectsService.setStepFailed(projectId, errorMsg);
      this.emit(projectId, {
        type: 'step:failed',
        step,
        stepName: STEP_NAMES[step],
        error: errorMsg,
      });
    }
  }

  private async runStep(
    projectId: string,
    step: number,
    project: any,
    options: { style?: string },
  ): Promise<void> {
    switch (step) {
      case 1:
        await this.runStep1Style(projectId, project, options.style);
        break;
      case 2:
        await this.runStep2Characters(projectId, project);
        break;
      case 3:
        await this.runStep3Portraits(projectId, project);
        break;
      case 4:
        await this.runStep4Chapters(projectId, project);
        break;
      case 5:
        await this.runStep5Illustrations(projectId, project);
        break;
      default:
        throw new BadRequestException(`Unknown step: ${step}`);
    }
  }

  private async runStep1Style(
    projectId: string,
    project: any,
    userStyle?: string,
  ): Promise<void> {
    let bookInteractionId = project.bookInteractionId as string | null;

    // Upload book if not already done
    if (!bookInteractionId) {
      const uploadResult = await this.geminiService.uploadBookAndStartChain(
        project.bookText,
      );
      await this.projectsService.saveBookFileUri(
        projectId,
        uploadResult.bookFileUri,
        uploadResult.bookInteractionId,
      );
      bookInteractionId = uploadResult.bookInteractionId;
    } else {
      // Ensure file URI is still valid (48h TTL)
      await this.geminiService.ensureFileUri(project);
    }

    const result = await this.geminiService.runStyle(
      bookInteractionId,
      userStyle,
    );
    await this.projectsService.saveStyleResult(
      projectId,
      result.style,
      result.styleInteractionId,
    );
  }

  private async runStep2Characters(
    projectId: string,
    project: any,
  ): Promise<void> {
    const styleInteractionId = project.styleInteractionId;
    if (!styleInteractionId)
      throw new BadRequestException(
        'Style interaction ID is missing. Run step 1 first.',
      );
    const result = await this.geminiService.runCharacters(styleInteractionId);
    await this.projectsService.saveCharactersResult(
      projectId,
      result.characters,
      result.charactersInteractionId,
    );
  }

  private async runStep3Portraits(
    projectId: string,
    project: any,
  ): Promise<void> {
    const characters = (project.characters as unknown as Character[]) || [];
    const style = project.style ?? '';

    this.emit(projectId, {
      type: 'step:start',
      step: 3,
      stepName: STEP_NAMES[3],
      totalItems: characters.length,
    });

    await this.geminiService.runPortraits(
      characters,
      style,
      projectId,
      async (portrait: Portrait) => {
        await this.projectsService.savePortrait(projectId, portrait);
        const filename = portrait.localPath.split('/').pop() ?? '';
        const imageUrl = `/api/images/${projectId}/portraits/${filename}`;
        this.emit(projectId, {
          type: 'item:done',
          step: 3,
          itemId: portrait.characterId,
          imageUrl,
        });
      },
    );
  }

  private async runStep4Chapters(
    projectId: string,
    project: any,
  ): Promise<void> {
    const charactersInteractionId = project.charactersInteractionId;
    if (!charactersInteractionId)
      throw new BadRequestException(
        'Characters interaction ID is missing. Run step 2 first.',
      );
    const result = await this.geminiService.runChapters(
      charactersInteractionId,
    );
    await this.projectsService.saveChaptersResult(
      projectId,
      result.chapters,
      result.chaptersInteractionId,
    );
  }

  private async runStep5Illustrations(
    projectId: string,
    project: any,
  ): Promise<void> {
    const chapters = (project.chapters as unknown as Chapter[]) || [];
    const portraits = (project.portraits as unknown as Portrait[]) || [];
    const style = project.style ?? '';

    this.emit(projectId, {
      type: 'step:start',
      step: 5,
      stepName: STEP_NAMES[5],
      totalItems: chapters.length,
    });

    await this.geminiService.runIllustrations(
      chapters,
      portraits,
      style,
      projectId,
      async (illustration) => {
        await this.projectsService.saveIllustration(projectId, illustration);
        const filename = illustration.localPath.split('/').pop() ?? '';
        const imageUrl = `/api/images/${projectId}/illustrations/${filename}`;
        this.emit(projectId, {
          type: 'item:done',
          step: 5,
          itemId: illustration.chapterId,
          imageUrl,
        });
      },
    );
  }
}
