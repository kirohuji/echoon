import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Server, Socket } from 'socket.io';

interface JwtPayloadShape {
  id?: string;
  sub?: string;
}

@WebSocketGateway()
export class RealtimeGateway implements OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    const raw = client.handshake.auth?.token;
    const token = typeof raw === 'string' ? raw.trim() : '';
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayloadShape>(token);
      const userId = payload.id ?? payload.sub;
      if (!userId) {
        client.disconnect(true);
        return;
      }
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, status: true },
      });
      if (!user || user.status !== 1) {
        client.disconnect(true);
        return;
      }
      await client.join(`user:${userId}`);
    } catch (e) {
      this.logger.debug(`WS auth failed: ${e instanceof Error ? e.message : e}`);
      client.disconnect(true);
    }
  }

  emitNotificationsChanged(userId: string) {
    if (!this.server) return;
    this.server.to(`user:${userId}`).emit('notifications:changed', {});
  }
}
