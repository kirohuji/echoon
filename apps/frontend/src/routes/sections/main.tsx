
import { Suspense } from 'react';

import { Outlet } from 'react-router-dom';

import { CONFIG } from 'src/config-global';

import { AuthGuard } from 'src/auth/guard';
import UsersPage from 'src/pages/users';
import ConversationsPage from 'src/pages/conversations';
import ConversationDetailPage from 'src/pages/conversations/detail';

const layoutContent = (
  <Suspense fallback={<div className="p-4 text-sm text-gray-500">Loading...</div>}>
    <Outlet />
  </Suspense>
);

export const mainRoutes = [
  {
    path: 'main',
    element: CONFIG.auth.skip ? <>{layoutContent}</> : <AuthGuard>{layoutContent}</AuthGuard>,
    children: [
      {
        path: 'users',
        element: <UsersPage />,
      },
      {
        path: 'conversations',
        children: [
          { element: <ConversationsPage />, index: true },
          { element: <ConversationDetailPage />, path: ':id' },
        ],
      },
    ]
  },
];
