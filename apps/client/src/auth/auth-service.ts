import { http } from '../lib/http';

export const authService = {
  login(target: { phone: string; password: string }) {
    return http.post<{ access_token: string }>(`/auth/login`, target);
  },
  profile() {
    return http.get<any>(`/auth`);
  },
};

