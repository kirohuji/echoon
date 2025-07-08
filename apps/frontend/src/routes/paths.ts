import { paramCase } from 'src/utils/change-case';

// ----------------------------------------------------------------------

const ROOTS = {
  AUTH: '/auth'
};

// ----------------------------------------------------------------------

export const paths = {
  root: '/',
  auth: {
    root: ROOTS.AUTH,
    login: `${ROOTS.AUTH}/login`,
    register: `${ROOTS.AUTH}/register`,
    forgotPassword: `${ROOTS.AUTH}/forgot-password`,
    resetPassword: `${ROOTS.AUTH}/reset-password`,
  },
};
