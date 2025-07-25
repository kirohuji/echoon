import { useCallback, useEffect, useRef, useState } from "react";

import { v4 as uuidv4 } from "uuid";
import {
  type BotLLMTextData,
  type BotTTSTextData,
  RTVIEvent,
  type TranscriptData,
} from "@pipecat-ai/client-js";
import { usePipecatClient, useRTVIClientEvent } from "@pipecat-ai/client-react";
import {
  addNewLinesBeforeCodeblocks,
  // type ImageContent,
  normalizeMessageText,
  // type TextContent,
  type Message,
} from "src/utils/messages";
import type { LLMMessageRole } from "src/utils/llm";
import emitter from "src/utils/eventEmitter";
import { getScrollableParent } from "src/utils/dom";
import { useAuthContext } from "src/auth/hooks";
import { pipecatService } from "src/composables/context-provider";
import ChatMessageItem from './chat-message-item'

interface LiveMessage extends Message {
  final?: boolean;
}

export const RTVIExtraEvents = {
  StorageItemStored: "storageItemStored",
} as const;

// enum RTVIEvent = typeof RTVIEvent[keyof typeof RTVIEvent];

interface Props {
  autoscroll: boolean;
  conversationId: string;
  isBotSpeaking?: boolean;
  messages: Message[];
  participants: any[];
}

interface MessageChunk {
  createdAt?: Date | undefined;
  final: boolean;
  replace?: boolean;
  role: LLMMessageRole;
  text: string;
  updatedAt?: Date;
}

