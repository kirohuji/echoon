import type { Theme, SxProps, Breakpoint } from '@mui/material/styles';

// import Alert from '@mui/material/Alert';

// import { useBoolean } from 'src/hooks/use-boolean';

// import { CONFIG } from 'src/config-global';
// import { stylesMode } from 'src/theme/styles';

import { Main } from './main';
import { LayoutSection } from '../core/layout-section';

// ----------------------------------------------------------------------

export type AuthCenteredLayoutProps = {
  sx?: SxProps<Theme>;
  children: React.ReactNode;
};

export function AuthCenteredLayout({ sx, children }: AuthCenteredLayoutProps) {
  // const mobileNavOpen = useBoolean();

  const layoutQuery: Breakpoint = 'md';

  return (
    <LayoutSection>
      <Main layoutQuery={layoutQuery}>{children}</Main>
    </LayoutSection>
  );
}
