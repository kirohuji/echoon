import { Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider } from './auth/auth-provider';
import { RequireAuth } from './auth/require-auth';
import { AppLayout } from './layouts/app-layout';
import { LoginPage } from './pages/auth/login-page';
import { RegisterPage } from './pages/auth/register-page';
import { HomePage } from './pages/home/home-page';
import { ProfilePage } from './pages/me/profile-page';
import { NotificationsPage } from './pages/notifications-page';
import { ReadingPlayerPage } from './pages/reading-player-page';
import { PlaceholderPage } from './pages/shared/placeholder-page';

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route path="/home" element={<HomePage />} />
          <Route path="/library" element={<PlaceholderPage title="教材中心" desc="教材管理与加入流程将在此页面持续完善。" />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/me" element={<ProfilePage />} />
          <Route
            path="/me/tickets"
            element={<PlaceholderPage title="我的工单" desc="反馈、追踪和处理记录。" />}
          />
          <Route path="/reading/:id" element={<ReadingPlayerPage />} />
        </Route>
        <Route
          path="*"
          element={
            <div className="p-4 text-sm">
              页面不存在，返回
              <a className="ml-1 text-indigo-600" href="/home">
                首页
              </a>
            </div>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

