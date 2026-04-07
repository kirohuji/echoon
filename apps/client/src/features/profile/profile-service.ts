import { http } from '../../lib/http';

export type MembershipDto = { plan: string; status: string; expiresAt: string | null; benefits: string[] };
export type NotificationDto = { id: string; title: string; body: string; read: boolean; createdAt: string };
export type TicketDto = { id: string; subject: string; status: string; createdAt: string };

export const profileService = {
  getMe() {
    return http.get<any>('/auth');
  },
  getMembership() {
    return http.get<MembershipDto>('/membership/me');
  },
  getNotifications() {
    return http.get<NotificationDto[]>('/notification/me');
  },
  getTickets() {
    return http.get<TicketDto[]>('/ticket/me');
  },
};

