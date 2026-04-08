import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class UserPushService {
  constructor(private readonly gateway: RealtimeGateway) {}

  notifyNotificationsChanged(userId: string) {
    this.gateway.emitNotificationsChanged(userId);
  }
}
