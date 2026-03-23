
import { Suspense } from 'react';

import { Outlet } from 'react-router-dom';

import { CONFIG } from 'src/config-global';

import { AuthGuard } from 'src/auth/guard';
import { MainSidebar } from 'src/layouts/main/sidebar';
import UsersPage from 'src/pages/users';
import ConversationsPage from 'src/pages/conversations';
import ConversationDetailPage from 'src/pages/conversations/detail';
import DocumentLibraryPage from 'src/pages/document-library';
import TagsPage from 'src/pages/tags';

const layoutContent = (
  <div className="flex min-h-screen bg-gray-50">
    <MainSidebar />
    <div className="min-w-0 flex-1">
      <Suspense fallback={<div className="p-4 text-sm text-gray-500">Loading...</div>}>
        <Outlet />
      </Suspense>
    </div>
  </div>
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
      {
        path: 'document-library',
        element: <DocumentLibraryPage />,
      },
      {
        path: 'tags',
        element: <TagsPage />,
      },
    ]
  },
];
