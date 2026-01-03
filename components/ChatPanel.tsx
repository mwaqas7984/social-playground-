'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '@/lib/types';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lbjymipntzjczegvunyn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxianltaXBudHpqY3plZ3Z1bnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzU2NzUsImV4cCI6MjA4Mjk1MTY3NX0.ebRmcLR2RCV9H5Nrmh2IlURbZ8u32zvNUnmQ0adL73c';

interface ChatPanelProps {
  roomId: string;
}

export function ChatPanel({ roomId }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    console.log(`💬 ChatPanel joining room: ${roomId}`);
    
    const channel = supabase.channel(`room:${roomId}`);
    
    channel
      .on('broadcast', { event: 'chat-message' }, (payload: any) => {
        console.log('💬 Received message:', payload);
        const message: ChatMessage = {
          id: crypto.randomUUID(),
          userId: payload.userId,
          content: payload.message,
          timestamp: payload.timestamp
        };
        setMessages(prev => [...prev, message]);
      })
      .subscribe((status: any) => {
        console.log('💬 Chat channel status:', status);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          console.log('✅ ChatPanel connected!');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (newMessage.trim() && channelRef.current) {
      const message = {
        userId: localStorage.getItem('sessionId') || 'anonymous',
        message: newMessage.trim(),
        timestamp: Date.now()
      };
      
      console.log('💬 Sending message:', message);
      
      channelRef.current.send({
        type: 'broadcast',
        event: 'chat-message',
        payload: message
      });
      
      setNewMessage('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-800">
      {/* Chat Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Chat</h3>
          <div className={`px-2 py-1 rounded-full text-xs ${
            isConnected ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
          }`}>
            {isConnected ? 'Connected' : 'Connecting...'}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            <div className="text-4xl mb-2">💬</div>
            <p>Start a conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`p-3 rounded-lg ${
                message.userId === localStorage.getItem('sessionId')
                  ? 'bg-purple-600/20 ml-8'
                  : 'bg-slate-700 mr-8'
              }`}
            >
              <p className="text-white text-sm">{message.content}</p>
              <p className="text-xs text-slate-400 mt-1">
                {message.userId === localStorage.getItem('sessionId') ? 'You' : 'Partner'} • 
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 bg-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || !isConnected}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
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
