
import { useCallback } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
// @mui
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
// hooks
import { useAuthContext } from 'src/auth/hooks';

import CircularProgress from '@mui/material/CircularProgress';
// components
import Markdown from 'src/components/markdown';
import { Iconify } from 'src/components/iconify';
import FileThumbnail from 'src/components/file-thumbnail';

//
import { zhCN } from 'date-fns/locale';

import { usePipecatClient } from "@pipecat-ai/client-react";
import { pipecatService } from 'src/composables/context-provider';
import { useGetMessage } from './hooks';


// ----------------------------------------------------------------------

export default function ChatMessageItem({ message, participants, onOpenLightbox }: { message: any, participants: any[], onOpenLightbox: (body: string) => void }) {
  const { user } = useAuthContext();

  const { me, senderDetails, hasImage } = useGetMessage({
    message,
    participants,
    currentUserId: user?.id,
  });

  const pipecatClient = usePipecatClient();

  const { username, photoURL } = senderDetails;

  const { body, attachments, contentType, createdAt, isLoading, isFailure } = message;


  const renderInfo = (
    <Typography
      noWrap
      variant="caption"
      sx={{
        mb: 1,
        color: 'text.disabled',
        ...(!me && {
          mr: 'auto',
        }),
      }}
    >
      {!me && `${username},`} &nbsp;
      {formatDistanceToNowStrict(new Date(createdAt), {
        addSuffix: true,
        locale: zhCN,
      })}
    </Typography>
  );

  const handleSendWsAudio = useCallback(async () => {
    try {
      pipecatClient?.sendClientMessage('tts', { text: message.body });
  } catch (error) {
      console.error("Error sending message to server:", error);
  }
  
  }, [message.body, pipecatClient]);  

  const handleSendAudio = useCallback(async () => {
    await pipecatService.tts(pipecatClient, {
      "conversation_id": "cmcsu3kuh00018yc8fdyeyyf9",
      "bot_model": "gemini2_minimax",
      "user_id": "kiro",
      "bot_prompt": "你是名为 Lumi 的 AI 角色，拥有温和而坚定的性格。",
      actions: [
        {
          "label": "rtvi-ai",
          "type": "action",
          "data": {
            service: "tts",
            action: "say",
            arguments: [
              {
                name: "text",
                value: message.body,
              },
            ],
          },
          "id": "440fc1db"
        }
      ]
    })
  }, [message.body, pipecatClient]);


  const renderBodyContent = ({ bodyContent, type }: { bodyContent: string, type: string }) => {
    if (bodyContent === '') {
      return (
        <Stack spacing={0} direction="row" alignItems="center" sx={{ minWidth: 24 }}>
          <CircularProgress size={12} />
        </Stack>
      );
    }
    switch (type) {
      case 'text':
        if (bodyContent) {
          return me ? <Markdown sx={{}} children={bodyContent} /> : <Markdown sx={{}} children={bodyContent} />;
        }
        return ''

      case 'mp3':
        return (
          <Stack spacing={1} direction="row" alignItems="center">
            <FileThumbnail file="audio" tooltip={false} imageView={false} onDownload={() => { }} sx={undefined} imgSx={undefined} />
            <Typography variant="body2">{attachments[0]?.name}</Typography>
          </Stack>
        );
      default:
        return (
          <Stack spacing={1} direction="row" alignItems="center">
            <FileThumbnail file={type} tooltip={false} imageView={false} onDownload={() => { }} sx={undefined} imgSx={undefined} />
            <Typography
              sx={{
                whiteSpace: 'nowrap' /* 防止文本换行 */,
                overflow: 'hidden' /* 隐藏溢出的文本 */,
                textOverflow: 'ellipsis' /* 显示省略号 */,
              }}
              variant="body2"
            >
              {attachments[0]?.name}
            </Typography>
          </Stack>
        );
    }
  };

  const renderBody = (
    <Stack
      sx={{
        p: 1.5,
        minWidth: 48,
        maxWidth: 'calc(100vw - 120px)',
        borderRadius: 1,
        typography: 'body2',
        bgcolor: 'background.neutral',
        ...(me && {
          color: 'grey.800',
          bgcolor: 'primary.lighter',
        }),
        ...(hasImage && {
          p: 0,
          bgcolor: 'transparent',
        }),
      }}
    >
      {hasImage ? (
        <Box
          component="img"
          alt="attachment"
          src={body}
          onClick={() => onOpenLightbox(body)}
          sx={{
            minHeight: 220,
            borderRadius: 1.5,
            cursor: 'pointer',
            '&:hover': {
              opacity: 0.9,
            },
          }}
        />
      ) : (
        renderBodyContent({
          bodyContent: body,
          type: contentType,
        })
      )}
    </Stack>
  );

  const renderActions = (
    <Stack
      direction="row"
      className="message-actions"
      sx={{
        pt: 0.5,
        opacity: 0,
        top: '100%',
        left: 0,
        position: 'absolute',
        transition: (theme) =>
          theme.transitions.create(['opacity'], {
            duration: theme.transitions.duration.shorter,
          }),
        ...(me && {
          left: 'unset',
          right: 0,
        }),
      }}
    >
      {
        !me && (
          <>
            <IconButton size="small" onClick={() => handleSendAudio()}>
              <Iconify icon="solar:soundwave-broken" width={16} />
            </IconButton>
            <IconButton size="small" onClick={() => handleSendWsAudio()}>
              <Iconify icon="solar:microphone-bold" width={16} />
            </IconButton>
          </>
        )
      }
      {me && (
        <IconButton size="small">
          <Iconify icon="solar:reply-bold" width={16} />
        </IconButton>
      )}
      {false && (
        <IconButton size="small">
          <Iconify icon="eva:smiling-face-fill" width={16} />
        </IconButton>
      )}
      {false && (
        <IconButton size="small">
          <Iconify icon="solar:trash-bin-trash-bold" width={16} />
        </IconButton>
      )}
    </Stack>
  );
  return (
    <Stack
      direction="row"
      justifyContent={me ? 'flex-end' : 'unset'}
      sx={{ mb: 5 }}
      alignItems="baseline"
      position="relative"
    >
      {isLoading && <CircularProgress size={20} sx={{ mr: 0.5 }} />}

      {isFailure && (
        <IconButton sx={{ mt: 3, mr: -0.5 }} size="medium" color="error">
          <Iconify icon="material-symbols:error-outline" width={16} />
        </IconButton>
      )}

      <Stack alignItems={me ? 'flex-end' : 'flex-start'} flexDirection="row">
        {!me && <Avatar alt={username} src={photoURL} sx={{ width: 32, height: 32, mr: 2 }} />}

        <Stack
          alignItems={me ? 'flex-end' : 'flex-start'}
        // sx={{ position: 'absolute', marginLeft: '42px' }}
        >
          {!isLoading && renderInfo}

          <Stack
            direction="row"
            alignItems="center"
            sx={{
              position: 'relative',
              ...(!isFailure
                ? {
                  '&:hover': {
                    '& .message-actions': {
                      opacity: 1,
                    },
                  },
                }
                : {
                  '& .message-actions': {
                    opacity: 1,
                  },
                }),
            }}
          >
            {renderBody}
            {renderActions}
          </Stack>
        </Stack>
      </Stack>
    </Stack>
  );
}