import { LayoutSection } from '../core/layout-section';
import { Main } from './main';
import { MainSidebar } from './sidebar';

export type MainLayoutProps = {
  children: React.ReactNode;
};

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <LayoutSection
      sidebarSection={<MainSidebar />}
    >
      <Main isNavHorizontal={false}>{children}</Main>
    </LayoutSection>
  )
}