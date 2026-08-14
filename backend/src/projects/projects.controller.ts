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
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import type { User as PrismaUser } from '@prisma/client';

@ApiTags('Projects')
@ApiBearerAuth()
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
  @ApiOperation({ summary: 'Create a new project' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({ type: CreateProjectDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Project created successfully',
    schema: {
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Success' },
        payload: { type: 'object' },
      },
    },
  })
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

    let project;
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

      project = await this.projectsService.createProject(
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

      project = await this.projectsService.createProject(
        user.id,
        createProjectDto.title,
        createProjectDto.style,
        undefined,
        bookText,
      );
    }

    return { code: 200, message: 'Success', payload: project };
  }

  /**
   * GET /projects
   * Lists all projects belonging to the logged-in user
   */
  @Get()
  @ApiOperation({ summary: 'List all projects for the current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Projects retrieved successfully',
    schema: {
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Success' },
        payload: { type: 'array', items: { type: 'object' } },
      },
    },
  })
  async findAll(@CurrentUser() user: PrismaUser) {
    const projects = await this.projectsService.findUserProjects(user.id);
    return { code: 200, message: 'Success', payload: projects };
  }

  /**
   * GET /projects/:id
   * Retrieves a specific project if it belongs to the logged-in user
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a specific project by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Project retrieved successfully',
    schema: {
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Success' },
        payload: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Project not found',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Access denied' })
  async findOne(@CurrentUser() user: PrismaUser, @Param('id') id: string) {
    const project = await this.projectsService.findOneUserProject(user.id, id);
    return { code: 200, message: 'Success', payload: project };
  }
}
