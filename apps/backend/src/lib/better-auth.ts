import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { APIError } from 'better-auth/api';
import { phoneNumber } from 'better-auth/plugins';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const googleConfigured =
  !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
const githubConfigured =
  !!process.env.GITHUB_CLIENT_ID && !!process.env.GITHUB_CLIENT_SECRET;

export const auth = betterAuth({
  basePath: '/api/auth',
  secret:
    process.env.BETTER_AUTH_SECRET ??
    'dev-better-auth-secret-min-32-chars-long-key',
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  trustedOrigins: (
    process.env.FRONTEND_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    ...(googleConfigured
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
          },
        }
      : {}),
    ...(githubConfigured
      ? {
          github: {
            clientId: process.env.GITHUB_CLIENT_ID as string,
            clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
          },
        }
      : {}),
  },
  user: {
    additionalFields: {
      username: {
        type: 'string',
        required: false,
      },
      status: {
        type: 'number',
        required: false,
        defaultValue: 1,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          if (!user?.id) return;
          await prisma.profile.upsert({
            where: { id: user.id },
            create: { id: user.id },
            update: {},
          });
        },
      },
    },
    session: {
      create: {
        before: async (data) => {
          const row = await prisma.user.findUnique({
            where: { id: data.userId },
          });
          if (!row || row.status !== 1) {
            throw APIError.fromStatus('FORBIDDEN', {
              message: '账号已被禁用或不存在',
            });
          }
        },
      },
    },
  },
  plugins: [
    phoneNumber({
      sendOTP: () => {
        // Hook for SMS; do not await per better-auth hardening guidance.
        void 0;
      },
    }),
  ],
});

export { prisma as betterAuthPrisma };
