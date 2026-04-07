import { http } from '../../lib/http';

export type MembershipDto = { plan: string; status: string; expiresAt: string | null; benefits: string[] };
export type NotificationDto = { id: string; title: string; body: string; imageUrl?: string | null; read: boolean; createdAt: string };
export type TicketDto = { id: string; subject: string; status: string; createdAt: string };

const unwrap = (raw: any) => (raw && raw.success === true && 'data' in raw ? raw.data : raw);

export const profileService = {
  getMe() {
    return http.get<any>('/auth');
  },
  async getMembership() {
    return unwrap(await http.get<any>('/membership/me')) as MembershipDto;
  },
  async getNotifications() {
    return unwrap(await http.get<any>('/notification/me')) as NotificationDto[];
  },
  async getTickets() {
    return unwrap(await http.get<any>('/ticket/me')) as TicketDto[];
  },
  async createNotification(input: { userId?: string; title: string; body: string; type?: string; image?: File | null }) {
    const form = new FormData();
    if (input.userId?.trim()) form.append('userId', input.userId.trim());
    form.append('title', input.title);
    form.append('body', input.body);
    if (input.type) form.append('type', input.type);
    if (input.image) form.append('image', input.image);
    return unwrap(await http.postForm<any>('/notification/admin/create', form));
  },
};

