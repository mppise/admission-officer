---
name: c08-status-bar-impl
description: C08 Status Bar & Message Log — Implementation specification
---

# C08 — Status Bar & Message Log: Implementation Specification

---

## Interfaces

```typescript
export interface Message {
  text: string;
  type: MessageType; // 'info' | 'warn' | 'error' | 'success'
  timestamp: string; // ISO 8601
  source?: string; // e.g., "C03 University Profiler"
}

export function postMessage(text: string, type: MessageType, source?: string): void;
export function clearMessageLog(context: 'context-change' | 'menu-return'): void;
export function getAllMessages(): Message[];
export function getCurrentMessage(): Message | null;
export function openMessageLogModal(): Promise<void>;

export const MESSAGE_TYPE_ICONS: Record<MessageType, string> = {
  'info': 'ℹ️',
  'warn': '⚠️',
  'error': '✗',
  'success': '✓',
};
```

---

## In-Memory Message Queue

```typescript
interface MessageQueue {
  messages: Message[];
  currentIndex: number; // Index of displayed message
  maxSize: number; // 100
}
```

---

## Footer Rendering

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ✓ Guidance generated for Stanford University                             │
│ [Press Enter to see full log] › C04 Guidance Engine                      │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Line 1:** Icon + current message (truncated to 70 chars)
- **Line 2:** Help text + source component

---

## Message Log Modal

```
┌─────────── Message Log ──────────────┐
│ 12:45:23 [info] C03: Crawling page 5 │
│ 12:44:58 [info] C03: Scraped 47 pages │
│ 12:44:15 [success] C03: Profile saved │
│ 12:43:50 [error] C03: Network timeout │
│ ↑/↓ scroll, Esc close                 │
└───────────────────────────────────────┘
```

---

## Error Handling

| Error | Recovery |
| :----- | :------- |
| Message text > 1000 chars | Truncate: `text.slice(0, 1000) + "..."` |
| Queue overflow (100+) | Discard oldest message |
| Very long source name | Abbreviate to "C##" format |

---

## Operational Requirements

- **Timing:** postMessage is synchronous, non-blocking (returns immediately)
- **Display update:** Status footer updated on next render cycle (non-blocking)
- **Memory:** Queue never exceeds 100 messages
- **Terminal:** Assume minimum 80×24; footer uses 2 lines, modal uses 8–10 lines

---

## Testing Requirements

**Coverage:** 80% line coverage.

**Critical paths:**
- [ ] postMessage with all 4 types → correct icons, messages appear
- [ ] Message log modal → shows all messages, navigable
- [ ] Clear log → messages removed
- [ ] Queue overflow → oldest discarded, newest retained
- [ ] Very long message → truncated with "..."
- [ ] Footer updates non-blocking → doesn't freeze menu
