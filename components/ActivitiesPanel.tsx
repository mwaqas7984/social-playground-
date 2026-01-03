'use client';

import { useState, useRef } from 'react';

interface ActivitiesPanelProps {
  roomId: string;
}

export function ActivitiesPanel({ roomId }: ActivitiesPanelProps) {
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);

  const activities = [
    { id: 'drawing', name: 'Shared Drawing', description: 'Draw together on a canvas' },
    { id: 'watch-together', name: 'Watch Together', description: 'Share and watch videos' },
    { id: 'prompts', name: 'Prompt Cards', description: 'Conversation starters' }
  ];

  const handleActivitySelect = (activityId: string) => {
    setSelectedActivity(activityId);
  };

  const renderActivity = () => {
    switch (selectedActivity) {
      case 'drawing':
        return <DrawingBoard roomId={roomId} />;
      case 'watch-together':
        return <WatchTogether roomId={roomId} />;
      case 'prompts':
        return <PromptCards roomId={roomId} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {!selectedActivity ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {activities.map((activity) => (
            <button
              key={activity.id}
              onClick={() => handleActivitySelect(activity.id)}
              className="p-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-left transition-colors"
            >
              <h3 className="font-semibold mb-2">{activity.name}</h3>
              <p className="text-sm text-slate-300">{activity.description}</p>
            </button>
          ))}
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {activities.find(a => a.id === selectedActivity)?.name}
            </h3>
            <button
              onClick={() => setSelectedActivity(null)}
              className="px-3 py-1 bg-slate-600 hover:bg-slate-700 rounded transition-colors"
            >
              Back
            </button>
          </div>
          {renderActivity()}
        </div>
      )}
    </div>
  );
}

// Drawing Board Component
function DrawingBoard({ roomId }: { roomId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#ffffff');

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="bg-slate-900 p-6 rounded-lg">
      <div className="mb-4 flex gap-2 items-center">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-10 h-10 rounded cursor-pointer"
        />
        <button
          onClick={clearCanvas}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
        >
          Clear
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={600}
        height={400}
        className="bg-white rounded cursor-crosshair"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
    </div>
  );
}

// Watch Together Component
function WatchTogether({ roomId }: { roomId: string }) {
  const [videoUrl, setVideoUrl] = useState('');
  const [isHost, setIsHost] = useState(true);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Share video URL with partner
  };

  return (
    <div className="bg-slate-900 p-6 rounded-lg">
      <div className="mb-4">
        <form onSubmit={handleUrlSubmit} className="flex gap-2">
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Paste video URL (YouTube, etc.)"
            className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
          >
            Share
          </button>
        </form>
      </div>
      
      {videoUrl ? (
        <div className="aspect-video bg-slate-800 rounded-lg flex items-center justify-center">
          <p className="text-slate-400">Video player would go here</p>
        </div>
      ) : (
        <div className="aspect-video bg-slate-800 rounded-lg flex items-center justify-center">
          <p className="text-slate-400">Share a video URL to watch together</p>
        </div>
      )}
      
      <div className="mt-4 text-center text-slate-300">
        {isHost ? 'You are the host' : 'Partner is hosting'}
      </div>
    </div>
  );
}

// Prompt Cards Component
function PromptCards({ roomId }: { roomId: string }) {
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [promptCategory, setPromptCategory] = useState<string>('icebreakers');

  const prompts = {
    icebreakers: [
      "What's the most interesting thing you've learned recently?",
      "If you could have dinner with any three people, who would they be?",
      "What's a skill you've always wanted to learn?",
      "What's the best advice you've ever received?",
      "What's something that makes you laugh uncontrollably?"
    ],
    'would-you-rather': [
      "Would you rather be able to fly or be invisible?",
      "Would you rather live in the city or countryside?",
      "Would you rather have the ability to talk to animals or speak every human language?",
      "Would you rather never have to sleep or never have to eat?",
      "Would you rather be able to teleport or time travel?"
    ],
    'deep-questions': [
      "What do you think is the meaning of life?",
      "What's something you believe that most people don't?",
      "What's the most important lesson life has taught you?",
      "What do you want to be remembered for?",
      "What's something you're grateful for right now?"
    ],
    'tech-prompts': [
      "What technology do you think will change the world most in the next decade?",
      "If you could invent any app, what would it do?",
      "What's your favorite piece of technology and why?",
      "Do you think AI will be more helpful or harmful to humanity?",
      "What's a tech trend you're excited about?"
    ]
  };

  const getRandomPrompt = () => {
    const categoryPrompts = prompts[promptCategory as keyof typeof prompts] || prompts.icebreakers;
    const randomIndex = Math.floor(Math.random() * categoryPrompts.length);
    setCurrentPrompt(categoryPrompts[randomIndex]);
  };

  return (
    <div className="bg-slate-900 p-6 rounded-lg">
      <div className="mb-4">
        <select
          value={promptCategory}
          onChange={(e) => setPromptCategory(e.target.value)}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded focus:outline-none focus:border-blue-500"
        >
          <option value="icebreakers">Icebreakers</option>
          <option value="would-you-rather">Would You Rather</option>
          <option value="deep-questions">Deep Questions</option>
          <option value="tech-prompts">Tech Prompts</option>
        </select>
      </div>
      
      <div className="text-center">
        <button
          onClick={getRandomPrompt}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors mb-4"
        >
          Get New Prompt
        </button>
        
        {currentPrompt && (
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-600">
            <p className="text-lg italic">"{currentPrompt}"</p>
          </div>
        )}
      </div>
    </div>
  );
}
