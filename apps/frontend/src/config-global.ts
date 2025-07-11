import { paths } from 'src/routes/paths';

import packageJson from '../package.json';

// ----------------------------------------------------------------------

export type ConfigValue = {
  site: {
    name: string;
    serverUrl: string;
    assetURL: string;
    basePath: string;
    version: string;
    pipecatUrl: string;
  };
  auth: {
    method: 'jwt' | 'amplify' | 'firebase' | 'supabase' | 'auth0';
    skip: boolean;
    redirectPath: string;
  };
};

// ----------------------------------------------------------------------

export const CONFIG: ConfigValue = {
  site: {
    name: 'Minimals',
    serverUrl: import.meta.env.VITE_SERVER_URL ?? '',
    assetURL: import.meta.env.VITE_ASSET_URL ?? '',
    basePath: import.meta.env.VITE_BASE_PATH ?? '',
    version: packageJson.version,
    pipecatUrl: import.meta.env.VITE_PIPETCAT_URL ?? '',
  },
  /**
   * Auth
   * @method jwt | amplify | firebase | supabase | auth0
   */
  auth: {
    method: 'jwt',
    skip: false,
    redirectPath: paths.main.chat.root,
  }
};

export const HEADER = {
  H_MOBILE: 64,
  H_MAIN_DESKTOP: 88,
  H_DASHBOARD_DESKTOP: 92,
  H_DASHBOARD_DESKTOP_OFFSET: 92 - 32,
};