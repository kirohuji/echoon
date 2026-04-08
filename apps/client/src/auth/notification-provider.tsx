import { useEffect } from 'react';
import { connectNotificationsRealtime, disconnectNotificationsRealtime } from '../lib/notifications-realtime';
import { useAppStore } from '../store/app-store';
import { useAuth } from './auth-provider';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { authenticated, loading } = useAuth();
  const refreshNotifications = useAppStore((s) => s.refreshNotifications);

  useEffect(() => {
    if (loading) return;

    if (!authenticated) {
      disconnectNotificationsRealtime();
      return;
    }

    connectNotificationsRealtime(() => {
      void refreshNotifications();
    });

    return () => {
      disconnectNotificationsRealtime();
    };
  }, [authenticated, loading, refreshNotifications]);

  return <>{children}</>;
}
