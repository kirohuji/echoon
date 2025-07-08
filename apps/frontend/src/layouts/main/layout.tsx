import type { Breakpoint } from '@mui/material/styles';
import { LayoutSection } from '../core/layout-section';
import { MainFooter } from './foot';
import { Main } from './main';

export type MainLayoutProps = {
  children: React.ReactNode;
};

export function MainLayout({ children }: MainLayoutProps) {
  const layoutQuery: Breakpoint = 'md';

  return (
    <LayoutSection
      footerSection={<MainFooter layoutQuery={layoutQuery} />}
    >
      <Main isNavHorizontal={false}>{children}</Main>
    </LayoutSection>
  )
}