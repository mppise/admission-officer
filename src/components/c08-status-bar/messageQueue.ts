// [C08-F01] Message queue management: accept messages, store with timestamp, auto-clear on session boundaries

import { randomUUID } from 'crypto';
import { Message, MessageType } from './types.js';

let queue: Message[] = [];
let currentMessage: Message | null = null;
let clearCallback: ((context: 'context-change' | 'menu-return') => void) | null = null;

/**
 * [C08-F01] Add message to queue
 */
export function addMessage(text: string, type: MessageType, source?: string): void {
  const message: Message = {
    id: randomUUID(),
    text,
    type,
    timestamp: new Date(),
    source,
  };

  queue.push(message);
  currentMessage = message;
}

/**
 * [C08-F01] Get current (latest) message
 */
export function getCurrentMessage(): Message | null {
  return currentMessage;
}

/**
 * [C08-F01] Get all messages in queue
 */
export function getAllMessages(): Message[] {
  return [...queue];
}

/**
 * [C08-F01] Clear queue on session boundaries (context change / menu return)
 */
export function clearQueue(context: 'context-change' | 'menu-return'): void {
  queue = [];
  currentMessage = null;
  if (clearCallback) {
    clearCallback(context);
  }
}

/**
 * Register callback when queue is cleared (for triggering UI updates)
 */
export function onQueueClear(callback: (context: 'context-change' | 'menu-return') => void): void {
  clearCallback = callback;
}

/**
 * Get queue length (for testing)
 */
export function getQueueLength(): number {
  return queue.length;
}

/**
 * Reset queue for testing
 */
export function resetQueue(): void {
  queue = [];
  currentMessage = null;
}
