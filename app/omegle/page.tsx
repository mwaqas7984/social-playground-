"use client";

import { useState, useEffect, useRef } from "react";
import { useRealTimeWebRTC } from "../../hooks/useRealTimeWebRTC";

export default function OmeglePage() {
  const [selectedMode, setSelectedMode] = useState('chat');
  const [selectedTags, setSelectedTags] = useState([]);
  
  const {
    isConnected,
    isMatching,
    isMatched,
    localStream,
    remoteStream,
    connectionState,
    error,
    matchInfo,
    chatMessages,
    queuePosition,
    findMatch,
    nextMatch,
    sendChatMessage,
    toggleAudio,
    toggleVideo,
    setLocalVideoRef,
    setRemoteVideoRef,
  } = useRealTimeWebRTC();

  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [showGames, setShowGames] = useState(false);
  const [showActivities, setShowActivities] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const VIBE_TAGS = ["chill", "deep talk", "gaming", "music", "study buddy", "tech", "random"];

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Handle audio toggle
  const handleToggleAudio = () => {
    const newState = !isAudioEnabled;
    setIsAudioEnabled(newState);
    toggleAudio(newState);
  };

  // Handle video toggle
  const handleToggleVideo = () => {
    const newState = !isVideoEnabled;
    setIsVideoEnabled(newState);
    toggleVideo(newState);
  };

  // Handle start chat
  const handleStartChat = () => {
    const userData = {
      mode: selectedMode,
      vibeTags: selectedTags.length > 0 ? selectedTags : ['random'],
      timestamp: Date.now()
    };
    findMatch(userData);
  };

  // Handle send message
  const handleSendMessage = () => {
    if (newMessage.trim()) {
      sendChatMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  // Handle next
  const handleNext = () => {
    nextMatch();
    setShowGames(false);
    setShowActivities(false);
  };

  // Toggle tag
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // Get connection status color
  const getConnectionColor = () => {
    switch (connectionState) {
      case 'connected': return 'text-green-400';
      case 'connecting': return 'text-yellow-400';
      case 'disconnected': return 'text-red-400';
      case 'failed': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  // Get status text
  const getStatusText = () => {
    if (error) return `Error: ${error}`;
    if (isMatching) return queuePosition > 0 ? `Waiting... ${queuePosition} in queue` : 'Finding stranger...';
    if (isMatched) return `Connected to stranger`;
    return 'Ready to chat';
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">🎥 Social Playground</h1>
          <div className="flex items-center gap-4">
            <div className={`text-sm ${getConnectionColor()}`}>
              {getStatusText()}
            </div>
            <div className={`px-2 py-1 rounded-full text-xs ${
              isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4">
        <div className="max-w-6xl mx-auto h-full">
          {!isMatched ? (
            // Landing/Waiting Screen
            <div className="flex flex-col items-center justify-center h-full">
              <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full border border-slate-700">
                <h2 className="text-3xl font-bold text-center mb-6">Start Chatting</h2>
                
                {/* Mode Selection */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Choose mode</h3>
                  <div className="space-y-2">
                    {['chat', 'games', 'activities'].map(mode => (
                      <button
                        key={mode}
                        onClick={() => setSelectedMode(mode)}
                        className={`w-full p-3 rounded-lg border transition-all flex items-center justify-between capitalize ${
                          selectedMode === mode
                            ? 'bg-purple-600/20 border-purple-500 text-white'
                            : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        <span>{mode}</span>
                        <span className="text-2xl">
                          {mode === 'chat' ? '💬' : mode === 'games' ? '🎮' : '🎨'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vibe Tags */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Choose your vibe</h3>
                  <div className="flex flex-wrap gap-2">
                    {VIBE_TAGS.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1 rounded-full text-sm transition-all ${
                          selectedTags.includes(tag)
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Start Button */}
                <button
                  onClick={handleStartChat}
                  disabled={!isConnected || isMatching}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all"
                >
                  {isMatching ? 'Finding stranger...' : 'Start Chatting'}
                </button>

                {isMatching && (
                  <button
                    onClick={() => {/* Add cancel functionality */}}
                    className="w-full mt-2 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                )}

                <div className="mt-4 text-center text-xs text-slate-400">
                  <p>18+ only • No NSFW • No harassment</p>
                </div>
              </div>
            </div>
          ) : (
            // Chat Room Screen
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
              {/* Video Section */}
              <div className="lg:col-span-2 space-y-4">
                {/* Video Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-96">
                  {/* Local Video */}
                  <div className="relative bg-slate-800 rounded-lg overflow-hidden">
                    <video
                      ref={setLocalVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-black/50 px-2 py-1 rounded text-xs">
                      You {isVideoEnabled ? '📹' : '🚫'} {isAudioEnabled ? '🎤' : '🔇'}
                    </div>
                    {!localStream && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-4xl mb-2">👤</div>
                          <p className="text-slate-400">Camera off</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Remote Video */}
                  <div className="relative bg-slate-800 rounded-lg overflow-hidden">
                    <video
                      ref={setRemoteVideoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-black/50 px-2 py-1 rounded text-xs">
                      Stranger 📹🎤
                    </div>
                    {!remoteStream && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-4xl mb-2">👤</div>
                          <p className="text-slate-400">Connecting...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Controls */}
                <div className="bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={handleNext}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
                    >
                      Next
                    </button>
                    
                    <button
                      onClick={handleToggleAudio}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        isAudioEnabled 
                          ? 'bg-blue-600 hover:bg-blue-700' 
                          : 'bg-gray-600 hover:bg-gray-700'
                      }`}
                    >
                      {isAudioEnabled ? '🎤 Mute' : '🔇 Unmute'}
                    </button>
                    
                    <button
                      onClick={handleToggleVideo}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        isVideoEnabled 
                          ? 'bg-blue-600 hover:bg-blue-700' 
                          : 'bg-gray-600 hover:bg-gray-700'
                      }`}
                    >
                      {isVideoEnabled ? '📹 Hide' : '👁️ Show'}
                    </button>
                  </div>
                </div>

                {/* Games/Activities */}
                <div className="bg-slate-800 rounded-lg p-4">
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => { setShowGames(!showGames); setShowActivities(false); }}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        showGames
                          ? 'bg-purple-600 hover:bg-purple-700'
                          : 'bg-slate-700 hover:bg-slate-600'
                      }`}
                    >
                      🎮 Games
                    </button>
                    <button
                      onClick={() => { setShowActivities(!showActivities); setShowGames(false); }}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        showActivities
                          ? 'bg-purple-600 hover:bg-purple-700'
                          : 'bg-slate-700 hover:bg-slate-600'
                      }`}
                    >
                      🎨 Activities
                    </button>
                  </div>

                  {showGames && (
                    <div className="text-center text-slate-400">
                      <p>Games coming soon...</p>
                    </div>
                  )}

                  {showActivities && (
                    <div className="text-center text-slate-400">
                      <p>Activities coming soon...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Section */}
              <div className="bg-slate-800 rounded-lg p-4 flex flex-col h-full max-h-[600px]">
                <h3 className="text-lg font-semibold mb-4">Chat</h3>
                
                {/* Messages */}
                <div className="flex-1 overflow-y-auto mb-4 space-y-2">
                  {chatMessages.length === 0 ? (
                    <div className="text-center text-slate-500 py-8">
                      <p>Start a conversation!</p>
                    </div>
                  ) : (
                    chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-2 rounded-lg ${
                          msg.isMe
                            ? 'bg-purple-600/20 ml-4'
                            : 'bg-slate-700 mr-4'
                        }`}
                      >
                        <p className="text-sm">{msg.message}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {msg.isMe ? 'You' : 'Stranger'}
                        </p>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
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
                    disabled={!newMessage.trim()}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Debug Info */}
      <div className="bg-slate-900 border-t border-slate-700 p-2">
        <div className="max-w-6xl mx-auto">
          <div className="text-xs text-slate-400 font-mono">
            State: {connectionState} | 
            Room: {matchInfo?.roomId?.substring(0, 12) || 'None'} |
            Partner: {matchInfo?.partnerId?.substring(0, 8) || 'None'}
          </div>
        </div>
      </div>
    </div>
  );
}
