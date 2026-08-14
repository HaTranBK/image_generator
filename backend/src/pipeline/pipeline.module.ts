import { Module } from '@nestjs/common';
import { PipelineService } from './pipeline.service';
import { PipelineController } from './pipeline.controller';
import { GeminiModule } from '../gemini/gemini.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [GeminiModule, ProjectsModule],
  providers: [PipelineService],
  controllers: [PipelineController],
  exports: [PipelineService],
})
export class PipelineModule {}
