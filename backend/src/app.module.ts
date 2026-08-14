import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
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
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DecimalSerializerInterceptor } from './common/interceptors/decimal-serializer.interceptor';

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
    // Global HTTP exception filter → standardized { code, message, errors } envelope
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    // Global interceptor → serialize Prisma Decimal and Date types
    {
      provide: APP_INTERCEPTOR,
      useClass: DecimalSerializerInterceptor,
    },
  ],
})
export class AppModule {}
