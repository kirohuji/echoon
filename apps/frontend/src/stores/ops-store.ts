import { create } from 'zustand';
import { membershipService, notificationService, ticketService } from '../composables/context-provider';

type OpsState = {
  memberships: any[];
  notifications: any[];
  tickets: any[];
  loading: boolean;
  polling: boolean;
  refresh: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
};

let timer: ReturnType<typeof setInterval> | null = null;

export const useOpsStore = create<OpsState>((set, get) => ({
  memberships: [],
  notifications: [],
  tickets: [],
  loading: false,
  polling: false,
  refresh: async () => {
    set({ loading: true });
    try {
      const [mRes, nRes, tRes] = await Promise.all([
        membershipService.listAll(),
        notificationService.listAll(),
        ticketService.listAll(),
      ]);
      set({
        memberships: mRes?.data ?? [],
        notifications: nRes?.data ?? [],
        tickets: tRes?.data ?? [],
      });
    } finally {
      set({ loading: false });
    }
  },
  startPolling: () => {
    if (timer) return;
    void get().refresh();
    timer = setInterval(() => {
      void get().refresh();
    }, 60 * 1000);
    set({ polling: true });
  },
  stopPolling: () => {
    if (timer) clearInterval(timer);
    timer = null;
    set({ polling: false });
  },
}));

