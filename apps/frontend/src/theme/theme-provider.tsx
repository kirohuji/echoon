import type {} from '@mui/lab/themeAugmentation';
import type {} from '@mui/x-tree-view/themeAugmentation';
import type {} from '@mui/x-data-grid/themeAugmentation';
import type {} from '@mui/x-date-pickers/themeAugmentation';
import type {} from '@mui/material/themeCssVarsAugmentation';

import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
// import { Experimental_CssVarsProvider as CssVarsProvider } from '@mui/material/styles';

import { useTranslate } from 'src/locales';

import { createTheme } from './create-theme';
// import { schemeConfig } from './color-scheme-script';

// ----------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
};

export function ThemeProvider({ children }: Props) {
  const { currentLang } = useTranslate();

  const theme = createTheme(currentLang?.systemValue);

  return (
    <MuiThemeProvider
      theme={theme}
      // defaultMode={schemeConfig.defaultMode}
      // modeStorageKey={schemeConfig.modeStorageKey}
    >
      <CssBaseline />

    </MuiThemeProvider>
  );
}
