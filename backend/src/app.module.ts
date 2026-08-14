import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/auth.guard';
import { ProjectsModule } from './projects/projects.module';
import { GeminiModule } from './gemini/gemini.module';
import { PipelineModule } from './pipeline/pipeline.module';
import { GatewayModule } from './gateway/gateway.module';
import { ImagesModule } from './images/images.module';

@Module({
  imports: [
    // Global event emitter (used by PipelineService → WsGateway)
    EventEmitterModule.forRoot(),
    PrismaModule,
    UsersModule,
    AuthModule,
    ProjectsModule,
    GeminiModule,
    PipelineModule,
    GatewayModule,
    ImagesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Apply JwtAuthGuard globally — use @Public() to opt out
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
