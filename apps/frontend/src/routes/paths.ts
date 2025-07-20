// import { paramCase } from 'src/utils/change-case';

// ----------------------------------------------------------------------

const ROOTS = {
  AUTH: '/auth'
};

// ----------------------------------------------------------------------

export const paths = {
  root: '/',
  auth: {
    root: ROOTS.AUTH,
    jwt: {
      signIn: `${ROOTS.AUTH}/jwt/sign-in`,
      signUp: `${ROOTS.AUTH}/jwt/sign-up`,
    },
  },
  main: {
    chat: {
      root: '/main/chat'
    },
    reading: {
      root: '/main/reading',
      create: 'reading/create',
      edit: 'reading/edit/:id'
    }
  }
};
