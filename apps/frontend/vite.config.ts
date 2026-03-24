import path from 'path';
import checker from 'vite-plugin-checker';
import { loadEnv, defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

// ----------------------------------------------------------------------

const PORT = 8080;

const env = loadEnv('all', process.cwd());
const basePath = env.VITE_BASE_PATH && env.VITE_BASE_PATH.trim().length > 0
  ? env.VITE_BASE_PATH
  : '/';

export default defineConfig({
  base: basePath,
  plugins: [
    tailwindcss(),
    checker({
      typescript: true,
      eslint: {
        lintCommand:
          'eslint "./src/app.tsx" "./src/main.tsx" "./src/vite-env.d.ts" "./src/routes/**/*.{js,jsx,ts,tsx}" "./src/auth/context/**/*.{js,jsx,ts,tsx}" "./src/auth/hooks/**/*.{js,jsx,ts,tsx}" "./src/auth/guard/auth-guard.tsx" "./src/auth/guard/guest-guard.tsx" "./src/pages/users/**/*.{js,jsx,ts,tsx}" "./src/pages/conversations/**/*.{js,jsx,ts,tsx}" "./src/pages/auth/jwt/**/*.{js,jsx,ts,tsx}" "./src/components/ui/**/*.{js,jsx,ts,tsx}" "./src/components/loading-screen/**/*.{js,jsx,ts,tsx}" "./src/components/animate/motion-lazy.tsx" "./src/composables/**/*.{js,jsx,ts,tsx}" "./src/modules/base.ts" "./src/modules/auth.ts" "./src/modules/conversation.ts" "./src/modules/document.ts" "./src/modules/user.ts" "./src/hooks/use-scroll-to-top.ts" "./src/hooks/use-set-state.ts" "./src/utils/axios.ts" "./src/utils/helper.ts" "./src/utils/storage-available.ts" "./src/config-global.ts" "./src/routes/paths.ts"',
      },
      overlay: {
        position: 'tl',
        initialIsOpen: false,
      },
    }),
  ],
  resolve: {
    alias: [
      {
        find: /^~(.+)/,
        replacement: path.join(process.cwd(), 'node_modules/$1'),
      },
      {
        find: /^src(.+)/,
        replacement: path.join(process.cwd(), 'src/$1'),
      },
    ],
  },
  server: { port: PORT, host: true },
  preview: { port: PORT, host: true },
});
