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
    },
    users: {
      root: '/main/users',
    },
    conversations: {
      root: '/main/conversations',
    },
    documentLibrary: {
      root: '/main/document-library',
    },
    tags: {
      root: '/main/tags',
    },
    studySets: {
      root: '/main/study-sets',
      detail: (id: string) => `/main/study-sets/${id}`,
      study: (id: string) => `/main/study-sets/${id}/study`,
    },
  }
};
