import { Module } from '@nestjs/common';
import { WsGateway } from './ws.gateway';
import { ProjectsModule } from '../projects/projects.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ProjectsModule, AuthModule],
  providers: [WsGateway],
})
export class GatewayModule {}
