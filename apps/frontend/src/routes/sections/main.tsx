
import { Suspense } from 'react';

import { Outlet } from 'react-router-dom';

import { CONFIG } from 'src/config-global';

import { AuthGuard } from 'src/auth/guard';
import { MainSidebar } from 'src/layouts/main/sidebar';
import UsersPage from 'src/pages/users';
import ConversationsPage from 'src/pages/conversations';
import ConversationDetailPage from 'src/pages/conversations/detail';
import DocumentLibraryPage from 'src/pages/document-library';
import StudySetCardsPage from 'src/pages/study-sets/cards';
import StudySetDetailPage from 'src/pages/study-sets/detail';
import StudySetLearnPage from 'src/pages/study-sets/learn';
import StudySetListPage from 'src/pages/study-sets';
import StudySetPracticePage from 'src/pages/study-sets/practice';
import TagsPage from 'src/pages/tags';
import OpsCenterPage from 'src/pages/ops-center';

const layoutContent = (
  <div className="flex h-screen overflow-hidden bg-gray-50">
    <MainSidebar />
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
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
      {
        path: 'study-sets',
        children: [
          { index: true, element: <StudySetListPage /> },
          { path: ':id/cards', element: <StudySetCardsPage /> },
          { path: ':id/learn', element: <StudySetLearnPage /> },
          { path: ':id/practice', element: <StudySetPracticePage /> },
          { path: ':id', element: <StudySetDetailPage /> },
        ],
      },
      {
        path: 'ops-center',
        element: <OpsCenterPage />,
      },
    ]
  },
];
