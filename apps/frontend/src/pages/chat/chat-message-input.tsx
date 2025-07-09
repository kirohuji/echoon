import { useState, useCallback, useMemo } from 'react';
// @mui
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useSnackbar } from 'src/components/snackbar';
// routes
import { useRouter } from 'src/routes/hooks';
// hooks
import { useAuthContext } from 'src/auth/hooks';
import { useBoolean } from 'src/hooks/use-boolean';
// utils
import { uuidv4 } from 'src/utils/uuidv4';

// components
import { Iconify } from 'src/components/iconify';

import { usePipecatClient } from '@pipecat-ai/client-react';

// ----------------------------------------------------------------------

export default function ChatMessageInput({
  recipients,
  onAddRecipients,
  disabled,
  selectedConversationId,
}: {
  recipients: any[],
  onAddRecipients: () => void,
  disabled: boolean,
  selectedConversationId: string,
}) {

  const pipecatClient: any = usePipecatClient();

  const loading = useBoolean(false);

  const router = useRouter();

  const { enqueueSnackbar } = useSnackbar();

  const { user } = useAuthContext();

  const [message, setMessage] = useState('');
  const [sendingType, setSendingType] = useState('send');

  const [type, setType] = useState('text');

  const myContact = useMemo(
    () => ({
      _id: user?._id,
      role: user?.role,
      email: user?.email,
      address: user?.address,
      name: user?.displayName,
      username: user?.username,
      lastActivity: new Date()?.toISOString(),
      photoURL: user?.photoURL,
      phoneNumber: user?.phoneNumber,
      status: 'online',
    }),
    [user]
  );

  const messageData = useMemo(
    () => ({
      id: uuidv4(),
      conversationId: selectedConversationId,
      attachments: [],
      body: message,
      message,
      contentType: type,
      // createdAt: sub(new Date(), { minutes: 1 }),
      createdAt: new Date().toISOString(),
      senderId: myContact._id,
    }),
    [message, type, selectedConversationId, myContact._id]
  );

  const conversationData = useMemo(
    () => ({
      id: uuidv4(),
      messages: [messageData],
      participants: [...recipients, myContact],
      type: recipients.length > 1 ? 'GROUP' : 'ONE_TO_ONE',
      unreadCount: 0,
    }),
    [messageData, myContact, recipients]
  );


  const handleChangeMessage = useCallback((event: any) => {
    if (event.key !== 'Enter' || !event.shiftKey) {
      setMessage(event.target.value.replace(/\n/g, ''));
    }
  }, []);

  const createConversation = useCallback(async () => {
    // let conversationKey = await messagingService.findExistingConversationWithUsers({
    //   users: recipients.map((recipient) => recipient._id),
    // });
    // if (!conversationKey) {
    //   conversationKey = await messagingService.room({
    //     participants: recipients.map((recipient) => recipient._id),
    //   });
    // }
    // return conversationKey;
  }, []);

  const handleRTVIMessage = useCallback(async (currentMessage: string) => {
    pipecatClient.params.requestData = {
      ...(pipecatClient.params.requestData ?? {}),
      conversation_id: selectedConversationId,
      user_id: user?.id,
    };

    await pipecatClient.action({
      service: "llm",
      action: "append_to_messages",
      arguments: [
        {
          name: "messages",
          value: [
            {
              role: "user",
              content: currentMessage,
            },
          ],
        },
      ],
    });
  }, [user])

  const handleSendMessage = useCallback(
    async (event: any) => {
      try {
        if (event.key === 'Enter') {
          if (message && message !== '\n') {
            if (selectedConversationId) {
              const sendingMessage = messageData;
              setMessage('');
              await handleRTVIMessage(sendingMessage.body);
              // setSendingType('done')
              setType('text');
              try {
                // await dispatch(sendMessage(selectedConversationId, sendingMessage));
                setSendingType('send')
              } catch (e) {
                setSendingType('send')
                enqueueSnackbar(e.message);
              }
            } else {
              setMessage('');
              setSendingType('send')
              // const conversationKey = await createConversation(conversationData);
              // router.push(`${paths.chat}?id=${conversationKey}`);
              // onAddRecipients([]);
            }
          } else {
            setMessage('');
            setSendingType('send')
          }
        }
      } catch (error) {
        console.error(error);
      }
    },
    [
      message,
      selectedConversationId,
      messageData,
      enqueueSnackbar
    ]
  );

  return (
    <Box sx={{ width: '100%' }}>
      {loading.value && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 10,
            backgroundColor: '#ffffffc4',
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Box>
            <CircularProgress />
            <Typography variant="body2">正在上传...</Typography>
          </Box>
        </Box>
      )}
      <InputBase
        type="search"
        className="message-input"
        inputProps={{ enterKeyHint: sendingType as any }}
        value={message}
        onKeyUp={handleSendMessage}
        onChange={handleChangeMessage}
        placeholder="请输入内容"
        disabled={disabled || loading.value}
        maxRows={3}
        multiline
        startAdornment={
          false && (
            <IconButton>
              <Iconify icon="eva:smiling-face-fill" />
            </IconButton>
          )
        }
        endAdornment={
          <Stack direction="row" sx={{ flexShrink: 0 }}>
            {/* <IconButton onClick={triggerPasteEvent}>
                <Iconify icon="streamline:copy-paste" />
              </IconButton> */}
            {/* <IconButton onClick={handleImage}>
                <Iconify icon="solar:gallery-add-bold" />
              </IconButton>
              <IconButton onClick={handleCamera}>
                <Iconify icon="mdi:camera" />
              </IconButton> */}
            {/* <IconButton onClick={handleAttach}>
                <Iconify icon="eva:attach-2-fill" />
              </IconButton> */}
            {/* <IconButton>
                  <Iconify icon="solar:microphone-bold" />
                </IconButton> */}
          </Stack>
        }
        sx={{
          px: 1,
          margin: '4px 0',
          flexShrink: 0,
          width: '100%',
          borderTop: (theme) => `solid 1px ${theme.palette.divider}`,
        }}
      />
    </Box>
  );
}
