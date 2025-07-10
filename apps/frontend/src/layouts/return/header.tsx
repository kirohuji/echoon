import { useTheme, type SxProps, type Theme } from '@mui/material/styles';
import { AppBar, Toolbar, Box, IconButton } from '@mui/material';
import { HEADER } from 'src/config-global'

// routes
import { useRouter, usePathname } from 'src/routes/hooks';
import { useResponsive } from 'src/hooks/use-responsive';
import { useAuthContext } from 'src/auth/hooks';
// components
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export default function Header({ isOffset }: { isOffset: boolean }) {
  const { user } = useAuthContext();
  const theme = useTheme();
  const router = useRouter();
  const mdUp = useResponsive('up', 'md');
  const pathname = usePathname();
  // const searchParams = useSearchParams();

  return (
    <AppBar color="transparent" sx={{ boxShadow: 0 }} position={mdUp ? 'static' : 'absolute'}>
      <Toolbar
        sx={{
          height: {
            xs: HEADER.H_MOBILE,
            md: HEADER.H_MAIN_DESKTOP,
          },
          transition: theme.transitions.create(['height', 'background-color'], {
            easing: theme.transitions.easing.easeInOut,
            duration: theme.transitions.duration.shorter,
          }),
          ...(isOffset && {
            // ...bgBlur({ color: theme.palette.background.default }),
            height: {
              md: HEADER.H_MAIN_DESKTOP - 16,
            },
          }),
          // position: 'relative',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <div>{pathname === '/chat' && 'Chat'}</div>
        <div
          style={{
            position: 'absolute',
            top: '11px',
            left: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <IconButton
            sx={{ mr: 0, color: 'text.primary' }}
            onClick={() => {
              router.back();
            }}
          >
            <Iconify icon="eva:arrow-ios-back-fill" />
          </IconButton>
        </div>
      </Toolbar>

      {isOffset && <Shadow />}
    </AppBar>
  );
}

// ----------------------------------------------------------------------

function Shadow({ sx, ...other }: { sx?: SxProps<Theme> }) {
  return (
    <Box
      sx={{
        left: 0,
        right: 0,
        bottom: 0,
        height: 24,
        zIndex: -1,
        m: 'auto',
        borderRadius: '50%',
        position: 'absolute',
        width: `calc(100% - 48px)`,
        boxShadow: (theme) => theme.customShadows.z8,
        ...sx,
      }}
      {...other}
    />
  );
}
