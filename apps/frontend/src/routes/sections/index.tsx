import { Navigate, useRoutes } from 'react-router-dom';
import { CONFIG } from 'src/config-global';
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

    // No match
    { path: '*', element: <Navigate to="/404" replace /> },
  ]);
}
