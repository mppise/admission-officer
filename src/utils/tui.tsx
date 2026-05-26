import React, { useState } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import { TextInput } from '@inkjs/ui';

// ─── Shared full-screen TUI layout and prompt helpers ─────────────────────────
//
// Used by C02 Student Profile and C05 Essay Advisor for consistent full-screen
// ink-based menus and input screens.

export interface SelectItem {
  label: string;
  value: string;
  separator?: boolean;
}

// ─── Layout ───────────────────────────────────────────────────────────────────

interface ProfileScreenProps {
  subtitle: string;
  contextLine?: string;
  children: React.ReactNode;
  footerHint?: string;
}

export function AppScreen({ subtitle, contextLine, children, footerHint }: ProfileScreenProps) {
  const cols = process.stdout.columns ?? 80;
  const divider = '─'.repeat(Math.min(cols - 4, 76));
  return (
    <Box flexDirection="column" minHeight={process.stdout.rows ?? 24}>
      {/* HEADER */}
      <Box flexDirection="column" paddingX={3} paddingTop={1} paddingBottom={0}>
        <Text bold color="cyan">{'  ██████╗  ██████╗'}</Text>
        <Text bold color="cyan">{'  ██╔══██╗██╔═══██╗   ao — Admissions Officer'}</Text>
        <Text bold color="cyan">{'  ███████║██║   ██║'}</Text>
        <Text bold color="cyan">{'  ██╔══██║██║   ██║'}</Text>
        <Text bold color="cyan">{'  ██║  ██║╚██████╔╝   '}<Text color="white" bold>{subtitle}</Text></Text>
        <Text bold color="cyan">{'  ╚═╝  ╚═╝ ╚═════╝'}</Text>
      </Box>
      <Box paddingX={3} paddingBottom={1}>
        <Text dimColor>{divider}</Text>
      </Box>
      {contextLine !== undefined && contextLine !== '' && (
        <Box paddingX={4} paddingBottom={1}>
          <Text bold color="white">  {contextLine}</Text>
        </Box>
      )}

      {/* CONTENT */}
      <Box flexGrow={1} flexDirection="column" paddingX={4} paddingY={1}>
        {children}
      </Box>

      {/* FOOTER */}
      <Box paddingX={4} paddingBottom={1}>
        <Text dimColor>{divider}</Text>
      </Box>
      <Box paddingX={4} paddingBottom={1}>
        <Text dimColor>{footerHint ?? '  ↑ ↓  navigate    Enter  select'}</Text>
      </Box>
    </Box>
  );
}

// ─── Custom spacious select ───────────────────────────────────────────────────

// Separator items are rendered as dimmed divider lines and skipped by navigation.
export function SpaciousSelect({ items, onSelect }: { items: SelectItem[]; onSelect: (val: string) => void }) {
  const navigable = items.filter(i => !i.separator);
  const [cursor, setCursor] = useState(0);

  useInput((_ch, key) => {
    if (key.upArrow) {
      setCursor(c => (c - 1 + navigable.length) % navigable.length);
    } else if (key.downArrow) {
      setCursor(c => (c + 1) % navigable.length);
    } else if (key.return) {
      const selected = navigable[cursor];
      if (selected) onSelect(selected.value);
    }
  });

  let navIdx = -1;
  return (
    <Box flexDirection="column">
      {items.map((item, i) => {
        if (item.separator) {
          return (
            <Box key={i} paddingLeft={2}>
              <Text dimColor>{'  ─────────────────────────────────'}</Text>
            </Box>
          );
        }
        navIdx++;
        const isActive = navIdx === cursor;
        return (
          <Box key={i} paddingLeft={2}>
            <Text bold={isActive} color={isActive ? 'cyan' : undefined}>
              {isActive ? '❯  ' : '   '}{item.label}
            </Text>
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
): Promise<string> {
  const ctx = completionPill
    ? `${contextLine ?? ''}   ${completionPill}`
    : (contextLine ?? '');
  return new Promise(resolve => {
    let resolved = false;
    function SelectScreen() {
      const { exit } = useApp();
      return (
        <AppScreen subtitle={subtitle} contextLine={ctx}>
          <SpaciousSelect
            items={items}
            onSelect={val => {
              if (!resolved) { resolved = true; exit(); resolve(val); }
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
): Promise<string> {
  return new Promise(resolve => {
    function InputScreen() {
      const [value, setValue] = useState(initial);
      const { exit } = useApp();
      useInput((_input, key) => {
        if (key.return) { exit(); resolve(value); }
      });
      return (
        <AppScreen subtitle={subtitle} contextLine={contextLine} footerHint="  Type your answer    Enter  confirm">
          <Box marginBottom={1} paddingLeft={2}>
            <Text bold color="cyan">{prompt} </Text>
          </Box>
          <Box paddingLeft={2}>
            <TextInput
              placeholder=""
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
