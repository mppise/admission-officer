---
name: c08-status-bar-core
description: C08 Status Bar & Message Log — Feature specification
---

Architecture refs: 0_Overview.md, 2_UX.md, 7_Observability.md

# C08 — Status Bar & Message Log: Core Specification

---

## Features

| Feature ID | Description | Status | Req Ref |
| :--------- | :---------- | :----- | :------ |
| C08-F01 | Queue status messages from all components | Ready | REQ-0008 |
| C08-F02 | Display footer with current operation status | Ready | REQ-0008 |
| C08-F03 | Log all messages (info, warn, error, success) | Ready | REQ-0008 |
| C08-F04 | Full-screen message log modal | Ready | REQ-0008 |
| C08-F05 | Clear message log on context change | Ready | REQ-0008 |

---

## Acceptance Criteria

### C08-F01: Message Queue

- [ ] Accept messages from C01–C07 via `postMessage(text, type, source?)`
- [ ] Message types: `info`, `warn`, `error`, `success`
- [ ] Queue messages in FIFO order
- [ ] Current message shown in footer; older messages kept in log
- [ ] Max log size: 100 messages (oldest discarded)

### C08-F02: Status Footer

- [ ] Display at bottom of every screen (fixed height, 2 lines)
- [ ] Line 1: Icon + current message text (truncated to 70 chars if needed)
- [ ] Line 2: "[Press Enter to see full log]"
- [ ] Icons: ℹ️ info, ⚠️ warn, ✗ error, ✓ success
- [ ] Updates non-blocking (doesn't freeze menu)

### C08-F03: Message Logging

- [ ] Timestamp each message (ISO 8601)
- [ ] Include source component (e.g., "C03 University Profiler")
- [ ] Store in memory (no persistent log file required)
- [ ] Show all 4 message types clearly

### C08-F04: Message Log Modal

- [ ] Trigger: User presses Enter on footer or selects "View Log" from menu
- [ ] Display all messages in scrollable list
- [ ] Show timestamp, source, type (color-coded), text
- [ ] Controls: ↑/↓ scroll, Escape close
- [ ] Fit within 80×24 terminal

### C08-F05: Clear on Context Change

- [ ] Clear log when: User returns to main menu, switches student context, switches university context
- [ ] Rationale: Reduce confusion from stale messages in new context

---

## Error Handling

- [ ] Queue overflow (100 messages) → discard oldest message silently
- [ ] Very long message (> 1000 chars) → truncate with "..." suffix
