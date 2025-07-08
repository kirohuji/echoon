import 'src/global.css';
import { Router } from 'src/routes/sections';

import { useScrollToTop } from 'src/hooks/use-scroll-to-top';
import { LocalizationProvider } from 'src/locales';
import { I18nProvider } from 'src/locales/i18n-provider';
import { AuthProvider } from 'src/auth/context/jwt';
import { MotionLazy } from 'src/components/animate/motion-lazy';


// ----------------------------------------------------------------------

export default function App() {
  useScrollToTop();

  return <I18nProvider>
    <LocalizationProvider>
      <AuthProvider>
        <MotionLazy>
          <Router />
        </MotionLazy>
      </AuthProvider>
    </LocalizationProvider>
  </I18nProvider>;
}
