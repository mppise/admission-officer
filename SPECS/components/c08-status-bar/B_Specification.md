# C08 — Status Bar & Message Log: Specification

> ⚠️ New (CHG-003, 2026-05-31): Interfaces, error handling, UX, testing requirements, and operational behavior.

---

## Interfaces

### Public API

C08 exports three functions:

#### `postMessage(text: string, type: MessageType): void`

**Purpose:** Post a message to the status bar and log.

**Parameters:**
- `text: string` — Message content (plain text, max 500 characters; longer messages truncated in footer)
- `type: 'progress' | 'warning' | 'error' | 'success'` — Message type

**Behavior:**
- Adds message to queue with timestamp and UUID
- Updates `currentMessage` (latest message displayed in footer)
- Triggers footer re-render
- Returns immediately (non-blocking)
- No return value

**Example:**
```typescript
import { postMessage } from '../c08-status-bar'

postMessage('Building profile...', 'progress')
// Later...
postMessage('Profile saved', 'success')
// Or on error...
postMessage('Profile save failed: invalid email', 'error')
```

#### `clearMessageLog(context: 'context-change' | 'menu-return'): void`

**Purpose:** Clear the message queue on session boundaries.

**Parameters:**
- `context: 'context-change' | 'menu-return'` — Reason for clearing (for logging/audit)

**Behavior:**
- Empties the message queue
- Clears `currentMessage` (footer becomes empty)
- Triggers footer re-render
- Returns immediately
- No return value

**Called by:**
- C07 (Bootstrap) when student context changes
- C01 (CLI Shell) when user navigates back to main menu

#### `openMessageLogModal(): Promise<void>`

**Purpose:** Display the full-screen message log modal.

**Parameters:** None

**Behavior:**
- Renders full-screen modal over menu
- Displays all messages reverse-chronological
- Blocks user input to menu until modal closes
- User presses Escape or Enter to close
- Resolves when modal closes

**Called by:**
- tui.tsx (footer component) on Enter key
- C01 (CLI Shell) on "View Message Log" menu selection

---

## Message Type Constants

```typescript
type MessageType = 'progress' | 'warning' | 'error' | 'success'

const MESSAGE_TYPE_ICONS: Record<MessageType, string> = {
  progress: '⏳',
  warning: '⚠️',
  error: '❌',
  success: '✅',
}

const MESSAGE_TYPE_COLORS: Record<MessageType, string> = {
  progress: 'gray',
  warning: 'yellow',
  error: 'red',
  success: 'green',
}
```

---

## Error Handling

C08 does not throw errors. All operations are fire-and-forget:

| Scenario | Behavior |
|---|---|
| `postMessage()` called with empty text | Message posted as-is (no validation) |
| `postMessage()` called with >500 char text | Full text stored; footer truncates for display |
| `clearMessageLog()` called with invalid context | No effect (graceful ignore) |
| `openMessageLogModal()` called while modal already open | No-op (return immediately) |
| Queue memory grows unbounded | Session-based clearing prevents this (clearing at context change / menu return) |

---

## UX Detail

### Footer Display

**Layout:**
- Fixed at absolute bottom of terminal
- 2-line reserved height (1 message + 1 padding)
- Width: full terminal width

**Message Wrapping:**
- If message ≤ terminal width: display as-is
- If message > terminal width: wrap to next line(s), up to 2 lines max
- If text exceeds 2 lines: truncate with "..." and show scroll indicator "([ → ] more)"

**Auto-Clear Trigger:**
- User presses any key (except arrow keys for scrolling)
- User selects a menu item
- User types input in a text field
- Message is cleared and footer becomes empty until next operation posts a message

### Log Modal UX

**Header:** "Message Log (Newest First)"

**Content:**
- List of all messages, reverse-chronological
- Each row: `[HH:mm:ss] [Type Icon] Message text`
- Scrollable with ↑ ↓ keys (up to N messages visible, remaining scroll)
- Max 20 messages visible per screen

**Footer:** "[ ↑ ↓ ] scroll · [ esc ] close"

**Accessibility:**
- Timestamps in ISO 8601 format (machine-readable, human-readable)
- Type icons provide visual distinction
- Plain text (no ANSI color dependency for readability)

---

## Data Handling

