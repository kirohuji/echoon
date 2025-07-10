import { Outlet } from 'react-router-dom';
import { LayoutSection } from '../core/layout-section';
// config
// @mui
import Header from './header';

// ----------------------------------------------------------------------

export default function ReturnLayout() {
  return (
    <LayoutSection
      headerSection={<Header isOffset={false} />}
    >
      <Outlet />
    </LayoutSection>
  );
}
