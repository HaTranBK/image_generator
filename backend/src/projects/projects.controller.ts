/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import type { User as PrismaUser } from '@prisma/client';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  /**
   * POST /projects
   * Accepts EITHER:
   *   - multipart/form-data with { title, style?, file (.txt) }
   *   - application/json with { title, style?, bookText }
   * Backend detects via content-type header.
   */
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    }),
  )
  async create(
    @CurrentUser() user: PrismaUser,
    @UploadedFile() file: any,
    @Body() createProjectDto: CreateProjectDto,
    @Req() req: any,
  ) {
    const contentType = req.headers['content-type'] ?? '';
    const isMultipart = contentType.includes('multipart/form-data');

    if (isMultipart) {
      // --- File upload flow ---
      if (!file) {
        throw new BadRequestException('Book file (.txt) is required');
      }

      const isTextFile = file.originalname.endsWith('.txt');
      const isTextMime =
        file.mimetype.startsWith('text/') ||
        file.mimetype === 'application/octet-stream';

      if (!isTextFile || !isTextMime) {
        throw new BadRequestException('Only .txt text files are allowed');
      }

      return this.projectsService.createProject(
        user.id,
        createProjectDto.title,
        createProjectDto.style,
        file.buffer,
      );
    } else {
      // --- Paste text flow (JSON body) ---
      const { bookText } = req.body as { bookText?: string };
      if (!bookText || !bookText.trim()) {
        throw new BadRequestException(
          'bookText is required when not uploading a file',
        );
      }

      return this.projectsService.createProject(
        user.id,
        createProjectDto.title,
        createProjectDto.style,
        undefined,
        bookText,
      );
    }
  }

  /**
   * GET /projects
   * Lists all projects belonging to the logged-in user
   */
  @Get()
  async findAll(@CurrentUser() user: PrismaUser) {
    return this.projectsService.findUserProjects(user.id);
  }

  /**
   * GET /projects/:id
   * Retrieves a specific project if it belongs to the logged-in user
   */
  @Get(':id')
  async findOne(@CurrentUser() user: PrismaUser, @Param('id') id: string) {
    return this.projectsService.findOneUserProject(user.id, id);
  }
}
