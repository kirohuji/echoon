import { useAuthContext } from 'src/auth/hooks';
import { useRouter, useSearchParams } from 'src/routes/hooks';
import { MainContent } from 'src/layouts/main';
import { Card, Stack, Typography } from '@mui/material';

import { useResponsive } from 'src/hooks/use-responsive';
import { useCallback, useState } from 'react';

import ChatNavItem from '../chat-nav-item';
import ChatNav from '../chat-nav';

function calcHeight(isDesktop: boolean, selectedConversationId: string) {
  if (isDesktop) {
    return '72vh';
  }
  return selectedConversationId ? 'calc(100vh - 70px)' : 'calc(100vh - 140px)';
}

export function ChatView() {

  const router = useRouter();

  const { user } = useAuthContext();

  const searchParams = useSearchParams();

  const [conversationsLoading, setConversationsLoading] = useState(false);

  const [conversations, setConversations] = useState<any[]>([
    {
      id: '1',
      username: 'John Doe',
      photoURL: 'https://via.placeholder.com/150',
      lastActivity: new Date(),
      status: 'online',
      displayName: 'John Doe',
      realName: 'John Doe',
      displayText: 'Hello, how are you?',
      unreadCount: 0,
    },
    {
      id: '2',
      username: 'John Doe',
      photoURL: 'https://via.placeholder.com/150',
      lastActivity: new Date(),
      status: 'online',
      displayName: 'John Doe',
      realName: 'John Doe',
      displayText: 'Hello, how are you?',
      unreadCount: 0,
    },
  ]);

  const isDesktop = useResponsive('up', 'md');

  const selectedConversationId = searchParams.get('id') || '';

  const handleClickConversation = useCallback((conversation: any) => {
    router.push(`/main/chat?id=${conversation.id}`);
  }, [router]);


  const renderNav = (
    <ChatNav
      conversations={conversations}
      selectedConversationId={selectedConversationId}
    />
  );

  return (
    <MainContent
      disablePadding
      maxWidth={false}
    >
      <Typography variant="h6" sx={{ mb: { xs: 3, md: 5 } }}>
        Chat
      </Typography>
      {
        (isDesktop || selectedConversationId) && (
          <Stack
            component={!isDesktop && selectedConversationId ? 'div' : Card}
            direction="row"
            className="bottom-chat"
            sx={{ height: calcHeight(isDesktop, selectedConversationId) }}>
            {isDesktop && renderNav}
            <Stack
              sx={{
                width: 1,
                height: 1,
                overflow: 'hidden',
              }}
            >
              <span>renderHeader</span>
              <Stack
                direction="row"
                sx={{
                  width: 1,
                  height: 1,
                  overflow: 'hidden',
                  borderTop: (theme) => `solid 1px ${theme.palette.divider}`,
                }}
              >
                <span>renderMessages</span>
                <span>ChatRoom</span>
              </Stack>
            </Stack>
          </Stack>
        )
      }
      {
        !selectedConversationId && (
          <Stack>
            {!isDesktop && (
              conversations.map((conversation, index) => (
                <ChatNavItem key={index} conversation={conversation} selected={conversation.id === selectedConversationId} collapse={false} onClick={() => {}} />
              ))
            )}
          </Stack>
        )
      }
    </MainContent>
  )
}