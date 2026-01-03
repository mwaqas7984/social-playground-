"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://lbjymipntzjczegvunyn.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxianltaXBudHpqY3plZ3Z1bnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzU2NzUsImV4cCI6MjA4Mjk1MTY3NX0.ebRmcLR2RCV9H5Nrmh2IlURbZ8u32zvNUnmQ0adL73c";

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;
  
  const [messages, setMessages] = useState<Array<{id: string, userId: string, text: string, timestamp: number}>>([]);
  const [newMessage, setNewMessage] = useState("");
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const [userId] = useState(() => `user-${Math.random().toString(36).substr(2, 9)}`);
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  useEffect(() => {
    console.log(`🏠 Joining room: ${roomId}`);
    
    // Join room channel
    const channel = supabase.channel(`room:${roomId}`);
    
    channel
      .on("broadcast", { event: "chat-message" }, (payload: any) => {
        console.log("💬 Received message:", payload);
        if (payload.payload.userId !== userId) {
          setMessages(prev => [...prev, payload.payload]);
        }
      })
      .on("broadcast", { event: "user-joined" }, (payload: any) => {
        console.log("🤝 User joined:", payload);
        if (payload.payload.userId !== userId) {
          setPartnerId(payload.payload.userId);
        }
      })
      .on("presence", { event: "sync" }, () => {
        console.log("📡 Presence sync");
        setIsConnected(true);
      })
      .subscribe((status) => {
        console.log("📡 Subscription status:", status);
        if (status === "SUBSCRIBED") {
          setIsConnected(true);
          // Announce our presence
          channel.send({
            type: "broadcast",
            event: "user-joined",
            payload: { userId, timestamp: Date.now() }
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, userId]);

  const sendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        id: `msg-${Date.now()}`,
        userId,
        text: newMessage,
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, message]);
      
      const channel = supabase.channel(`room:${roomId}`);
      channel.send({
        type: "broadcast",
        event: "chat-message",
        payload: message
      });
      
      setNewMessage("");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold">Room: {roomId}</h1>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400" : "bg-red-400"}`}></div>
            <span className="text-sm">{isConnected ? "Connected" : "Connecting..."}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">
              {partnerId ? `Chatting with ${partnerId.substr(0, 8)}...` : "Waiting for partner..."}
            </h2>
            
            {/* Chat Messages */}
            <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto mb-4">
              {messages.length === 0 ? (
                <p className="text-gray-500 text-center">Say hi! 👋</p>
              ) : (
                <div className="space-y-2">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-2 rounded ${
                        msg.userId === userId
                          ? "bg-blue-600 ml-auto max-w-[70%]"
                          : "bg-gray-700 mr-auto max-w-[70%]"
                      }`}
                    >
                      <p className="text-sm">{msg.text}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {msg.userId === userId ? "You" : msg.userId.substr(0, 8)} • {new Date(msg.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={sendMessage}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
