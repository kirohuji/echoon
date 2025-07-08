import { Suspense } from 'react';
import { Navigate, useRoutes } from 'react-router-dom';

// import { MainLayout } from 'src/layouts/main';

import { SplashScreen } from 'src/components/loading-screen';

import { authRoutes } from './auth';
import { mainRoutes } from './main';

// ----------------------------------------------------------------------

// const HomePage = lazy(() => import('src/pages/home'));

export function Router() {
  return useRoutes([
    {
      path: '/',
      /**
       * Skip home page
       * element: <Navigate to={CONFIG.auth.redirectPath} replace />,
       */
      element: (
        <Suspense fallback={<SplashScreen />}>
          {/* <MainLayout>
            <HomePage />
          </MainLayout> */}
        </Suspense>
      ),
    },

    // Auth
    ...authRoutes,

    // Main
    ...mainRoutes,

    // No match
    { path: '*', element: <Navigate to="/404" replace /> },
  ]);
}
