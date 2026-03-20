import 'src/global.css';
import { Router } from 'src/routes/sections';

import { useScrollToTop } from 'src/hooks/use-scroll-to-top';
import { AuthProvider } from 'src/auth/context/jwt';
import { MotionLazy } from 'src/components/animate/motion-lazy';

// ----------------------------------------------------------------------

export default function App() {
  useScrollToTop();

  return (
    <AuthProvider>
      <MotionLazy>
        <Router />
      </MotionLazy>
    </AuthProvider>
  )
}
