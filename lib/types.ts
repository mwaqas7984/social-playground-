export interface User {
  id: string;
  vibeTags: string[];
  mode: 'chat' | 'games' | 'activities';
  joinedAt: number;
}

export interface Room {
  id: string;
  users: User[];
  createdAt: number;
  status: 'waiting' | 'active' | 'ended';
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join-room' | 'leave-room' | 'next' | 'match-found';
  roomId?: string;
  userId?: string;
  payload?: any;
}

export interface GameMessage {
  type: 'game-action' | 'game-state' | 'game-init' | 'game-end';
  gameType: string;
  payload: any;
}

export interface ActivityMessage {
  type: 'draw-event' | 'video-sync' | 'prompt-change' | 'chat-message';
  activityType: 'drawing' | 'watch-together' | 'prompts' | 'chat';
  payload: any;
}

export interface ChatMessage {
  id: string;
  userId: string;
  content: string;
  timestamp: number;
}

export interface GameEngine {
  name: string;
  initialize: (playerId: string) => any;
  handleAction: (state: any, action: any, playerId: string) => any;
  render: (state: any, playerId: string) => React.ReactNode;
  isGameOver: (state: any) => boolean;
}

export interface ReportData {
  reporterId: string;
  roomId: string;
  reportedUserId?: string;
  reason: 'spam' | 'nsfw' | 'harassment' | 'other';
  timestamp: number;
}
