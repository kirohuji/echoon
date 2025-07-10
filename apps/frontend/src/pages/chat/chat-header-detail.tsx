import { forwardRef } from 'react';
// @mui
import Stack from '@mui/material/Stack';
import Badge from '@mui/material/Badge';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import AvatarGroup, { avatarGroupClasses } from '@mui/material/AvatarGroup';
import Dialog from '@mui/material/Dialog';
import Slide from '@mui/material/Slide';
// hooks
import { useBoolean } from 'src/hooks/use-boolean';

// utils
import { fToNow } from 'src/utils/format-time';
// components
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const Transition = forwardRef((props: any, ref: any) => <Slide direction="up" ref={ref} {...props} />);
export default function ChatHeaderDetail({ participants }: { participants: any[] }) {
  const dialog = useBoolean();
  const group = participants.length > 2;

  const singleParticipant = participants[0] || {};

  const renderGroup = (
    <AvatarGroup
      max={3}
      sx={{
        [`& .${avatarGroupClasses.avatar}`]: {
          width: 32,
          height: 32,
        },
      }}
    >
      {participants.map((participant: any) => (
        <Avatar key={participant._id} alt={participant.username} src={participant.photoURL} />
      ))}
    </AvatarGroup>
  );

  const renderSingle = (
    <Stack flexGrow={1} direction="row" alignItems="center" spacing={2}>
      <Badge
        variant={singleParticipant.status as any}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Avatar src={singleParticipant.photoURL} alt={singleParticipant.username} />
      </Badge>

      <ListItemText
        primary={`${singleParticipant.username || '对话教练'}`}
        secondary={
          singleParticipant.status === 'offline'
            ? fToNow(singleParticipant.lastActivity)
            : singleParticipant.status
        }
        secondaryTypographyProps={{
          component: 'span',
          ...(singleParticipant.status !== 'offline' && {
            textTransform: 'capitalize',
          }),
        }}
      />
    </Stack>
  );
  return (
    <>
      {group ? renderGroup : renderSingle}

      <Stack flexGrow={1} />

      {false && (
        <div>
          <IconButton>
            <Iconify icon="solar:phone-bold" />
          </IconButton>
          <IconButton
            onClick={() => {
              dialog.onTrue();
            }}
          >
            <Iconify icon="solar:videocamera-record-bold" />
          </IconButton>
          <IconButton>
            <Iconify icon="eva:more-vertical-fill" />
          </IconButton>
        </div>
      )}
      <Dialog
        fullScreen
        open={dialog.value}
        onClose={dialog.onFalse}
        TransitionComponent={Transition}
      >
        <IconButton onClick={() => {}}>
          <Iconify icon="solar:videocamera-record-bold" />
        </IconButton>

        <IconButton
          onClick={() => {
            dialog.onFalse();
          }}
        >
          <Iconify icon="solar:phone-bold" />
        </IconButton>
      </Dialog>
    </>
  );
}
