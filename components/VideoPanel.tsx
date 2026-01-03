'use client';

import { useRef, useEffect } from 'react';

interface VideoPanelProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onStartCall: () => void;
  onToggleCamera: () => void;
  onToggleMic: () => void;
}

export function VideoPanel({ localStream, remoteStream, onStartCall, onToggleCamera, onToggleMic }: VideoPanelProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <div className="bg-slate-800 rounded-lg p-4 h-full flex flex-col">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Local Video */}
        <div className="relative bg-slate-900 rounded-lg overflow-hidden">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-sm">
            You
          </div>
        </div>

        {/* Remote Video */}
        <div className="relative bg-slate-900 rounded-lg overflow-hidden">
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <div className="text-center">
                <div className="text-4xl mb-2">👤</div>
                <p>Waiting for partner...</p>
              </div>
            </div>
          )}
          <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-sm">
            Partner
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-2">
        {!localStream ? (
          <button
            onClick={onStartCall}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
          >
            Start Video
          </button>
        ) : (
          <>
            <button
              onClick={onToggleCamera}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              📷 Camera
            </button>
            <button
              onClick={onToggleMic}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              🎤 Mic
            </button>
          </>
        )}
      </div>
    </div>
  );
}
