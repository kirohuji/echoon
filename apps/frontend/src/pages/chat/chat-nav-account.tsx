import { useState, useCallback } from 'react';
import { Stack, Avatar, Divider, Tooltip, MenuItem, InputBase, IconButton, ListItemText, Badge, Select, badgeClasses } from '@mui/material';
// hooks
import { useAuthContext } from 'src/auth/hooks';
// components
import { Iconify } from 'src/components/iconify';
import CustomPopover, { usePopover } from 'src/components/custom-popover';

// ----------------------------------------------------------------------
export default function ChatNavAccount () {
  const { user } = useAuthContext();

  const popover = usePopover();

  const [status, setStatus] = useState('online');

  const handleChangeStatus = useCallback((event: any) => {
    setStatus(event.target.value);
  }, []);

  return (
    <>
      <Badge variant={status as any} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Avatar
          src={user?.photoURL}
          alt={user?.displayName}
          onClick={popover.onOpen}
          sx={{ cursor: 'pointer', width: 48, height: 48 }}
        />
      </Badge>

      <CustomPopover open={popover.open} onClose={popover.onClose} arrow="top-left" sx={{ p: 0 }} hiddenArrow={false}>
        <Stack
          direction="row"
          alignItems="center"
          spacing={2}
          sx={{
            py: 2,
            pr: 1,
            pl: 2.5,
          }}
        >
          <ListItemText
            primary={user?.displayName}
            secondary={user?.email}
            secondaryTypographyProps={{ component: 'span' }}
          />
          {
            false &&
            <Tooltip title="Log out">
              <IconButton color="error">
                <Iconify icon="ic:round-power-settings-new" />
              </IconButton>
            </Tooltip>
          }
        </Stack>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <Stack sx={{ p: 1 }}>
          <MenuItem>
            <Badge
              variant={status as any}
              sx={{
                [`& .${badgeClasses.badge}`]: {
                  position: 'static',
                  m: 0.75,
                  width: 12,
                  height: 12,
                  flexShrink: 0,
                },
              }}
            />

            <Select
              native
              fullWidth
              value={status}
              onChange={handleChangeStatus}
              input={<InputBase sx={{ pl: 2 }} />}
              inputProps={{
                sx: { textTransform: 'capitalize' },
              }}
            >
              {['online', 'alway', 'busy', 'offline'].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </MenuItem>
          {
            false &&
            <MenuItem>
              <Iconify icon="solar:user-id-bold" width={24} />
              Profile
            </MenuItem>
          }
          {
            false &&
            <MenuItem>
              <Iconify icon="eva:settings-2-fill" width={24} />
              Settings
            </MenuItem>
          }
        </Stack>
      </CustomPopover>
    </>
  );
}
