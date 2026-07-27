import type { Message } from './MessageBubble';

export type { Message };

export interface Chat {
  id: string;
  name: string;
  handle: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  messages: Message[];
  // Extended Firebase fields
  otherId?: string;
  lastSeen?: string;
}
