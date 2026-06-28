import { useState, useEffect, useRef } from 'react';
import { ChatMessage, ToolCall } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export function useAIChat(userId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Load conversation ID and history on mount/userId change
  useEffect(() => {
    if (!userId) return;
    const persistedId = sessionStorage.getItem(`chronos_conv_${userId}`);
    if (persistedId) {
      setConversationId(persistedId);
      // Fetch history from API
      fetch(`/api/ai/chat?conversationId=${persistedId}&userId=${userId}`)
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('Failed to fetch history');
        })
        .then((data) => {
          if (data.messages) {
            // Convert timestamps back to Date objects
            const loaded = data.messages.map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp),
            }));
            setMessages(loaded);
          }
        })
        .catch((err) => console.error('[useAIChat] Error loading history:', err));
    } else {
      setMessages([]);
      setConversationId(null);
    }
  }, [userId]);

  const clearChat = () => {
    setMessages([]);
    setConversationId(null);
    if (userId) {
      sessionStorage.removeItem(`chronos_conv_${userId}`);
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isStreaming) return;

    setIsStreaming(true);

    // 1. Append User Message
    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);

    // 2. Prepare Placeholder Assistant Message
    const assistantMsgId = uuidv4();
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      toolCalls: [],
      isStreaming: true,
    };

    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationId,
          userId,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to connect to chat stream');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const jsonStr = trimmed.substring(6).trim();
          if (!jsonStr) continue;

          const event = JSON.parse(jsonStr);

          if (event.type === 'setup') {
            setConversationId(event.conversationId);
            if (userId) {
              sessionStorage.setItem(`chronos_conv_${userId}`, event.conversationId);
            }
          } else if (event.type === 'text') {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? { ...msg, content: msg.content + event.content }
                  : msg
              )
            );
          } else if (event.type === 'tool_call') {
            setMessages((prev) =>
              prev.map((msg) => {
                if (msg.id === assistantMsgId) {
                  const calls = msg.toolCalls ? [...msg.toolCalls] : [];
                  calls.push({
                    name: event.name,
                    args: event.args || {},
                  });
                  return { ...msg, toolCalls: calls };
                }
                return msg;
              })
            );
          } else if (event.type === 'tool_result') {
            setMessages((prev) =>
              prev.map((msg) => {
                if (msg.id === assistantMsgId) {
                  const calls = msg.toolCalls
                    ? msg.toolCalls.map((tc) =>
                        tc.name === event.name && !tc.result
                          ? { ...tc, result: event.result }
                          : tc
                      )
                    : [];
                  return { ...msg, toolCalls: calls };
                }
                return msg;
              })
            );
          } else if (event.type === 'error') {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? { ...msg, content: 'Error: ' + event.error, isStreaming: false }
                  : msg
              )
            );
          } else if (event.type === 'done') {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId ? { ...msg, isStreaming: false } : msg
              )
            );
          }
        }
      }
    } catch (err: any) {
      console.error('[useAIChat] Stream parsing error:', err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? { ...msg, content: 'Failed to stream response: ' + (err.message || 'Unknown error'), isStreaming: false }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  return {
    messages,
    sendMessage,
    isStreaming,
    clearChat,
    conversationId,
  };
}
