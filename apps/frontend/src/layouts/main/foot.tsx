import { useState, useEffect } from 'react';
import type { Breakpoint } from '@mui/material/styles';
import Paper from '@mui/material/Paper';
import BottomNavigation from '@mui/material/BottomNavigation';
import { Link } from 'react-router-dom';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import { usePathname } from 'src/routes/hooks';
import { Iconify } from 'src/components/iconify';

export type FooterProps = {
  layoutQuery: Breakpoint;
};

const bottomNavigationAction = [
  {
    label: 'Chat',
    to: '/main/chat',
    icon: <Iconify width={32} icon="solar:hashtag-chat-outline" />
  },
  {
    label: 'Reading',
    to: '/main/reading/list',
    icon: <Iconify width={32} icon="solar:music-library-line-duotone" />
  },
  {
    label: 'Settings',
    to: '/main/settings',
    icon: <Iconify width={32} icon="solar:settings-broken" />
  }
]

export function MainFooter({ layoutQuery }: FooterProps) {

  const [bottomNavigationActionValue, setBottomNavigationActionValue] = useState(0)

  const pathname = usePathname();

  useEffect(() => {
    const index = bottomNavigationAction.findIndex((item) => item.to === pathname);
    setBottomNavigationActionValue(index);
  }, [pathname]);

  return (
    <Paper
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        background: 'none',
      }}
      elevation={5}
      className="bottom-navigation"
    >
      <BottomNavigation
        id="bottom-navigation"
        value={bottomNavigationActionValue}
        onChange={(e, newValue) => {
          setBottomNavigationActionValue(newValue)
        }}
      >
        {bottomNavigationAction.map((item) => (
          <BottomNavigationAction key={item.label} component={Link} sx={{ pt: 0, opacity: 1 }} {...item} />
        ))}
      </BottomNavigation>
    </Paper>
  )
}