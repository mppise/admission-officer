---
name: c08-core-spec
description: Core spec for C08 Status Bar
---

# C08 Status Bar — Core Specification

**Component:** Status Bar  
**Purpose:** Real-time feedback on async operations (scraping, AI calls, file I/O)  
**Status:** Ready (implementation in progress)

---

## Features

| Feature ID | Description | Status | Req Ref |
|:---|:---|:---|:---|
| C08-F01 | Display status footer with current operation message | Ready | REQ-0012 |
| C08-F02 | Message queue for async operation updates (in-memory FIFO) | Ready | REQ-0012 |
| C08-F03 | Modal display for verbose output (scraping details, token counts) | Ready | REQ-0012 |

---

## Acceptance Criteria

### C08-F01: Status Footer
- [ ] Footer renders at bottom of AppScreen (below main content)
- [ ] Shows current message: e.g., "Scraping... 23/100 pages complete"
- [ ] Message updates without blocking user navigation
- [ ] Message clears on operation completion

### C08-F02: Message Queue
- [ ] Emitted by C03 (scraping progress), C04 (guidance), C05 (essays), C06 (export)
- [ ] FIFO queue; new messages push old ones out (max 5 visible at once)
- [ ] Each message has: text, timestamp, status (pending/done/error)
- [ ] API: enqueueMessage(msg), dequeueMessage(), flushQueue()

### C08-F03: Modal Display
- [ ] Toggle with keyboard shortcut (e.g., Ctrl+M)
- [ ] Shows full message history with timestamps
- [ ] Displays detailed stats: pages, tokens, cost, elapsed time
- [ ] Dismiss with Escape or Ctrl+M again

---

## Error Handling

| Scenario | Behavior |
|:---|:---|
| Message queue overflow | Drop oldest message; keep last 5 |
| Timestamp unavailable | Use relative time (e.g., "30s ago") |
| Invalid status value | Default to 'pending' |

---

## Design Notes

- **Message format:** `{ text: string; timestamp: Date; status: 'pending' | 'done' | 'error' }`
- **Rendering:** Bottom footer in AppScreen; modal overlay on demand
- **Non-blocking:** Messages do not interrupt user interaction; updates async
- **Lifecycle:** Messages auto-clear after 10 seconds (or user dismisses modal)
