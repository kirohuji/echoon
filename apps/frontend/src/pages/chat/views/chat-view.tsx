import { useRouter, useSearchParams } from 'src/routes/hooks';
import { MainContent } from 'src/layouts/main';
import { Card, Stack, Typography } from '@mui/material';

import { useResponsive } from 'src/hooks/use-responsive';
import { useCallback, useEffect, useState } from 'react';

// import { DailyTransport } from "@pipecat-ai/daily-transport";
import { PipecatClient } from "@pipecat-ai/client-js";
import {
  PipecatClientProvider,
  PipecatClientAudio
} from "@pipecat-ai/client-react";
import {
  WebSocketTransport,
  ProtobufFrameSerializer,
} from "@pipecat-ai/websocket-transport";
import { conversationService } from 'src/composables/context-provider';

import ChatNavItem from '../chat-nav-item';
import ChatNav from '../chat-nav';
import ChatHeaderDetail from '../chat-header-detail';
import ChatMessageList from '../chat-message-list';
import ChatMessageInput from '../chat-message-input';
import ChatRoom from '../chat-room';

function calcHeight(isDesktop: boolean, selectedConversationId: string) {
  if (isDesktop) {
    return '72vh';
  }
  return selectedConversationId ? 'calc(100vh - 70px)' : 'calc(100vh - 140px)';
}

// const transport = new DailyTransport()

// const connectUrl =
//   process.env.NODE_ENV === 'development'
//     ? 'http://localhost:7860/api'
//     : 'http://192.168.110.137:7860/api';
const pipecatClient = new PipecatClient({
  // params: {
  //   baseUrl: connectUrl,
  //   endpoints: {
  //     connect: "/bot/offer",
  //     action: "/bot/action",
  //   },
  // },
  transport: new WebSocketTransport ({
    serializer: new ProtobufFrameSerializer(),
    recorderSampleRate: 24000,
    playerSampleRate: 24000,
  }),
  enableCam: false,  // Default camera off
  enableMic: true,   // Default microphone on
  callbacks: {
    onTransportStateChanged: (state) => {
      console.log(`Transport state: ${state}`)
    },
    onConnected: () => {
      console.log("onConnected")
    },
    onBotReady: () => {
      console.log("onBotReady")
      // transport.state = 'ready'
    },
    onDisconnected: () => {
      console.log("onDisconnected")
    },
    onUserStartedSpeaking: () => {
      console.log("User started speaking.")
    },
    onUserStoppedSpeaking: () => {
      console.log("User stopped speaking.")
    },
    onBotStartedSpeaking: () => {
      console.log("Bot started speaking.")
    },
    onBotStoppedSpeaking: () => {
      console.log("Bot stopped speaking.")
    },
    onUserTranscript: async (transcript) => {
      if (transcript.final) {
        console.log(`User transcript: ${transcript.text}`)
      }
    },
    onBotTranscript: (transcript) => {
      console.log(`Bot transcript: ${transcript.text}`)
    },
    onServerMessage: (msg) => {
      console.log(`Server message: ${msg}`)
    }
  },
});

export function ChatView() {

  const router = useRouter();

  const searchParams = useSearchParams();

  const [participants, setParticipants] = useState<any[]>([]);

  const [currentConversation, setCurrentConversation] = useState<any>(null);

  const [conversations, setConversations] = useState<any[]>([]);

  const [messages, setMessages] = useState<any[]>([]);

  const isDesktop = useResponsive('up', 'md');

  const selectedConversationId = searchParams.get('id') || '';

  const details = !!selectedConversationId;

  const handleClickConversation = useCallback((conversation: any) => {
    if(isDesktop){
      router.push(`/main/chat?id=${conversation.id}`);
    }else{
      router.push(`/chat?id=${conversation.id}`);
    }
  }, [router, isDesktop]);

  const renderNav = (
    <ChatNav
      conversations={conversations}
      selectedConversationId={selectedConversationId}
      onClick={(conversation) => handleClickConversation(conversation)}
    />
  );

  const renderHead = (
    <Stack
      direction="row"
      alignItems="center"
      flexShrink={0}
      sx={{ pr: 1, pl: 2.5, py: 1, minHeight: isDesktop ? 72 : 56 }}
    >
      {selectedConversationId && details && <ChatHeaderDetail participants={participants} />}
    </Stack>
  );

  const renderMessages = (
    <Stack
      sx={{
        width: 1,
        height: 1,
        overflow: 'hidden',
      }}
      className="chat-message-list"
    >
      <ChatMessageList
        conversationId={selectedConversationId}
        messages={messages}
        participants={participants}
        onRefresh={() => { }}
      />

      <ChatMessageInput
        participants={participants}
        onAddRecipients={() => { }}
        selectedConversationId={selectedConversationId}
        disabled={!selectedConversationId}
      />
    </Stack>
  );

  const getConversation = useCallback(async (id: string) => {
    const res = await conversationService.get({
      id,
    });
    setCurrentConversation(res.data);
    setParticipants(res.data.participants.map((participant: any) => participant.info));
    setMessages(res.data.messages.data.map((message: any) => ({
      ...message,
      attachments: message.attachments || [],
      contentType: message.contentType || 'text',
    })) );
  }, []);

  const initialConversation = useCallback(async () => {
    const res = await conversationService.my();
    setConversations(res.data);
    if(selectedConversationId){
      getConversation(selectedConversationId);
    }
  }, [selectedConversationId, getConversation]);

  useEffect(() => {
    initialConversation();
  }, [initialConversation]);

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
          <PipecatClientProvider client={pipecatClient}>
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
                {renderHead}
                <Stack
                  direction="row"
                  sx={{
                    width: 1,
                    height: 1,
                    overflow: 'hidden',
                    borderTop: (theme) => `solid 1px ${theme.palette.divider}`,
                  }}
                >
                  {renderMessages}
                  {details && (
                    <ChatRoom
                      conversation={conversations[0]}
                      messages={[]}
                      participants={[]}
                    />
                  )}
                </Stack>
              </Stack>
            </Stack>
            <PipecatClientAudio />
          </PipecatClientProvider>
        )
      }
      {
        !selectedConversationId && (
          <Stack>
            {!isDesktop && (
              conversations.map((conversation, index) => (
                <ChatNavItem key={index} conversation={conversation} selected={conversation.id === selectedConversationId} collapse={false} onClick={() => handleClickConversation(conversation)} />
              ))
            )}
          </Stack>
        )
      }
    </MainContent>
  )
}