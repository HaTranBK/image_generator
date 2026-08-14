import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProjectsService } from '../projects/projects.service';
import { PipelineWsEvent } from '../pipeline/pipeline.events';
import { JwtPayload } from '../common/types';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/',
})
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(WsGateway.name);

  /** Map<socketId, projectId> — used to clean up event listeners on disconnect */
  private readonly socketProjectMap = new Map<string, string>();
  /** Map<socketId, removeListener fn> */
  private readonly listenerCleanups = new Map<string, () => void>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly eventEmitter: EventEmitter2,
    private readonly projectsService: ProjectsService,
  ) {}

  async handleConnection(socket: Socket): Promise<void> {
    // Extract JWT from query param (browser WS API doesn't support custom headers)
    const token = socket.handshake.query.token as string | undefined;
    const projectId = socket.handshake.query.projectId as string | undefined;

    if (!token || !projectId) {
      this.logger.warn(
        `WS [${socket.id}]: missing token or projectId — disconnecting`,
      );
      socket.disconnect();
      return;
    }

    // Validate JWT
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(token, {
        secret: process.env.JWT_SECRET,
      });
    } catch {
      this.logger.warn(`WS [${socket.id}]: invalid JWT — disconnecting`);
      socket.disconnect();
      return;
    }

    // Verify project ownership
    try {
      const project = await this.projectsService.findOneUserProject(
        payload.sub,
        projectId,
      );

      // Join project room and send initial state sync
      await socket.join(`project:${projectId}`);
      this.socketProjectMap.set(socket.id, projectId);

      socket.emit('message', { type: 'state:sync', project });
      this.logger.log(`WS [${socket.id}]: connected to project ${projectId}`);

      // Subscribe to pipeline events for this project
      const handler = (event: PipelineWsEvent) => {
        socket.emit('message', event);
      };
      const eventName = `pipeline.${projectId}`;
      this.eventEmitter.on(eventName, handler);
      this.listenerCleanups.set(socket.id, () =>
        this.eventEmitter.removeListener(eventName, handler),
      );
    } catch {
      this.logger.warn(
        `WS [${socket.id}]: project ${projectId} not found or access denied — disconnecting`,
      );
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket): void {
    const cleanup = this.listenerCleanups.get(socket.id);
    if (cleanup) {
      cleanup();
      this.listenerCleanups.delete(socket.id);
    }
    this.socketProjectMap.delete(socket.id);
    this.logger.log(`WS [${socket.id}]: disconnected`);
  }

  /**
   * Client can re-subscribe (e.g. after reconnect) to get a fresh state:sync
   */
  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { projectId: string },
  ): Promise<void> {
    const token = socket.handshake.query.token as string | undefined;
    if (!token || !data.projectId) return;

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: process.env.JWT_SECRET,
      });
      const project = await this.projectsService.findOneUserProject(
        payload.sub,
        data.projectId,
      );
      socket.emit('message', { type: 'state:sync', project });
    } catch {
      // Ignore re-subscribe errors silently
    }
  }
}
