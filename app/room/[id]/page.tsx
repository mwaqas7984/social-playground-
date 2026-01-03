"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { RealtimeClient } from "@/lib/realtimeClient";
import { useWebRTC } from "@/lib/webrtc";
import { ChatPanel } from "@/components/ChatPanel";
import { VideoPanel } from "@/components/VideoPanel";
import { GamesPanel } from "@/components/GamesPanel";
import { ActivitiesPanel } from "@/components/ActivitiesPanel";
import { StatusBar } from "@/components/StatusBar";

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;
  
  const [isConnected, setIsConnected] = useState(false);
  const [showGames, setShowGames] = useState(false);
  const [showActivities, setShowActivities] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'waiting' | 'matched' | 'reconnecting'>('connecting');
  
  const realtimeClientRef = useRef<RealtimeClient | null>(null);
  const { localStream, remoteStream, startCall, endCall, toggleCamera, toggleMic } = useWebRTC();

  useEffect(() => {
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      router.push('/');
      return;
    }

    const initRoom = async () => {
      const realtimeClient = new RealtimeClient();
      realtimeClientRef.current = realtimeClient;

      await realtimeClient.joinRoom(roomId, {
        onSignalingMessage: async (message) => {
          if (message.type === 'offer' && message.userId !== sessionId) {
            // Handle WebRTC offer
            console.log('Received offer:', message);
          } else if (message.type === 'answer' && message.userId !== sessionId) {
            // Handle WebRTC answer
            console.log('Received answer:', message);
          } else if (message.type === 'ice-candidate' && message.userId !== sessionId) {
            // Handle ICE candidate
            console.log('Received ICE candidate:', message);
          }
        }
      });

      setConnectionStatus('matched');
      setIsConnected(true);
    };

    initRoom();

    return () => {
      if (realtimeClientRef.current) {
        realtimeClientRef.current.leaveRoom(roomId);
      }
      endCall();
    };
  }, [roomId, router, endCall]);

  const handleNext = async () => {
    endCall();
    setConnectionStatus('connecting');
    setShowGames(false);
    setShowActivities(false);
    
    // Re-queue for new match
    setTimeout(() => {
      const newRoomId = crypto.randomUUID();
      router.push(`/room/${newRoomId}`);
    }, 1000);
  };

  const handleEnd = () => {
    endCall();
    router.push('/');
  };

  const handleReport = () => {
    const reason = prompt('Report reason (spam, nsfw, harassment, other):');
    if (reason) {
      fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporterId: localStorage.getItem('sessionId'),
          roomId,
          reason,
          timestamp: Date.now()
        })
      });
      handleNext();
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <StatusBar status={connectionStatus} />
      
      <div className="flex-1 flex flex-col lg:flex-row p-4 gap-4">
        {/* Video Panel */}
        <div className="flex-1 lg:w-1/2">
          <VideoPanel
            localStream={localStream}
            remoteStream={remoteStream}
            onStartCall={startCall}
            onToggleCamera={toggleCamera}
            onToggleMic={toggleMic}
          />
        </div>

        {/* Chat Panel */}
        <div className="flex-1 lg:w-1/2">
          <ChatPanel roomId={roomId} />
        </div>
      </div>

      {/* Control Panel */}
      <div className="border-t border-slate-700 p-4">
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            onClick={handleNext}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Next
          </button>
          <button
            onClick={() => setShowGames(!showGames)}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            Games
          </button>
          <button
            onClick={() => setShowActivities(!showActivities)}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
          >
            Activities
          </button>
          <button
            onClick={handleReport}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            Report
          </button>
          <button
            onClick={handleEnd}
            className="px-6 py-2 bg-slate-600 hover:bg-slate-700 rounded-lg transition-colors"
          >
            End Chat
          </button>
        </div>
      </div>

      {/* Games Modal */}
      {showGames && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Games</h2>
              <button
                onClick={() => setShowGames(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <GamesPanel roomId={roomId} />
          </div>
        </div>
      )}

      {/* Activities Modal */}
      {showActivities && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Activities</h2>
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