export default function ChatLiveMessageList({
  autoscroll,
  isBotSpeaking,
  messages,
  conversationId,
  participants
}: Props) {
  const [liveMessages, setLiveMessages] = useState<LiveMessage[]>([]);

  const interactionMode: string = "informational"

  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const client: any = usePipecatClient();

  const { user } = useAuthContext();

  const participant = participants.find((p: any) => p.id !== user?.id);

  useEffect(() => {
    if (!client) return;
    client.params = {
      ...client.params,
      requestData: {
        conversation_id: conversationId,
        // bot_model: model,
        bot_prompt: participant?.prompt,
      },
    };
  }, [client, conversationId, participant]);

  const addMessageChunk = useCallback(
    ({
      createdAt = new Date(),
      final,
      replace = false,
      role,
      text,
      updatedAt = createdAt,
    }: MessageChunk) => {
      const createdAtIso = createdAt.toISOString();
      const updatedAtIso = updatedAt.toISOString();

      setLiveMessages((currentLiveMessages) => {
        const matchingMessageIdx = currentLiveMessages.findIndex(
          (m) => m.content.role === role && m.created_at === createdAtIso,
        );
        const matchingMessage = currentLiveMessages[matchingMessageIdx];

        const isSameMessage =
          matchingMessage?.final === final &&
          normalizeMessageText(matchingMessage) ===
          addNewLinesBeforeCodeblocks(text);

        if (isSameMessage) return currentLiveMessages;

        if (!matchingMessage || matchingMessage?.final) {
          // Append new message
          const message: LiveMessage = {
            content: {
              content: text,
              role,
            },
            conversation_id: conversationId,
            created_at: createdAtIso,
            extra_metadata: {},
            final,
            message_id: uuidv4(),
            // message_number: messages.length + liveMessages.length + 1,
            updated_at: updatedAtIso,
          };
          return [...currentLiveMessages, message];
        }

        const updatedMessages = [...currentLiveMessages];
        const prevText = normalizeMessageText(
          updatedMessages[matchingMessageIdx],
        );
        const updatedMessage: LiveMessage = {
          ...updatedMessages[matchingMessageIdx],
          content: {
            content: addNewLinesBeforeCodeblocks(
              replace ? text : prevText + text,
            ),
            role,
          },
          final,
          updated_at: updatedAtIso,
        };

        return currentLiveMessages
          .map((currentLiveMessage, idx) =>
            idx === matchingMessageIdx ? updatedMessage : currentLiveMessage,
          )
          .filter((m, idx, arr) => {
            const normalizedText = normalizeMessageText(m);
            const isEmptyMessage =
              normalizedText.trim() === "" && idx < arr.length - 1;
            return !isEmptyMessage;
          });
      });
    },
    [conversationId],
  );

  const firstBotResponseTime = useRef<Date | undefined>(undefined);
  const userStartedSpeakingTime = useRef<Date | undefined>(undefined);
  const userStoppedSpeakingTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const cleanupUserMessages = useCallback(() => {
    setLiveMessages((currentLiveMessages) =>
      currentLiveMessages.filter((m) => {
        if (m.content.role !== "user") return true;
        const normalizedText = normalizeMessageText(m);
        return normalizedText.length > 0;
      })
    );
  }, []);

  const isTextResponse = useRef(false);

  const revalidateAndRefresh = useCallback(async () => {
    emitter.emit("updateSidebar");
  }, []);

  // BotLlmStarted
  useRTVIClientEvent(
    RTVIEvent.BotLlmStarted,
    useCallback(() => {
      firstBotResponseTime.current = new Date();
      addMessageChunk({
        createdAt: firstBotResponseTime.current,
        final: false,
        role: "assistant",
        text: "",
      });
    }, [addMessageChunk]),
  );

  // BotLlmText
  useRTVIClientEvent(
    RTVIEvent.BotLlmText,
    useCallback(
      (text: BotLLMTextData) => {
        if (interactionMode !== "informational" && !isTextResponse.current)
          return;
        if (firstBotResponseTime.current) {
          addMessageChunk({
            createdAt: firstBotResponseTime.current,
            final: false,
            role: "assistant",
            text: text.text,
            updatedAt: new Date(),
          });
        }
      },
      [addMessageChunk, interactionMode],
    ),
  );

  // BotLlmStopped
  useRTVIClientEvent(
    RTVIEvent.BotLlmStopped,
    useCallback(async () => {
      const textResponse = isTextResponse.current;
      isTextResponse.current = false;

      if (interactionMode !== "informational" && !textResponse) return;

      if (firstBotResponseTime.current) {
        addMessageChunk({
          createdAt: firstBotResponseTime.current,
          final: true,
          role: "assistant",
          text: "",
          updatedAt: new Date(),
        });
        firstBotResponseTime.current = undefined;
        // TODO: Move to StorageItemStored handler, once that is emitted in text-mode
        setTimeout(revalidateAndRefresh, 2000);
      }
    }, [addMessageChunk, revalidateAndRefresh, interactionMode]),
  );

  // BotStartedSpeaking
  useRTVIClientEvent(
    RTVIEvent.BotStartedSpeaking,
    useCallback(() => {
      if (interactionMode !== "conversational") return;
      if (!firstBotResponseTime.current) {
        firstBotResponseTime.current = new Date();
      }
      addMessageChunk({
        createdAt: firstBotResponseTime.current,
        final: false,
        role: "assistant",
        text: "",
        updatedAt: new Date(),
      });
    }, [addMessageChunk, interactionMode]),
  );

  // BotTtsText
  useRTVIClientEvent(
    RTVIEvent.BotTtsText,
    useCallback(
      (text: BotTTSTextData) => {
        if (interactionMode !== "conversational") return;
        if (firstBotResponseTime.current) {
          addMessageChunk({
            createdAt: firstBotResponseTime.current,
            final: false,
            role: "assistant",
            text: ` ${text.text}`,
            updatedAt: new Date(),
          });
        }
      },
      [addMessageChunk, interactionMode],
    ),
  );

  // BotStoppedSpeaking
  useRTVIClientEvent(
    RTVIEvent.BotStoppedSpeaking,
    useCallback(() => {
      if (interactionMode !== "conversational") return;
      const createdAt = firstBotResponseTime.current;
      firstBotResponseTime.current = undefined;
      addMessageChunk({
        createdAt,
        final: true,
        role: "assistant",
        text: "",
        updatedAt: new Date(),
      });
    }, [addMessageChunk, interactionMode]),
  );

  // UserStartedSpeaking
  useRTVIClientEvent(
    RTVIEvent.UserStartedSpeaking,
    useCallback(() => {
      clearTimeout(userStoppedSpeakingTimeout.current);
      const now = userStartedSpeakingTime.current ?? new Date();
      userStartedSpeakingTime.current = now;
      addMessageChunk({
        createdAt: now,
        final: false,
        role: "user",
        text: "",
      });
    }, [addMessageChunk]),
  );

  // UserStoppedSpeaking
  useRTVIClientEvent(
    RTVIEvent.UserStoppedSpeaking,
    useCallback(() => {
      userStoppedSpeakingTimeout.current = setTimeout(
        cleanupUserMessages,
        5000,
      );
    }, [cleanupUserMessages]),
  );

  // UserTranscript
  useRTVIClientEvent(
    RTVIEvent.UserTranscript,
    useCallback(
      (data: TranscriptData) => {
        if (!userStartedSpeakingTime.current) {
          userStartedSpeakingTime.current = new Date();
        }
        addMessageChunk({
          createdAt: userStartedSpeakingTime.current,
          final: data.final,
          replace: true,
          role: "user" as LLMMessageRole,
          text: data.text,
          updatedAt: new Date(),
        });
        if (data.final) {
          userStartedSpeakingTime.current = undefined;
        }
      },
      [addMessageChunk],
    ),
  );

  useRTVIClientEvent(RTVIEvent.Disconnected, revalidateAndRefresh);

  // StorageItemStored
  // useRTVIClientEvent(
  //   RTVIEvent.StorageItemStored,
  //   useCallback(
  //     (data: any) => {
  //       const items = data.items as Array<Message["content"]>;
  //       if (items.some((i) => i.role === "assistant")) {
  //         revalidateAndRefresh();
  //       }
  //     },
  //     [revalidateAndRefresh],
  //   ),
  // );

  useRTVIClientEvent(
    RTVIEvent.ServerMessage,
    useCallback(async (message: { fileUrl: string }) => {
      if (!message.fileUrl) return;
      const url = await pipecatService.downloadAudio(message.fileUrl)
      setAudioUrl(url)
    }, []),
  );


  useEffect(() => {
    const handleUserTextMessage = (
      // content: Array<TextContent | ImageContent>,
      content: any,
    ) => {
      console.log('收到了用户的消息', content);
      isTextResponse.current = true;
      const now = new Date();
      setLiveMessages((currentLiveMessages: any) => [
        ...currentLiveMessages,
        {
          content: {
            role: "user",
            content: content[0].text,
          },
          conversation_id: conversationId,
          created_at: now.toISOString(),
          extra_metadata: {},
          final: true,
          message_id: uuidv4(),
          // message_number: messages.length + liveMessages.length + 1,
          updated_at: now.toISOString(),
        },
      ])
    };
    emitter.on("userTextMessage", handleUserTextMessage);
    return () => {
      emitter.off("userTextMessage", handleUserTextMessage);
    };
  }, [addMessageChunk, conversationId, messages.length]);

  useEffect(() => {
    if (!autoscroll) return;
    const scroller = getScrollableParent(document.querySelector("main"));
    if (!scroller) return;
    const isScrollLocked = document.body.hasAttribute("data-scroll-locked");
    if (!liveMessages.length) return;
    scroller.scrollTo({
      behavior: isScrollLocked ? "instant" : "smooth",
      top: scroller.scrollHeight,
    });
  }, [autoscroll, liveMessages]);

  useEffect(() => {
    setLiveMessages((lm) => lm.filter((m) => !m.final));
  }, [messages.length]);

  return <>
    {
      liveMessages.map((m, i) => (
        <ChatMessageItem
          key={i}
          message={{
            ...m,
            createdAt: m.created_at,
            senderId: m.content.role === 'user' ? user?.id : participant?.id,
            contentType: 'text',
            body: m.content.content,
            // isLoading: i === liveMessages.length - 1 &&
            //   m.content.role === "assistant" &&
            //   isBotSpeaking
          }}
          participants={participants}
          onOpenLightbox={() => []}
        // isSpeaking={
        //   i === liveMessages.length - 1 &&
        //   m.content.role === "assistant" &&
        //   isBotSpeaking
        // }
        />
      ))
    }
    {audioUrl && (
      <audio
        controls
        src={audioUrl}
        autoPlay
        style={{ width: 300, marginTop: 16, display: 'none' }}
        onEnded={() => {
          setAudioUrl(null);
          URL.revokeObjectURL(audioUrl);
        }}
      >
        <track kind="captions" src="" label="No captions" />
      </audio>
    )}
  </>
}
