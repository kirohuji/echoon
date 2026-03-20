import { Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './auth/auth-provider';
import { RequireAuth } from './auth/require-auth';
import { LoginPage } from './pages/login-page';
import { ReadingPlayerPage } from './pages/reading-player-page';

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/reading/1" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/reading/:id"
          element={
            <RequireAuth>
              <ReadingPlayerPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<div className="p-4 text-sm">Not Found</div>} />
      </Routes>
    </AuthProvider>
  );
}

