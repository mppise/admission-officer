# ao Architecture (CHG-003: Status Bar)

**Updated:** 2026-05-31  
**Scope:** CHG-003 enhancement (Persistent Status Bar & Message Log)

---

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      ao CLI Application                     │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  C01: CLI Shell (Menu & Navigation)                  │  │
│  │  ├─ Routes to C02–C06 operations                     │  │
│  │  ├─ Calls postMessage() for user actions            │  │
│  │  └─ Integrates C08 status bar + log modal access    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │   C02    │   C03    │   C04    │   C05    │   C06    │  │
│  │ Student  │ Univ.    │ Guidance │  Essay   │   PDF    │  │
│  │ Profile  │ Profile  │ Engine   │ Advisor  │ Exporter │  │
│  │          │          │          │          │          │  │
│  │ Calls postMessage() on key operations (all types)    │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  C08: Status Bar & Message Log (NEW)                 │  │
│  │  ├─ Exports: postMessage(text, type)                │  │
│  │  ├─ Exports: clearMessageLog(context)               │  │
│  │  ├─ Maintains: in-memory message queue              │  │
│  │  └─ Renders: footer + log modal                     │  │
│  │                                                     │  │
│  │  Queue lifecycle: session-based (clears on context  │  │
│  │  change or return to main menu)                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────── Footer ──────────────────┐   │
│  │ Building university profile...                      │   │
│  └─────────────────────────────────────────────────────┘   │
│  (Fixed at absolute bottom; multi-line scrollable)         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## C08: Status Bar & Message Log

### Responsibilities

1. **Message Queue** — In-memory FIFO queue
   - Message type: `{ text: string, type: 'progress'|'warning'|'error'|'success', timestamp: Date }`
   - Session-based lifecycle: cleared when user changes student context or navigates to main menu
   - No size limit (assumed session stays bounded)

2. **Footer Display** — Always-visible status bar at screen bottom
   - Shows latest message only (plain text)
   - Multi-line with arrow-key scrolling if text exceeds terminal width
   - Reserved height in menu layout

3. **Log Modal** — Full-screen view of message history
   - Reverse-chronological (newest first)
   - Shows timestamp + message type icon + text per message
   - Accessible via Enter key on footer OR "View Message Log" menu option

4. **Integration API**
   - `postMessage(text: string, type: MessageType)` — called by C01–C07
   - `clearMessageLog(context: 'context-change'|'menu-return')` — called by C01 on transitions
   - `openMessageLogModal()` — called by C01 on user request

### Data Flow

```
C01–C07 Operations
         ↓
    postMessage()
         ↓
C08 Queue (add message)
         ↓
C08 Footer (render latest)
         ↓
User views via log modal
         ↓
C08 Modal (display all, reverse-chrono)
```

### File Structure

```
src/components/c08-status-bar/
├── index.ts                      (exported API)
├── messageQueue.ts               (queue management)
├── statusFooter.tsx              (footer component)
├── messageLogModal.tsx            (log modal component)
└── types.ts                       (message types)
```

---

## Integration Points

### C01 (CLI Shell)
- Imports `postMessage` from C08
- Posts "Menu selected: <option>" on user navigation
- Calls `clearMessageLog('menu-return')` when returning to root menu
- Integrates status footer component (reserves space at bottom)
- Integrates "View Message Log" menu option

### C02–C05 (Operations)
- Import `postMessage` from C08
- Post messages on operation start/end/error:
  - **C02** (Student Profile): "Building profile...", "Profile saved", "Profile updated"
  - **C03** (University Profile): "Scraping university...", "University profile saved"
  - **C04** (Guidance Engine): "Generating guidance...", "Guidance saved"
  - **C05** (Essay Advisor): "Generating essay outline...", "Essay saved"

### C06 (PDF Exporter)
- Imports `postMessage` from C08
- Posts "Exporting to PDF...", "PDF exported", or error messages

### C07 (Bootstrap)
- No direct message posting (infrastructure only)
- Calls `clearMessageLog('context-change')` when student context changes

### tui.tsx (Shared TUI Utilities)
- Integrates C08 footer as a fixed-height component
- Reduces menu height by footer height
- Supports Enter key on footer to open log modal

---

## Message Types (REQ-0022)

| Type | Emoji | Example | Auto-clear | Color |
|---|---|---|---|---|
| `progress` | ⏳ | "Building profile..." | On next action | Gray |
| `warning` | ⚠️ | "API rate limit approaching" | On next action | Yellow |
| `error` | ❌ | "PDF export failed" | On next action | Red |
| `success` | ✅ | "Profile saved" | On next action | Green |

---

## Lifecycle: Session-Based Queue Clearing (D-ARCH-AO000010)

**Queue cleared when:**
1. User changes student context (C07 bootstrap on new student selection)
2. User navigates back to main menu from any sub-screen

**Queue NOT cleared:**
- Between menu selections within same student context
- On error (message remains visible until next action)
- On successful operation (message remains visible until user acts)

**Rationale:** Messages are contextual to current operation. Clearing on context change prevents confusion; clearing on main menu return provides clean slate for next workflow.

---

## Footer Layout (D-ARCH-AO000011)

- **Position:** Fixed at absolute bottom of terminal
- **Height:** 2 lines (1 for message, 1 for padding)
- **Content:** Latest message (scrollable if longer than terminal width)
- **Menu Integration:** Menu height = terminal height - footer height

**Arrow-Key Scrolling (REQ-0025):**
- If message exceeds terminal width, user can press ← → to scroll
- Display window shows context (e.g., "...end of message...")

---

## Log Modal Access (D-ARCH-AO000012)

**Entry Point 1: Footer (Press Enter)**
- User focuses footer (already rendered)
- Presses Enter → open log modal
- Returns to menu when user presses Escape or Enter

**Entry Point 2: Main Menu**
- "View Message Log" option added peer to "Config"
- Opens same modal
- Returns to menu when user presses Escape or Enter

**Modal Content:**
- Header: "Message Log (Newest First)"
- List: each message with `[HH:mm:ss] [Type] Message text`
- Footer: instructions "[ up/down ] scroll · [ esc ] close"

---

## Decision Map

| Decision | ID | Status |
|---|---|---|
| C08 as dedicated component | D-ARCH-AO000009 | ✅ Approved |
| Global `postMessage()` API | D-ARCH-AO000010 | ✅ Approved |
| Session-based queue clearing | D-ARCH-AO000011 | ✅ Approved |
| Fixed footer layout | D-ARCH-AO000012 | ✅ Approved |
| Dual-access log modal | D-ARCH-AO000013 | ✅ Approved |

---

## Next: Component Specification (Stage 2)

Will create:
- `./SPECS/components/c08-status-bar/A_Core_Spec.md` — features (F01–F05)
- `./SPECS/components/c08-status-bar/B_Specification.md` — interfaces, error handling, testing