| Field | Type | Source | Notes |
|---|---|---|---|
| `message.id` | UUID | Auto-generated | For dedup/tracking; not shown to user |
| `message.text` | string | `postMessage()` caller | Plain text only; max 500 chars |
| `message.type` | MessageType | `postMessage()` caller | Validated enum |
| `message.timestamp` | Date | System | ISO 8601 in log modal |
| `message.source` | string \| null | Optional metadata | Component name (e.g., 'C03'); not shown in footer |

**PII:** Messages may contain user data (e.g., "Saving student: John Doe"). No special handling; user manages data.

**Retention:** In-memory only; cleared at session boundaries or app exit. No persistence.

---

## Security Detail

- No user input in messages (callers construct messages, no user text injection)
- Footer is read-only (no text editing, no paste)
- Log modal is read-only (no export, no copy)
- Messages are not logged to file (in-memory only)
- No secrets or tokens should appear in messages (callers responsible)

---

## Compliance Obligations

None (status messages are non-functional, metadata only).

---

## Observability

C08 does not produce logs or telemetry. Observable signals:

| Signal | Detail |
|---|---|
| Footer visible | Message posted; users see it |
| Log modal opened | User presses Enter or selects "View Message Log" |
| Queue cleared | On context change or menu return |

---

## Infrastructure

**Dependencies:**
- `ink` (React-based terminal UI, already in use)
- `react` (for footer component rendering)
- Standard Node.js (Date, JSON)

**File Structure:**
```
src/components/c08-status-bar/
├── index.ts                    (exports: postMessage, clearMessageLog, openMessageLogModal)
├── messageQueue.ts             (queue state, storage)
├── statusFooter.tsx            (footer component, render)
├── messageLogModal.tsx         (log modal component, render)
└── types.ts                    (MessageType, Message interface)
```

**Imports by C01–C07:**
```typescript
import { postMessage } from '../c08-status-bar'

postMessage("...", "progress")
```

---

## Testing

### Unit Tests

**Test MessageQueue:**
- Add message to queue
- Clear queue
- Verify FIFO order
- Verify reverse-chronological in modal

**Test API functions:**
- `postMessage()` with various text lengths and types
- `clearMessageLog()` with both context values
- Edge cases (empty text, null, undefined)

### Integration Tests

**C01 integration:**
- Verify `clearMessageLog()` called on menu transitions
- Verify footer renders alongside menu without layout issues
- Verify Enter key opens log modal
- Verify "View Message Log" menu option opens modal

**C02–C05 integration:**
- Each component imports and calls `postMessage()`
- Messages appear in footer and log modal
- Messages clear on next user action

**tui.tsx integration:**
- Footer height reserved correctly
- Menu height adjusted by footer height
- Scrolling works on multi-line messages

### Coverage Threshold

80% line coverage (per CLAUDE.md Testing Requirements). Critical paths:
- Message queue add/clear
- Footer display (latest message)
- Log modal render (reverse-chronological)
- Auto-clear on user action

---

## Notifications

Not applicable (C08 is a notification system, not a consumer).

---

## Scalability

**Per-Session Limits:**
- Queue size: unbounded but cleared at context change / menu return
- Message max text length: 500 characters (longer truncated)
- Modal visible messages: 20 per screen (rest scrollable)

**Performance:** 
- `postMessage()` is O(1) (append to array)
- `clearMessageLog()` is O(1) (array reset)
- Footer render is O(1) (display latest only)
- Log modal render is O(N) where N = queue size (expected N < 100 per session)

**Typical Usage:**
- ~1–5 messages per operation (start, progress, end)
- ~10–50 messages per session (across multiple operations)
- Clears at each context change (bounded per context)

---

## Operational Requirements

**Memory:** Messages are in-memory. Typical session footprint ~1–10 KB (100 messages × ~100 bytes average).

**No persistence:** Queue is ephemeral. App exit loses all messages. User must copy from log modal if archival needed (out of scope).

**No external calls:** C08 does not call APIs, webhooks, or external services.

---

## Version History

### CHG-003 (2026-05-31)

**New:** C08 Status Bar & Message Log component

**API:** `postMessage()`, `clearMessageLog()`, `openMessageLogModal()`

**Testing:** 80% line coverage; critical paths tested

**Next:** Implementation during Development phase
