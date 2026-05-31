// [C08] Status Bar & Message Log type definitions

export type MessageType = 'progress' | 'warning' | 'error' | 'success';

export interface Message {
  id: string; // UUID
  text: string;
  type: MessageType;
  timestamp: Date;
  source?: string; // Optional component name
}

export const MESSAGE_TYPE_ICONS: Record<MessageType, string> = {
  progress: '⏳',
  warning: '⚠️',
  error: '❌',
  success: '✅',
};
