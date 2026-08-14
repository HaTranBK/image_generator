import { Module } from '@nestjs/common';
import { ImagesController } from './images.controller';
import { StorageModule } from '../storage/storage.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [StorageModule, ProjectsModule],
  controllers: [ImagesController],
})
export class ImagesModule {}
