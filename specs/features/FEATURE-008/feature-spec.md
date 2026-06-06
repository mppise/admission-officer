# Feature Spec — FEATURE-008: Status Bar & Message Log

**Domain:** status_bar
**Author:** Mangesh Pise (reverse-engineered)
**Date:** 2026-06-06
**Status:** Partially complete — components implemented, integration with C01 incomplete (v1.0)

---

## Scope

An in-app status bar and message log that displays real-time progress, warnings, errors, and success messages from all components during long-running operations (Playwright scraping, Gemini API calls). Messages are displayed in a footer bar and can be reviewed in a full-screen modal log.

---

## Implementation Plan

### F01 — Message queue
- In-memory queue (module-level singleton in `messageQueue.ts`)
- `addMessage(text, type, source?)` — adds with UUID, timestamp, type
- `getCurrentMessage()` — returns latest message
- `getAllMessages()` — returns copy of full queue
- `clearQueue(context)` — clears on session boundary; fires registered `clearCallback`
- `MessageType`: `'progress' | 'warning' | 'error' | 'success'`

### F02 — Status footer
- `StatusFooter` Ink component: renders the latest message with type icon in a footer bar
- Truncates messages > 80 chars, shows scroll indicator
- Renders "(no messages)" placeholder when queue is empty

### F03 — Message type icons
- `MESSAGE_TYPE_ICONS`: `progress → ⏳`, `warning → ⚠️`, `error → ❌`, `success → ✅`

### F04 — Message log modal
- `MessageLogModal` Ink component: full-screen modal, reverse-chronological, max 20 visible rows
- Shows `[HH:MM:SS] {icon} {text}` per message
- Controlled by `isOpen` prop and `onClose` callback

### F05 — Public API
- `postMessage(text, type, source?)` — entry point for all components to post messages
- `clearMessageLog(context)` — called on context changes or menu returns
- `openMessageLogModal()` — STUB in v1.0 (returns void immediately)

### Integration gap (v1.0)
- `StatusFooter` is not rendered in `AppScreen` or any C01 screen
- `MessageLogModal` is not rendered anywhere
- No component (C02–C06) calls `postMessage()`
- `openMessageLogModal()` is a placeholder

---

## API / Interface Contract

```typescript
// Post a message to the status bar queue
export function postMessage(text: string, type: MessageType, source?: string): void

// Clear the queue on session boundaries
export function clearMessageLog(context: 'context-change' | 'menu-return'): void

// Open the full-screen message log modal (STUB in v1.0)
export async function openMessageLogModal(): Promise<void>

// Internal — consumed by UI components
export { getCurrentMessage, getAllMessages }
export type { Message, MessageType }
export { MESSAGE_TYPE_ICONS }
export { StatusFooter }
export { MessageLogModal }
```

---

## Guardrail Compliance

All messages are ephemeral in-memory — not persisted to disk. No PII in message text (messages describe operation stages, not user data). The integration stub means there is no user-visible impact in v1.0; this is a deferred integration, not a security concern.
