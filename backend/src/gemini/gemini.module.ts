import { Module } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  providers: [GeminiService],
  exports: [GeminiService],
})
export class GeminiModule {}
