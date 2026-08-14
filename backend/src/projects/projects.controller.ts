import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import type { User as PrismaUser, Project } from '@prisma/client';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  /**
   * POST /projects
   * Accepts multipart/form-data with a file and project details
   */
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @CurrentUser() user: PrismaUser,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() createProjectDto: CreateProjectDto,
  ): Promise<Project> {
    if (!file) {
      throw new BadRequestException('Book file (.txt) is required');
    }

    // Input validation: Only UTF-8 text files allowed.
    // Validate by checking both file extension and MIME type.
    const isTextFile = file.originalname.endsWith('.txt');
    const isTextMime =
      file.mimetype.startsWith('text/') ||
      file.mimetype === 'application/octet-stream'; // Handle some OS variations for txt mimetypes

    if (!isTextFile || !isTextMime) {
      throw new BadRequestException('Only .txt text files are allowed');
    }

    return this.projectsService.createProject(
      user.id,
      createProjectDto.title,
      createProjectDto.style,
      file.buffer,
    );
  }

  /**
   * GET /projects
   * Lists all projects belonging to the logged-in user
   */
  @Get()
  async findAll(@CurrentUser() user: PrismaUser): Promise<Project[]> {
    return this.projectsService.findUserProjects(user.id);
  }

  /**
   * GET /projects/:id
   * Retrieves a specific project if it belongs to the logged-in user
   */
  @Get(':id')
  async findOne(
    @CurrentUser() user: PrismaUser,
    @Param('id') id: string,
  ): Promise<Project> {
    return this.projectsService.findOneUserProject(user.id, id);
  }
}
