// [C08-F02, C08-F03] Status bar footer component: render latest message (plain text) at bottom of screen; support multi-line scrolling

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Message, MessageType, MESSAGE_TYPE_ICONS } from './types.js';

interface StatusFooterProps {
  currentMessage: Message | null;
  onEnter?: () => void; // Callback for opening log modal
}

/**
 * [C08-F02, C08-F03] Footer component that displays latest message with type icon
 */
export const StatusFooter: React.FC<StatusFooterProps> = ({ currentMessage, onEnter }) => {
  const [scrollOffset, setScrollOffset] = useState(0);

  if (!currentMessage) {
    return (
      <Box borderStyle="round" borderColor="gray" width="100%" height={2} backgroundColor="gray">
        <Box width="100%" paddingX={1}>
          <Text dimColor>(no messages)</Text>
        </Box>
      </Box>
    );
  }

  // [C08-F03] Message type icon (plain text version, actual rendering uses emoji)
  const icon = MESSAGE_TYPE_ICONS[currentMessage.type] || '•';
  const messageText = `${icon} ${currentMessage.text}`;

  // [C08-F02] Truncate for display (max width consideration)
  // In a real terminal, this would be based on terminal width
  const maxDisplayWidth = 80;
  let displayText = messageText;
  let showScrollIndicator = false;

  if (messageText.length > maxDisplayWidth) {
    displayText = messageText.substring(scrollOffset, scrollOffset + maxDisplayWidth);
    showScrollIndicator = true;
  }

  return (
    <Box borderStyle="round" borderColor="gray" width="100%" height={2} backgroundColor="gray">
      <Box width="100%" paddingX={1}>
        <Text>{displayText}</Text>
      </Box>
      {showScrollIndicator && (
        <Box position="absolute" right={1}>
          <Text dimColor>([ → ] more)</Text>
        </Box>
      )}
    </Box>
  );
};

export default StatusFooter;
