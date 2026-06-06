import React, { useState, useEffect } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import { TextInput } from '@inkjs/ui';
import { getCurrentMessage, getAllMessages, StatusFooter, MessageLogModal } from '../components/c08-status-bar/index.js';
import type { Message } from '../components/c08-status-bar/index.js';

// ─── Shared full-screen TUI layout and prompt helpers ─────────────────────────
//
// Used by C02 Student Profile and C05 Essay Advisor for consistent full-screen
// ink-based menus and input screens.

export interface SelectItem {
  label: string;
  value: string;
  separator?: boolean;
}

// ─── Dot-leader alignment helper ─────────────────────────────────────────────
// Pads label to `width` with · characters, then appends status.
export function dotLeader(label: string, status: string, width = 28): string {
  const gap = Math.max(2, width - label.length);
  return `${label}${'·'.repeat(gap)}${status}`;
}

// ─── Modal open callback ──────────────────────────────────────────────────────
// AppScreen registers its setModalOpen setter here so openMessageLogModal()
// (called from anywhere) can trigger the modal without access to React state.
// There is only ever one AppScreen mounted at a time, so a module-level ref is safe.

type SetModalOpen = (open: boolean) => void;
let _setModalOpen: SetModalOpen | null = null;

export function registerModalOpener(setter: SetModalOpen): void {
  _setModalOpen = setter;
}

export function unregisterModalOpener(): void {
  _setModalOpen = null;
}

export function triggerOpenMessageLogModal(): void {
  if (_setModalOpen) {
    _setModalOpen(true);
  }
}

// ─── Layout ───────────────────────────────────────────────────────────────────

interface AppScreenProps {
  subtitle: string;
  contextLine?: string;
  hint?: string;
  children: React.ReactNode;
  footerHint?: string;
  footerEsc?: string;
}

export function AppScreen({ subtitle, contextLine, hint, children, footerHint, footerEsc }: AppScreenProps) {
  const cols = Math.min(process.stdout.columns ?? 80, 100);
  const bar = '▓▒░' + '─'.repeat(Math.max(0, cols - 10)) + '░▒▓';

  const [currentMsg, setCurrentMsg] = useState<Message | null>(getCurrentMessage());
  const [allMsgs, setAllMsgs] = useState<Message[]>(getAllMessages());
  const [modalOpen, setModalOpen] = useState(false);

  // Register the modal opener so external callers (openMessageLogModal) can trigger it
  useEffect(() => {
    registerModalOpener(setModalOpen);
    return () => {
      unregisterModalOpener();
    };
  }, []);

  // Poll for new messages every 250 ms so the footer stays current while Gemini / Playwright run
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMsg(getCurrentMessage());
      setAllMsgs(getAllMessages());
    }, 250);
    return () => clearInterval(interval);
  }, []);

  // Esc closes the modal when it is open; do not propagate to the underlying menu
  useInput((_ch, key) => {
    if (modalOpen && key.escape) {
      setModalOpen(false);
    }
  });

  if (modalOpen) {
    return (
      <MessageLogModal
        messages={allMsgs}
        isOpen={true}
        onClose={() => setModalOpen(false)}
      />
    );
  }

  return (
    <Box flexDirection="column" minHeight={process.stdout.rows ?? 24}>

      {/* HEADER — compact wordmark */}
      <Box flexDirection="column" paddingX={3} paddingTop={1} paddingBottom={0}>
        <Box>
          <Text bold color="magenta">ao </Text>
          <Text bold color="white">Admissions Officer  </Text>
          <Text dimColor color="magenta">/ </Text>
          <Text bold color="cyan"> {subtitle}</Text>
        </Box>
        <Box paddingTop={0}>
          <Text color="magenta">{bar}</Text>
        </Box>
      </Box>

      {/* STUDENT NAME + COMPLETION PILL */}
      {contextLine !== undefined && contextLine !== '' && (
        <Box paddingX={5} paddingTop={1} paddingBottom={0}>
          <Text color="white" bold>  {contextLine}</Text>
        </Box>
      )}

      {/* GUIDANCE HINT — callout box */}
      {hint !== undefined && hint !== '' && (
        <Box paddingX={5} paddingTop={1} paddingBottom={0}>
          <Text color="yellow">  ╌ </Text>
          <Text color="yellow">{hint}</Text>
        </Box>
      )}

      {/* CONTENT */}
      <Box flexGrow={1} flexDirection="column" paddingX={4} paddingY={1}>
        {children}
      </Box>

      {/* STATUS FOOTER — latest C08 message */}
      <Box paddingX={4} paddingBottom={0}>
        <StatusFooter currentMessage={currentMsg} onEnter={() => setModalOpen(true)} />
      </Box>

      {/* FOOTER */}
      <Box paddingX={5} paddingBottom={1}>
        <Text color="magenta">  [ ↑↓ ] </Text>
        <Text color="white"> navigate  </Text>
        <Text color="magenta">[ ↵ ] </Text>
        <Text color="white"> {footerHint ?? 'select'}  </Text>
        <Text color="magenta">[ {footerEsc ?? 'esc'} ] </Text>
        <Text color="white"> {footerEsc ? 'exit' : 'back'}</Text>
      </Box>

    </Box>
  );
}

