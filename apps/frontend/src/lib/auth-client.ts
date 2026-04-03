import { createAuthClient } from 'better-auth/client';
import { phoneNumberClient } from 'better-auth/client/plugins';

import { CONFIG } from 'src/config-global';

export const authClient = createAuthClient({
  baseURL: CONFIG.site.authBaseUrl,
  fetchOptions: {
    credentials: 'include',
  },
  plugins: [phoneNumberClient()],
});
