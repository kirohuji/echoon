import { CONFIG } from '../config';
import { STORAGE_KEY } from '../auth/constant';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = sessionStorage.getItem(STORAGE_KEY);
  const isForm = typeof FormData !== 'undefined' && init.body instanceof FormData;
  const baseHeaders: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  if (!isForm) baseHeaders['Content-Type'] = 'application/json';

  const res = await fetch(`${CONFIG.serverUrl}${path}`, {
    ...init,
    headers: {
      ...baseHeaders,
      ...(init.headers ?? {}),
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
  postForm<T>(path: string, form: FormData) {
    return request<T>(path, { method: 'POST', body: form });
  },
};

