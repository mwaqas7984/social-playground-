"use client";

import { useState, useEffect } from "react";
import { useMatching } from "../../hooks/useMatching";
import { useRouter } from "next/navigation";

export default function OmeglePage() {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<'chat' | 'games' | 'activities'>('chat');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const {
    isMatching,
    isMatched,
    roomId,
    queueStatus,
    error,
    findMatch,
    leaveMatch,
  } = useMatching();

  const VIBE_TAGS = ["chill", "deep talk", "gaming", "music", "study buddy", "tech", "random"];

  // Navigate to room when matched
  useEffect(() => {
    if (isMatched && roomId) {
      console.log('🚀 Navigating to room:', roomId);
      router.push(`/room/${roomId}`);
    }
  }, [isMatched, roomId, router]);

  // Handle start matching
  const handleStartMatching = () => {
    console.log('🎯 Starting matching with:', { mode: selectedMode, tags: selectedTags });
    findMatch(selectedMode, selectedTags);
  };

  // Handle stop matching
  const handleStopMatching = () => {
    console.log('🛑 Stopping matching');
    leaveMatch();
  };

  // Toggle tag
  const toggleTag = (tag: string) => {
    setSelectedTags((prev: string[]) => 
      prev.includes(tag) 
        ? prev.filter((t: string) => t !== tag)
        : [...prev, tag]
    );
  };

  // Get connection status color
  const getConnectionColor = () => {
    if (error) return 'text-red-500';
    if (isMatching) return 'text-yellow-400';
    if (isMatched) return 'text-green-400';
    return 'text-gray-400';
  };

  // Get status text
  const getStatusText = () => {
    if (error) return `Error: ${error}`;
    if (isMatched) return 'Match found! Redirecting...';
    if (isMatching) return queueStatus.totalInQueue > 0 ? `Waiting... ${queueStatus.totalInQueue} in queue` : 'Finding someone...';
    return 'Ready to match';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-400">Social Playground</h1>
          <div className={`flex items-center gap-2 ${getConnectionColor()}`}>
            <div className="w-2 h-2 rounded-full bg-current animate-pulse"></div>
            <span className="text-sm">{getStatusText()}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          {!isMatching && !isMatched && (
            <div className="space-y-6">
              {/* Mode Selection */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">What would you like to do?</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setSelectedMode('chat')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedMode === 'chat'
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <h3 className="font-semibold mb-2">💬 Chat</h3>
                    <p className="text-sm text-gray-400">Text chat with a random person</p>
                  </button>
                  
                  <button
                    onClick={() => setSelectedMode('games')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedMode === 'games'
                        ? 'border-purple-500 bg-purple-500/20'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <h3 className="font-semibold mb-2">🎮 Games</h3>
                    <p className="text-sm text-gray-400">Play games together</p>
                  </button>
                  
                  <button
                    onClick={() => setSelectedMode('activities')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedMode === 'activities'
                        ? 'border-green-500 bg-green-500/20'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <h3 className="font-semibold mb-2">🎨 Activities</h3>
                    <p className="text-sm text-gray-400">Shared activities</p>
                  </button>
                </div>
              </div>

              {/* Vibe Tags */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Add your interests (optional)</h2>
                <div className="flex flex-wrap gap-2">
                  {VIBE_TAGS.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 rounded-full text-sm transition-all ${
                        selectedTags.includes(tag)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Button */}
              <div className="text-center">
                <button
                  onClick={handleStartMatching}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-lg transition-colors"
                >
                  Start Matching
                </button>
              </div>
            </div>
          )}

          {/* Matching State */}
          {isMatching && (
            <div className="text-center space-y-6">
              <div className="bg-gray-800 rounded-lg p-8">
                <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <h2 className="text-2xl font-semibold mb-2">Finding someone...</h2>
                <p className="text-gray-400 mb-4">
                  {queueStatus.totalInQueue > 0 
                    ? `${queueStatus.totalInQueue} people in queue` 
                    : "You're first one here!"
                  }
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  Estimated wait: {queueStatus.estimatedWaitTime}
                </p>
                <button
                  onClick={handleStopMatching}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Stop
                </button>
              </div>
            </div>
          )}

          {/* Matched State */}
          {isMatched && (
            <div className="text-center space-y-6">
              <div className="bg-gray-800 rounded-lg p-8">
                <div className="w-12 h-12 bg-green-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl">🎉</span>
                </div>
                <h2 className="text-2xl font-semibold mb-2">Match Found!</h2>
                <p className="text-gray-400 mb-6">Redirecting to your room...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center space-y-6">
              <div className="bg-red-900/20 border border-red-500 rounded-lg p-8">
                <h2 className="text-2xl font-semibold mb-2 text-red-400">Something went wrong</h2>
                <p className="text-gray-400 mb-6">{error}</p>
                <button
                  onClick={handleStartMatching}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
