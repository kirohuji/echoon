import axios, { type AxiosError, type AxiosInstance } from 'axios';
import { STORAGE_KEY } from '../auth/constant';
import { CONFIG } from '../config';

function createApi(): AxiosInstance {
  const baseURL = (CONFIG.serverUrl ?? '').trim().replace(/\/$/, '');
  const instance = axios.create({
    baseURL: baseURL || undefined,
    timeout: 120_000,
  });

  instance.interceptors.request.use((config) => {
    const token = sessionStorage.getItem(STORAGE_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return instance;
}

const api = createApi();

function toRequestError(err: unknown): Error {
  if (axios.isAxiosError(err)) {
    const ax = err as AxiosError;
    const status = ax.response?.status ?? '?';
    const raw = ax.response?.data;
    let text = ax.message;
    if (typeof raw === 'string') {
      text = raw;
    } else if (raw && typeof raw === 'object' && !(raw instanceof Blob)) {
      try {
        text = JSON.stringify(raw);
      } catch {
        text = ax.message;
      }
    }
    return new Error(`Request failed: ${status} ${text}`);
  }
  return err instanceof Error ? err : new Error(String(err));
}

export const http = {
  async get<T>(path: string) {
    try {
      const { data } = await api.get<T>(path);
      return data;
    } catch (e) {
      throw toRequestError(e);
    }
  },

  async post<T>(path: string, body?: unknown) {
    try {
      const { data } = await api.post<T>(path, body ?? {});
      return data;
    } catch (e) {
      throw toRequestError(e);
    }
  },

  async postForm<T>(path: string, form: FormData) {
    try {
      const { data } = await api.post<T>(path, form);
      return data;
    } catch (e) {
      throw toRequestError(e);
    }
  },

  async getBlob(path: string) {
    try {
      const { data } = await api.get<Blob>(path, { responseType: 'blob' });
      return data;
    } catch (e) {
      throw toRequestError(e);
    }
  },
};
