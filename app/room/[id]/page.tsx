"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from '@supabase/supabase-js';
import { useWebRTC } from "@/lib/webrtc";
import { ChatPanel } from "@/components/ChatPanel";
import { VideoPanel } from "@/components/VideoPanel";
import { GamesPanel } from "@/components/GamesPanel";
import { ActivitiesPanel } from "@/components/ActivitiesPanel";
import { StatusBar } from "@/components/StatusBar";

const supabaseUrl = 'https://lbjymipntzjczegvunyn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxianltaXBudHpqY3plZ3Z1bnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzU2NzUsImV4cCI6MjA4Mjk1MTY3NX0.ebRmcLR2RCV9H5Nrmh2IlURbZ8u32zvNUnmQ0adL73c';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;
  
  const [isConnected, setIsConnected] = useState(false);
  const [showGames, setShowGames] = useState(false);
  const [showActivities, setShowActivities] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'waiting' | 'matched' | 'reconnecting'>('connecting');
  const [partnerConnected, setPartnerConnected] = useState(false);
  
  const supabaseRef = useRef<any>(null);
  const channelRef = useRef<any>(null);
  const { localStream, remoteStream, startCall, endCall, toggleCamera, toggleMic } = useWebRTC();

  useEffect(() => {
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      router.push('/');
      return;
    }

    // Initialize Supabase client
    supabaseRef.current = createClient(supabaseUrl, supabaseAnonKey);
    
    console.log(`🏠 Connecting to room: ${roomId}`);
    
    // Join the room channel
    const channel = supabaseRef.current.channel(`room:${roomId}`);
    
    channel
      .on('broadcast', { event: 'partner-joined' }, (payload: any) => {
        console.log('🤝 Partner joined:', payload);
        setPartnerConnected(true);
        setConnectionStatus('matched');
        setIsConnected(true);
      })
      .on('broadcast', { event: 'chat-message' }, (payload: any) => {
        console.log('💬 Chat message received:', payload);
        // Handle chat messages
      })
      .on('broadcast', { event: 'game-action' }, (payload: any) => {
        console.log('🎮 Game action:', payload);
        // Handle game actions
      })
      .on('broadcast', { event: 'activity-event' }, (payload: any) => {
        console.log('🎨 Activity event:', payload);
        // Handle activity events
      })
      .subscribe((status: any) => {
        console.log('📡 Channel status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Joined room successfully');
          setConnectionStatus('waiting');
          
          // Announce that we joined
          channel.send({
            type: 'broadcast',
            event: 'partner-joined',
            payload: { userId: sessionId, timestamp: Date.now() }
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [roomId, router]);

  useEffect(() => {
    // Check if partner is already connected
    const checkPartner = async () => {
      // Simple check - if we're in a room, assume partner might be there
      setTimeout(() => {
        if (connectionStatus === 'waiting') {
          console.log('⏳ Checking for partner...');
          setPartnerConnected(true);
          setConnectionStatus('matched');
          setIsConnected(true);
        }
      }, 2000);
    };

    checkPartner();
  }, [connectionStatus]);

  const handleEndSession = () => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'partner-left',
        payload: { userId: localStorage.getItem('sessionId'), timestamp: Date.now() }
      });
    }
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <StatusBar 
        connectionStatus={connectionStatus}
        isConnected={isConnected}
        partnerConnected={partnerConnected}
        onEndSession={handleEndSession}
      />
      
      <div className="flex-1 flex">
        <div className="flex-1 flex flex-col lg:flex-row">
          {/* Chat Panel - Always Visible */}
          <div className="flex-1 lg:max-w-md border-r border-slate-700">
            <ChatPanel
              isConnected={isConnected}
              onSendMessage={(message) => {
                if (channelRef.current) {
                  channelRef.current.send({
                    type: 'broadcast',
                    event: 'chat-message',
                    payload: { message, userId: localStorage.getItem('sessionId'), timestamp: Date.now() }
                  });
                }
              }}
            />
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col">
            {/* Video Panel */}
            <VideoPanel
              localStream={localStream}
              remoteStream={remoteStream}
              isConnected={isConnected}
              onStartCall={startCall}
              onEndCall={endCall}
              onToggleCamera={toggleCamera}
              onToggleMic={toggleMic}
            />

            {/* Tab Navigation */}
            <div className="border-t border-slate-700">
              <div className="flex border-b border-slate-700">
                <button
                  onClick={() => { setShowGames(false); setShowActivities(false); }}
                  className={`px-6 py-3 font-medium transition-colors ${
                    !showGames && !showActivities
                      ? 'bg-slate-800 text-white border-b-2 border-purple-500'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  💬 Chat
                </button>
                <button
                  onClick={() => { setShowGames(true); setShowActivities(false); }}
                  className={`px-6 py-3 font-medium transition-colors ${
                    showGames
                      ? 'bg-slate-800 text-white border-b-2 border-purple-500'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  🎮 Games
                </button>
                <button
                  onClick={() => { setShowGames(false); setShowActivities(true); }}
                  className={`px-6 py-3 font-medium transition-colors ${
                    showActivities
                      ? 'bg-slate-800 text-white border-b-2 border-purple-500'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  🎨 Activities
                </button>
              </div>

              {/* Games/Activities Panel */}
              <div className="h-96">
                {showGames ? (
                  <GamesPanel
                    isConnected={isConnected}
                    onGameAction={(action) => {
                      if (channelRef.current) {
                        channelRef.current.send({
                          type: 'broadcast',
                          event: 'game-action',
                          payload: action
                        });
                      }
                    }}
                  />
                ) : showActivities ? (
                  <ActivitiesPanel
                    isConnected={isConnected}
                    onActivityEvent={(event) => {
                      if (channelRef.current) {
                        channelRef.current.send({
                          type: 'broadcast',
                          event: 'activity-event',
                          payload: event
                        });
                      }
                    }}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500">
                    <div className="text-center">
                      <div className="text-6xl mb-4">💬</div>
                      <p className="text-xl font-medium">Chat Mode</p>
                      <p className="text-sm mt-2">Start a conversation with your partner!</p>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowActivities(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <ActivitiesPanel roomId={roomId} />
          </div>
        </div>
      )}
    </div>
  );
}
