
import { useState, useEffect, useCallback } from 'react';
// @mui
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
// hooks
import { useResponsive } from 'src/hooks/use-responsive';
// components
import { Iconify } from 'src/components/iconify';
//
import { useBoolean } from 'src/hooks/use-boolean';
import { useCollapseNav } from './hooks';

import ChatRoomAttachments from './chat-room-attachments';

// ----------------------------------------------------------------------

const NAV_WIDTH = 240;

export default function ChatRoom({ participants, conversation, messages }: { participants: any[], conversation: any, messages: any[] }) {
  const historyMessagesLoading = useBoolean(true);
  const [date, setDate] = useState(new Date());
  const [historyMessages, setHistoryMessages] = useState([]);
  const [attachments, setAttachments] = useState([]);

  const theme = useTheme();

  const lgUp = useResponsive('up', 'lg');

  const {
    collapseDesktop,
    onCloseDesktop,
    onCollapseDesktop,
    //
    openMobile,
    onOpenMobile,
    onCloseMobile,
  } = useCollapseNav();

  const fetchAttachments = useCallback(async () => {
    // const response = await messagingService.getConversationMessagesAttachmentsById({
    //   _id: conversation._id,
    // });
    // setAttachments(uniq(flatten(response)));
  }, []);

  useEffect(() => {
    if (!lgUp) {
      onCloseDesktop();
    }
    fetchAttachments();
  }, [onCloseDesktop, lgUp, fetchAttachments]);

  useEffect(() => {
    if (openMobile) {
      fetchAttachments();
    }
  }, [openMobile, fetchAttachments]);

  const handleToggleNav = useCallback(() => {
    if (lgUp) {
      onCollapseDesktop();
    } else {
      onOpenMobile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lgUp]);

  const renderContent = <ChatRoomAttachments attachments={attachments} />;

  const renderToggleBtn = (
    <IconButton
      onClick={handleToggleNav}
      sx={{
        top: 12,
        right: 0,
        zIndex: 9,
        width: 32,
        height: 32,
        borderRight: 0,
        position: 'absolute',
        borderRadius: `12px 0 0 12px`,
        // boxShadow: theme.customShadows.z8,
        bgcolor: theme.palette.background.paper,
        border: `solid 1px ${theme.palette.divider}`,
        '&:hover': {
          bgcolor: theme.palette.background.neutral,
        },
        ...(lgUp && {
          ...(!collapseDesktop && {
            right: NAV_WIDTH,
          }),
        }),
      }}
    >
      {lgUp ? (
        <Iconify
          width={16}
          icon={collapseDesktop ? 'eva:arrow-ios-back-fill' : 'eva:arrow-ios-forward-fill'}
        />
      ) : (
        <Iconify width={16} icon="eva:arrow-ios-back-fill" />
      )}
    </IconButton>
  );

  return (
    <Box sx={{ position: 'relative' }}>
      {participants && participants.length > 0 && renderToggleBtn}

      {lgUp ? (
        <Stack
          sx={{
            height: 1,
            flexShrink: 0,
            width: NAV_WIDTH,
            borderLeft: `solid 1px ${theme.palette.divider}`,
            transition: theme.transitions.create(['width'], {
              duration: theme.transitions.duration.shorter,
            }),
            ...(collapseDesktop && {
              width: 0,
            }),
          }}
        >
          {!collapseDesktop && renderContent}
        </Stack>
      ) : (
        <Drawer
          anchor="right"
          open={openMobile}
          onClose={onCloseMobile}
          slotProps={{
            backdrop: { invisible: true },
          }}
          PaperProps={{
            sx: { width: NAV_WIDTH },
          }}
        >
          {renderContent}
        </Drawer>
      )}
    </Box>
  );
}
