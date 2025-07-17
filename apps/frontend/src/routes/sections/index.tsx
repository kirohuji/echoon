import { Navigate, useRoutes } from 'react-router-dom';
import { CONFIG } from 'src/config-global';
import ChatPage from 'src/pages/chat';
import ReturnLayout from 'src/layouts/return/ReturnLayout';
import Reading from 'src/pages/reading/detail';

import { authRoutes } from './auth';
import { mainRoutes } from './main';

// ----------------------------------------------------------------------

// const HomePage = lazy(() => import('src/pages/home'));

export function Router() {
  return useRoutes([
    {
      path: '/',
      element: <Navigate to={CONFIG.auth.redirectPath} replace />,
    },

    // Auth
    ...authRoutes,

    // Main
    ...mainRoutes,

    {
      element: <ReturnLayout />,
      children: [
        { 
          path: 'chat',
          element: <ChatPage />
        },
        {
          path: 'reading',
          children: [
            {
              path: ':id',
              element: <Reading />
            }
          ]
        }
      ],
    },

    // No match
    { path: '*', element: <Navigate to="/404" replace /> },
  ]);
}
