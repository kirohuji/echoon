import { useState, useEffect, useCallback } from 'react';
// @mui
import Box from '@mui/material/Box';
// components
import Scrollbar from 'src/components/scrollbar';
import Lightbox, { useLightBox } from 'src/components/lightbox';
//
import { useMessagesScroll } from './hooks';
import ChatMessageItem from './chat-message-item';
import ChatLiveMessageList from './chat-live-message-list';

// ----------------------------------------------------------------------
const secretKey = 'future';
export default function ChatMessageList({
  onRefresh,
  messages = [],
  conversationId,
  participants,
}: {
  onRefresh: (length: number) => void;
  messages: any[];
  conversationId: string;
  participants: any[];
}) {
  const [isFetching, setIsFetching] = useState(false); // 是否正在加载更多消息
  const { messagesEndRef } = useMessagesScroll(messages);

  const slides = messages
    .filter((message: any) => message.contentType === 'image' || message.contentType === 'jpg')
    .map((message: any) => ({ src: message.body }));

  const lightbox = useLightBox(slides);

  const handleScroll = useCallback(async () => {
    if (messagesEndRef.current && messagesEndRef.current.scrollTop === 0 && !isFetching) {
      const scrollPosition = messagesEndRef.current.scrollHeight - messagesEndRef.current.scrollTop;
      if (!isFetching) {
        setIsFetching(true);
        await onRefresh(messages.length); // 获取更多消息
        setIsFetching(false); // 加载完成后重置状态
        messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight - scrollPosition;
      }
    }
  }, [messagesEndRef, isFetching, onRefresh, messages.length]);

  useEffect(() => {
    const ref = messagesEndRef.current;
    if (ref) {
      ref.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (ref) {
        ref.removeEventListener('scroll', handleScroll);
      }
    };
  }, [handleScroll, messagesEndRef]);

  return (
    <>
      <Scrollbar ref={messagesEndRef} sx={{ px: 3, py: 5, height: 1 }}>
        <Box sx={{ height: 1 }}>
          {messages.map((message, index) => (
            <ChatMessageItem
              key={index}
              message={message}
              participants={participants}
              onOpenLightbox={() => lightbox.onOpen(message.body)}
            />
          ))}
           <ChatLiveMessageList conversationId={conversationId} messages={messages} participants={participants} autoscroll/>
        </Box>
      </Scrollbar>

      <Lightbox
        onGetCurrentIndex={() => lightbox.selected}
        slides={slides}
        open={lightbox.open}
        close={lightbox.onClose}
        disabledZoom={false}
        disabledVideo={false}
        disabledTotal={false}
        disabledCaptions={false}
        disabledSlideshow={false}
        disabledThumbnails={false}
        disabledFullscreen={false}
      />
    </>
  );
}