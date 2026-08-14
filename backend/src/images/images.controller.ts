import {
  Controller,
  Get,
  Param,
  Res,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { CurrentUser } from '../auth/current-user.decorator';
import { StorageService } from '../storage/storage.service';
import { ProjectsService } from '../projects/projects.service';
import type { User as PrismaUser } from '@prisma/client';

@Controller('api/images')
export class ImagesController {
  constructor(
    private readonly storageService: StorageService,
    private readonly projectsService: ProjectsService,
  ) {}

  /**
   * GET /api/images/:projectId/:type/:filename
   * Stream an image file — authenticated and ownership-checked.
   * type: 'portraits' | 'illustrations'
   */
  @Get(':projectId/:type/:filename')
  async streamImage(
    @CurrentUser() user: PrismaUser,
    @Param('projectId') projectId: string,
    @Param('type') type: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ): Promise<void> {
    // Validate type
    if (type !== 'portraits' && type !== 'illustrations') {
      throw new NotFoundException('Invalid image type');
    }

    // Verify project ownership (also validates projectId)
    try {
      await this.projectsService.findOneUserProject(user.id, projectId);
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      throw new NotFoundException('Project not found');
    }

    // Get absolute path and stream
    const absPath = this.storageService.getImageAbsPath(
      projectId,
      type,
      filename,
    );

    if (!fs.existsSync(absPath)) {
      throw new NotFoundException('Image not found');
    }

    // Set content type and stream
    const ext = path.extname(filename).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600');

    const fileStream = fs.createReadStream(absPath);
    fileStream.pipe(res);
  }
}
