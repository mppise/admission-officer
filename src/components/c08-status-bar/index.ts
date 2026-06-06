// [C08] Status Bar & Message Log public API exports

import { addMessage, clearQueue, getCurrentMessage, getAllMessages } from './messageQueue.js';
import { MessageType, Message } from './types.js';
import { triggerOpenMessageLogModal } from '../../utils/tui.js';

/**
 * [C08-F01, C08-F02, C08-F03] Post a message to the status bar and log
 * Called by C01–C07 components
 */
export function postMessage(text: string, type: MessageType, source?: string): void {
  addMessage(text, type, source);
}

/**
 * [C08-F01] Clear the message queue on session boundaries
 * Called by C07 (context change) or C01 (menu return)
 */
export function clearMessageLog(context: 'context-change' | 'menu-return'): void {
  clearQueue(context);
}

/**
 * [C08-F04, C08-F05] Open the full-screen message log modal
 * Triggers the modal opener registered by the currently-mounted AppScreen in tui.tsx.
 */
export async function openMessageLogModal(): Promise<void> {
  triggerOpenMessageLogModal();
}

/**
 * Internal API for components
 */
export { getCurrentMessage, getAllMessages };
export type { Message, MessageType };
export { MESSAGE_TYPE_ICONS } from './types.js';
export { StatusFooter } from './statusFooter.js';
export { MessageLogModal } from './messageLogModal.js';
