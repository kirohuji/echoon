import type {} from '@mui/lab/themeAugmentation';
import type {} from '@mui/x-tree-view/themeAugmentation';
import type {} from '@mui/x-data-grid/themeAugmentation';
import type {} from '@mui/x-date-pickers/themeAugmentation';
import type {} from '@mui/material/themeCssVarsAugmentation';

import CssBaseline from '@mui/material/CssBaseline';
// import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { Experimental_CssVarsProvider as CssVarsProvider } from '@mui/material/styles';

import { useTranslate } from 'src/locales';

import { defaultSettings } from 'src/components/settings/config-settings';
import { createTheme } from './create-theme';
import { schemeConfig } from './color-scheme-script';

// ----------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
};

export function ThemeProvider({ children }: Props) {
  const { currentLang } = useTranslate();

  const theme = createTheme(currentLang?.systemValue, defaultSettings);

  return (
    <CssVarsProvider
      theme={theme}
      defaultMode={schemeConfig.defaultMode as 'light' | 'dark' | 'system'}
      modeStorageKey={schemeConfig.modeStorageKey}
    >
      <CssBaseline />
      {children}
    </CssVarsProvider>
  );
}
