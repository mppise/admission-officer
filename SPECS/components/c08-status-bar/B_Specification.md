---
name: c08-spec
description: Implementation specification for C08 Status Bar
---

# C08 Status Bar — Implementation Specification

---

## 1. Interfaces

```typescript
interface StatusMessage {
  id: string
  text: string
  timestamp: Date
  status: 'pending' | 'done' | 'error'
}

export function enqueueMessage(text: string, status?: 'pending' | 'done' | 'error'): void
export function dequeueMessage(id: string): StatusMessage | undefined
export function flushQueue(): void
export function getQueue(): StatusMessage[]
export function showMessageModal(): void
export function hideMessageModal(): void
```

---

## 2. Message Queue Implementation

**Singleton instance:** messageQueue (module-level variable)

```typescript
const messageQueue: StatusMessage[] = []
const MAX_VISIBLE = 5

function enqueueMessage(text: string, status: 'pending' | 'done' | 'error' = 'pending') {
  const msg: StatusMessage = {
    id: generateId(),
    text,
    timestamp: new Date(),
    status,
  }
  messageQueue.push(msg)
  if (messageQueue.length > MAX_VISIBLE) {
    messageQueue.shift() // Drop oldest
  }
  // Trigger re-render via setState in React component
}
```

---

## 3. Rendering

**Component:** statusFooter.tsx

- Renders at bottom of AppScreen
- Shows current message (most recent, or "Ready" if empty)
- Color: green for 'done', yellow for 'pending', red for 'error'
- Text: max 100 chars (truncate with "...")

**Component:** messageLogModal.tsx

- Overlay modal showing full message history
- Timestamp, status color, full text
- Toggle with Ctrl+M keyboard shortcut
- Dismiss with Escape

---

## 4. Integration Points

**Emitted by:**
- C03 (buildUniversityProfile): "Scraping... 23/100 pages", "Extracting... batch 2 of 5"
- C04 (buildGuidance): "Generating guidance...", "✓ Guidance complete"
- C05 (buildEssay): "Generating essay outline...", "✓ Essay ready"
- C06 (exportToPdf): "Rendering PDF...", "✓ PDF exported"

**Lifecycle:**
- Operation start: enqueueMessage("Operation...", 'pending')
- Intermediate progress: enqueueMessage("Operation... 50% complete", 'pending')
- Success: enqueueMessage("✓ Operation complete", 'done')
- Error: enqueueMessage("✗ Operation failed: [reason]", 'error')
- Auto-clear: Remove 'done' messages after 10 seconds

---

## 5. Testing

**Critical path:** Enqueue → render footer → modal shows → dismiss

---

## 6. Changes & Revisions

| Date | Description |
|:---|:---|
| 2026-05-31 | Initial spec |
