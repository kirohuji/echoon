import { EventEmitter } from "events";
import type { ImageContent, TextContent } from "./messages";


interface EventMap {
  changeLlmModel: [llmModel: string];
  deleteConversation: [conversationId: string];
  showChatMessages: [];
  toggleSettings: [];
  toggleSidebar: [];
  updateSidebar: [];
  userTextMessage: [text: Array<TextContent | ImageContent>];
}

const emitter = new EventEmitter<EventMap>();

// Optional: Set the maximum number of listeners to avoid potential memory leaks in large apps.
emitter.setMaxListeners(10);

export default emitter;
