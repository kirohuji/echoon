import { create } from 'zustand';
import { profileService, type MembershipDto, type NotificationDto, type TicketDto } from '../features/profile/profile-service';

type AppState = {
  user: any | null;
  membership: MembershipDto | null;
  notifications: NotificationDto[];
  tickets: TicketDto[];
  polling: boolean;
  setUser: (u: any | null) => void;
  refreshGlobal: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
};

let timer: ReturnType<typeof setInterval> | null = null;

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  membership: null,
  notifications: [],
  tickets: [],
  polling: false,
  setUser: (u) => set({ user: u }),
  refreshGlobal: async () => {
    const [membership, notifications, tickets] = await Promise.all([
      profileService.getMembership().catch(() => null),
      profileService.getNotifications().catch(() => []),
      profileService.getTickets().catch(() => []),
    ]);
    set({
      membership,
      notifications: Array.isArray(notifications) ? notifications : [],
      tickets: Array.isArray(tickets) ? tickets : [],
    });
  },
  startPolling: () => {
    if (timer) return;
    void get().refreshGlobal();
    timer = setInterval(() => {
      void get().refreshGlobal();
    }, 60 * 1000);
    set({ polling: true });
  },
  stopPolling: () => {
    if (timer) clearInterval(timer);
    timer = null;
    set({ polling: false });
  },
}));

