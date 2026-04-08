import { INestApplication } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { ServerOptions } from 'socket.io';

export type SocketIoCorsConfig = {
  origin: boolean | string | string[];
  credentials: boolean;
};

export class SocketIoAdapter extends IoAdapter {
  constructor(
    app: INestApplication,
    private readonly corsConfig: SocketIoCorsConfig,
  ) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions) {
    const opts = {
      ...options,
      cors: this.corsConfig,
    } as ServerOptions;
    return super.createIOServer(port, opts);
  }
}
