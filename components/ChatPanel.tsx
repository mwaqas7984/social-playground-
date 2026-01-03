'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '@/lib/types';
import { RealtimeClient } from '@/lib/realtimeClient';

interface ChatPanelProps {
  roomId: string;
}

export function ChatPanel({ roomId }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const realtimeClientRef = useRef<RealtimeClient | null>(null);

  useEffect(() => {
    const initChat = async () => {
      const client = new RealtimeClient();
      realtimeClientRef.current = client;

      await client.joinRoom(roomId, {
        onActivityMessage: (message) => {
          if (message.type === 'chat-message' && message.activityType === 'chat') {
            setMessages(prev => [...prev, message.payload as ChatMessage]);
          }
        }
      });
    };

    initChat();

    return () => {
      if (realtimeClientRef.current) {
        realtimeClientRef.current.leaveRoom(roomId);
      }
    };
  }, [roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!newMessage.trim() || !realtimeClientRef.current) return;

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      userId: localStorage.getItem('sessionId') || 'anonymous',
      content: newMessage.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, message]);
    realtimeClientRef.current.sendActivityMessage(roomId, {
      type: 'chat-message',
      activityType: 'chat',
      payload: message
    });

    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4 h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-4">Chat</h3>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-2">
        {messages.length === 0 ? (
          <div className="text-center text-slate-400 py-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`p-2 rounded-lg ${
                message.userId === localStorage.getItem('sessionId')
                  ? 'bg-blue-600/20 ml-4'
                  : 'bg-slate-700/50 mr-4'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <p className="text-xs text-slate-400 mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>
          ))
        )}
        {isTyping && (
          <div className="text-slate-400 text-sm italic">
            Partner is typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={sendMessage}
          disabled={!newMessage.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </div>
  );
}
