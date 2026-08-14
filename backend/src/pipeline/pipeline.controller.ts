import {
  Controller,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PipelineService } from './pipeline.service';
import { ProjectsService } from '../projects/projects.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { User as PrismaUser } from '@prisma/client';
import { IsOptional, IsString } from 'class-validator';

class RunStepDto {
  @IsOptional()
  @IsString()
  style?: string;
}

@Controller('projects/:id/steps')
export class PipelineController {
  constructor(
    private readonly pipelineService: PipelineService,
    private readonly projectsService: ProjectsService,
  ) {}

  /**
   * POST /projects/:id/steps/run
   * Trigger the next pipeline step (fire-and-forget, 202 Accepted).
   * Body: { style?: string } — only used for step 1.
   */
  @Post('run')
  @HttpCode(HttpStatus.ACCEPTED)
  async runStep(
    @CurrentUser() user: PrismaUser,
    @Param('id') projectId: string,
    @Body() dto: RunStepDto,
  ) {
    // runNextStep validates ownership internally
    await this.pipelineService.runNextStep(projectId, user.id, {
      style: dto.style,
    });
    return { message: 'Step triggered' };
  }

  /**
   * POST /projects/:id/steps/reset
   * Reset a stuck/failed step so user can retry.
   * Only valid if stepState is 'running' (stuck) or 'failed'.
   */
  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async resetStep(
    @CurrentUser() user: PrismaUser,
    @Param('id') projectId: string,
  ) {
    await this.projectsService.resetStuckStep(projectId, user.id);
    return { message: 'Step reset — you can now retry' };
  }
}