// ─── Custom spacious select ───────────────────────────────────────────────────

// Separator items render as a full-width dimmed rule; navigation skips them.
export function SpaciousSelect({ items, onSelect, onEscape }: { items: SelectItem[]; onSelect: (val: string) => void; onEscape?: () => void }) {
  const navigable = items.filter(i => !i.separator);
  const [cursor, setCursor] = useState(0);
  const cols = Math.min(process.stdout.columns ?? 80, 100);

  useInput((_ch, key) => {
    if (key.upArrow)   setCursor(c => (c - 1 + navigable.length) % navigable.length);
    if (key.downArrow) setCursor(c => (c + 1) % navigable.length);
    if (key.return) {
      const selected = navigable[cursor];
      if (selected) onSelect(selected.value);
    }
    if (key.escape && onEscape) onEscape();
  });

  let navIdx = -1;
  return (
    <Box flexDirection="column">
      {items.map((item, i) => {
        if (item.separator) {
          return (
            <Box key={i} paddingLeft={2} paddingTop={1} paddingBottom={1}>
              <Text dimColor>{'  ' + '╌'.repeat(Math.min(cols - 10, 50))}</Text>
            </Box>
          );
        }
        navIdx++;
        const isActive = navIdx === cursor;
        return (
          <Box key={i} paddingLeft={2} paddingBottom={0}>
            {isActive
              ? (
                <Text>
                  <Text bold color="magenta">▌ </Text>
                  <Text bold color="white" backgroundColor="black"> {item.label} </Text>
                </Text>
              )
              : (
                <Text color="white">{'  '}{item.label}</Text>
              )
            }
          </Box>
        );
      })}
    </Box>
  );
}

// ─── Prompt helpers ───────────────────────────────────────────────────────────

export function waitForSelect(
  items: SelectItem[],
  subtitle: string,
  contextLine?: string,
  completionPill?: string,
  hint?: string,
): Promise<string> {
  const ctx = completionPill
    ? `${contextLine ?? ''}   ${completionPill}`
    : (contextLine ?? '');
  return new Promise(resolve => {
    let resolved = false;
    function SelectScreen() {
      const { exit } = useApp();
      return (
        <AppScreen subtitle={subtitle} contextLine={ctx} hint={hint}>
          <SpaciousSelect
            items={items}
            onSelect={val => {
              if (!resolved) { resolved = true; exit(); resolve(val); }
            }}
            onEscape={() => {
              if (!resolved) { resolved = true; exit(); resolve('__esc'); }
            }}
          />
        </AppScreen>
      );
    }
    render(<SelectScreen />);
  });
}

export function waitForText(
  prompt: string,
  initial: string,
  subtitle: string,
  contextLine?: string,
  hint?: string,
): Promise<string> {
  return new Promise(resolve => {
    function InputScreen() {
      const [value, setValue] = useState(initial);
      const { exit } = useApp();
      useInput((_input, key) => {
        if (key.return) { exit(); resolve(value); }
        if (key.escape) { exit(); resolve(''); }
      });
      return (
        <AppScreen subtitle={subtitle} contextLine={contextLine} hint={hint} footerHint="confirm">
          <Box paddingLeft={2} paddingBottom={1}>
            <Text bold color="cyan">  › </Text>
            <Text bold color="white">{prompt}</Text>
          </Box>
          <Box paddingLeft={2} paddingBottom={1}>
            <Text color="magenta" bold>  ❯ </Text>
            <TextInput
              placeholder="type here…"
              defaultValue={initial}
              onChange={setValue}
              onSubmit={val => { exit(); resolve(val); }}
            />
          </Box>
        </AppScreen>
      );
    }
    render(<InputScreen />);
  });
}

// Yes / No confirmation screen
export function waitForConfirm(
  message: string,
  subtitle: string,
  contextLine?: string,
): Promise<boolean> {
  return waitForSelect(
    [
      { label: 'Yes', value: 'yes' },
      { label: 'No',  value: 'no'  },
    ],
    subtitle,
    contextLine,
  ).then(v => v === 'yes');
}

// [C01-F11] Spinner overlay — renders while a long-running promise is in flight
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export function withSpinner<T>(
  promise: Promise<T>,
  message: string,
  subtitle: string,
  contextLine?: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let done = false;

    function SpinnerScreen() {
      const [frame, setFrame] = useState(0);
      const { exit } = useApp();

      useEffect(() => {
        const interval = setInterval(() => setFrame(f => (f + 1) % SPINNER_FRAMES.length), 80);
        return () => clearInterval(interval);
      }, []);

      useEffect(() => {
        promise.then(
          val => { if (!done) { done = true; exit(); resolve(val); } },
          err => { if (!done) { done = true; exit(); reject(err as Error); } },
        );
      }, []); // promise ref is stable for the lifetime of this render

      return (
        <AppScreen subtitle={subtitle} contextLine={contextLine}>
          <Box paddingLeft={4} paddingTop={2}>
            <Text bold color="magenta">{SPINNER_FRAMES[frame]} </Text>
            <Text color="white">{message}</Text>
          </Box>
        </AppScreen>
      );
    }

    render(<SpinnerScreen />);
  });
}
