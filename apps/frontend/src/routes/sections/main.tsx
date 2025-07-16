
import { Suspense } from 'react';

import { Outlet } from 'react-router-dom';

import { CONFIG } from 'src/config-global';

import { MainLayout } from 'src/layouts/main';

import { LoadingScreen } from 'src/components/loading-screen';

import { AuthGuard } from 'src/auth/guard';
import ChatPage from 'src/pages/chat';
import ReadingView from 'src/pages/reading/views/reading-view';

const layoutContent = (
  <MainLayout>
    <Suspense fallback={<LoadingScreen />}>
      <Outlet />
    </Suspense>
  </MainLayout>
);

export const mainRoutes = [
  {
    path: 'main',
    element: CONFIG.auth.skip ? <>{layoutContent}</> : <AuthGuard>{layoutContent}</AuthGuard>,
    children: [
      {
        path: 'chat',
        children: [
          { element: <ChatPage />, index: true },
        ]
      },
      {
        path: 'reading',
        children: [
          { element: <ReadingView />, index: true },
        ]
      }
    ]
  },
];
