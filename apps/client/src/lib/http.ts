import { CONFIG } from '../config';
import { STORAGE_KEY } from '../auth/constant';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = sessionStorage.getItem(STORAGE_KEY);

  const res = await fetch(`${CONFIG.serverUrl}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Request failed: ${res.status} ${text}`);
  }

  // backend uses JSON for most endpoints; audio endpoint will be handled elsewhere
  return res.json() as Promise<T>;
}

export const http = {
  get<T>(path: string) {
    return request<T>(path, { method: 'GET' });
  },
  post<T>(path: string, body?: unknown) {
    return request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) });
  },
};

