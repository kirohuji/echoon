// @mui
import { menuItemClasses } from '@mui/material/MenuItem';
import Popover from '@mui/material/Popover';
//
import { useTheme } from '@mui/material/styles';
import { getPosition } from './utils';
import { StyledArrow } from './styles';

// ----------------------------------------------------------------------

export default function CustomPopover({
  open,
  children,
  arrow = 'top-right',
  hiddenArrow,
  sx,
  onClose,
  ...other
}: {
  open: any;
  children: any;
  arrow?: any;
  hiddenArrow?: boolean;
  onClose?: any;
  sx?: any;
}) {
  const theme = useTheme();
  const { style, anchorOrigin, transformOrigin } = getPosition(arrow);

  return (
    <Popover
      open={Boolean(open)}
      anchorEl={open}
      onClose={onClose}
      // anchorOrigin={anchorOrigin}
      // transformOrigin={transformOrigin}
      slotProps={{
        paper: {
          sx: {
            width: 'auto',
            overflow: 'inherit',
            ...style,
            [`& .${menuItemClasses.root}`]: {
              '& svg': {
                mr: 2,
                flexShrink: 0,
              },
            },
            ...sx,
          },
        },
      }}
      {...other}
    >
      {!hiddenArrow && <StyledArrow arrow={arrow} theme={theme} />}

      {children}
    </Popover>
  );
}