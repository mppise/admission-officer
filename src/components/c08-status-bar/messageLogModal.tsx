// [C08-F04, C08-F05] Message log modal: full-screen view, reverse-chronological, accessible via Enter or menu

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Message, MESSAGE_TYPE_ICONS } from './types.js';

interface MessageLogModalProps {
  messages: Message[];
  isOpen: boolean;
  onClose: () => void;
}

/**
 * [C08-F04] Full-screen message log modal with reverse-chronological display
 */
export const MessageLogModal: React.FC<MessageLogModalProps> = ({
  messages,
  isOpen,
  onClose,
}) => {
  const [scrollPosition, setScrollPosition] = useState(0);

  if (!isOpen) {
    return null;
  }

  // [C08-F04] Sort reverse-chronological (newest first)
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Visible messages per screen (max 20)
  const maxVisible = 20;
  const visibleMessages = sortedMessages.slice(scrollPosition, scrollPosition + maxVisible);

  const formatTimestamp = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  return (
    <Box flexDirection="column" width="100%">
      <Box paddingX={1} paddingY={1} borderStyle="round" borderColor="cyan">
        <Text bold>Message Log (Newest First)</Text>
      </Box>

      <Box flexDirection="column" width="100%" paddingX={1}>
        {visibleMessages.length === 0 ? (
          <Text dimColor>No messages</Text>
        ) : (
          visibleMessages.map((msg) => (
            <Text key={msg.id}>
              [{formatTimestamp(msg.timestamp)}] {MESSAGE_TYPE_ICONS[msg.type]} {msg.text}
            </Text>
          ))
        )}
      </Box>

      <Box paddingX={1} paddingY={1} borderStyle="round" borderColor="cyan">
        <Text dimColor>[ ↑ ↓ ] scroll · [ esc ] close</Text>
      </Box>
    </Box>
  );
};

export default MessageLogModal;
