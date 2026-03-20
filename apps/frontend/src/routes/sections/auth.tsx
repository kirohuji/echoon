import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import { SplashScreen } from 'src/components/loading-screen';

import { GuestGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

/** **************************************
 * Jwt
 *************************************** */
const Jwt = {
  SignInPage: lazy(() => import('src/pages/auth/jwt/sign-in')),
  SignUpPage: lazy(() => import('src/pages/auth/jwt/sign-up')),
};

const authJwt = {
  path: 'jwt',
  children: [
    {
      path: 'sign-in',
      element: (
        <GuestGuard>
          <Jwt.SignInPage />
        </GuestGuard>
      ),
    },
    {
      path: 'sign-up',
      element: (
        <GuestGuard>
          <Jwt.SignUpPage />
        </GuestGuard>
      ),
    },
  ],
};


// ----------------------------------------------------------------------

export const authRoutes = [
  {
    path: 'auth',
    element: (
      <Suspense fallback={<SplashScreen />}>
        <Outlet />
      </Suspense>
    ),
    children: [authJwt],
  },
];
