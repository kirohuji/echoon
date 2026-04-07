import { http } from '../lib/http';

export const authService = {
  login(target: { phone: string; password: string }) {
    return http.post<{ access_token: string }>(`/auth/login`, target);
  },
  register(target: { phone: string; password: string; username: string }) {
    return http.post<{ access_token: string }>(`/auth/register`, target);
  },
  profile() {
    return http.get<any>(`/auth`);
  },
  providers() {
    return http.get<Record<string, boolean>>('/auth/providers');
  },
};

