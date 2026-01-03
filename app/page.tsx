"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/lib/types";
import { MatchingService } from "@/lib/matching";

export default function Home() {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedMode, setSelectedMode] = useState("chat");
  const [isSearching, setIsSearching] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [queueStatus, setQueueStatus] = useState<{ totalInQueue: number; estimatedWaitTime: string } | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("sessionId");
    if (stored) {
      setSessionId(stored);
      setDebugInfo(`Session loaded: ${stored.substring(0, 8)}...`);
    } else {
      const newId = crypto.randomUUID();
      setSessionId(newId);
      localStorage.setItem("sessionId", newId);
      setDebugInfo(`New session created: ${newId.substring(0, 8)}...`);
    }
  }, []);

  useEffect(() => {
    // Update queue status every 2 seconds
    const updateQueueStatus = async () => {
      if (sessionId) {
        try {
          const matchingService = new MatchingService(sessionId);
          const status = await matchingService.getQueueStatus();
          setQueueStatus(status);
          setDebugInfo(`Queue updated: ${status.totalInQueue} waiting`);
        } catch (error) {
          setDebugInfo(`Queue update failed: ${error}`);
        }
      }
    };

    updateQueueStatus();
    const interval = setInterval(updateQueueStatus, 2000);

    return () => clearInterval(interval);
  }, [sessionId]);

  const VIBE_TAGS = ["chill", "deep talk", "gaming", "music", "study buddy", "tech", "random"];
  
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleStart = async () => {
    if (!sessionId) {
      setDebugInfo("❌ No session ID!");
      return;
    }
    
    setIsSearching(true);
    setDebugInfo("🔍 Starting matching process...");
    
    const user: User = {
      id: sessionId,
      vibeTags: selectedTags.length > 0 ? selectedTags : ["random"],
      mode: selectedMode as "chat" | "games" | "activities",
      joinedAt: Date.now()
    };

    setDebugInfo(`📝 User profile: ${user.mode} mode, ${user.vibeTags.join(", ")}`);

    const matchingService = new MatchingService(sessionId);
    
    try {
      setDebugInfo("🚀 Calling findMatch...");
      await matchingService.findMatch(user, (roomId) => {
        setDebugInfo(`🎉 Match found! Room: ${roomId}`);
        console.log(`🎉 MATCH FOUND! Room: ${roomId}`);
        router.push(`/room/${roomId}`);
      });
      setDebugInfo("⏳ Matching service started, waiting for partner...");
    } catch (error) {
      console.error("❌ Failed to start matching:", error);
      setDebugInfo(`❌ Error: ${error}`);
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 bg-slate-800/50 backdrop-blur-lg rounded-2xl p-8 border border-slate-700">
        
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">Social Playground</h1>
          <p className="text-slate-300">Anonymous chat with games & activities</p>
          
          {/* Queue Status */}
          {queueStatus && (
            <div className="mt-4 p-2 bg-slate-700/50 rounded-lg">
              <p className="text-sm text-slate-300">
                {queueStatus.totalInQueue} people waiting
              </p>
              <p className="text-xs text-slate-400">
                {queueStatus.estimatedWaitTime}
              </p>
            </div>
          )}

          {/* Debug Info */}
          <div className="mt-2 p-2 bg-slate-900/50 rounded text-xs text-slate-400 max-h-20 overflow-y-auto">
            <p>{debugInfo}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Choose your vibe</h3>
            <div className="flex flex-wrap gap-2">
              {VIBE_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-sm transition-all ${
                    selectedTags.includes(tag)
                      ? "bg-purple-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Choose mode</h3>
            <div className="space-y-2">
              {["chat", "games", "activities"].map(mode => (
                <button
                  key={mode}
                  onClick={() => setSelectedMode(mode)}
                  className={`w-full p-3 rounded-lg border transition-all flex items-center justify-between capitalize ${
                    selectedMode === mode
                      ? "bg-purple-600/20 border-purple-500 text-white"
                      : "bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  <span>{mode}</span>
                  <span className="text-2xl">
                    {mode === "chat" ? "💬" : mode === "games" ? "🎮" : "🎨"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={isSearching}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSearching ? "Finding match..." : "Start Chatting"}
          </button>
        </div>

        <div className="text-center text-xs text-slate-400">
          <p>18+ only • No NSFW • No harassment</p>
          <p className="mt-1">Bulletproof matching system v2.0</p>
        </div>
      </div>
    </div>
  );
}
