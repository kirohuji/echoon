import { create } from 'zustand';
import { profileService, type MembershipDto, type NotificationDto, type TicketDto } from '../features/profile/profile-service';

type AppState = {
  user: any | null;
  membership: MembershipDto | null;
  notifications: NotificationDto[];
  tickets: TicketDto[];
  setUser: (u: any | null) => void;
  /** 登录后一次性拉取会员、通知、工单（无周期轮询） */
  bootstrapProfileData: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
};

export const useAppStore = create<AppState>((set) => ({
  user: null,
  membership: null,
  notifications: [],
  tickets: [],
  setUser: (u) => set({ user: u }),
  bootstrapProfileData: async () => {
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
  refreshNotifications: async () => {
    const notifications = await profileService.getNotifications().catch(() => []);
    set({
      notifications: Array.isArray(notifications) ? notifications : [],
    });
  },
}));
