import { io, type Socket } from 'socket.io-client';
import { CONFIG } from '../config';
import { STORAGE_KEY } from '../auth/constant';

let socket: Socket | null = null;

function serverOrigin(): string {
  const raw = (CONFIG.serverUrl ?? '').trim().replace(/\/$/, '');
  try {
    return new URL(raw).origin;
  } catch {
    return raw;
  }
}

export function connectNotificationsRealtime(onChanged: () => void) {
  disconnectNotificationsRealtime();
  const token = sessionStorage.getItem(STORAGE_KEY)?.trim();
  if (!token) return;

  const url = serverOrigin();
  if (!url) return;

  socket = io(url, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  socket.on('notifications:changed', () => {
    onChanged();
  });
}

export function disconnectNotificationsRealtime() {
  socket?.disconnect();
  socket?.removeAllListeners();
  socket = null;
}
