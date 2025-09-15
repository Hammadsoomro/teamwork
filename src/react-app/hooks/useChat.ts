import { useState, useEffect, useCallback } from 'react';
import { useApi } from './useApi';
import { ChatMessage } from '@/shared/types';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { request, loading, error } = useApi();

  const fetchMessages = useCallback(async () => {
    try {
      const data = await request('/api/chat/messages');
      setMessages(data.messages);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  }, [request]);

  const sendMessage = useCallback(async (message: string) => {
    try {
      const data = await request('/api/chat/messages', {
        method: 'POST',
        body: { message },
      });
      
      // Add the new message to the list
      setMessages(prev => [...prev, data.message]);
      
      return data.message;
    } catch (err) {
      console.error('Failed to send message:', err);
      throw err;
    }
  }, [request]);

  useEffect(() => {
    fetchMessages();
    
    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  return {
    messages,
    loading,
    error,
    sendMessage,
    refreshMessages: fetchMessages,
  };
}
