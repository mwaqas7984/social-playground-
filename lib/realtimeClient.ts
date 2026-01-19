import { createClient } from '@supabase/supabase-js';
import { RealtimeChannel } from '@supabase/realtime-js';
import { SignalingMessage, GameMessage, ActivityMessage } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lbjymipntzjczegvunyn.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxianltaXBudHpqY3plZ3Z1bnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzU2NzUsImV4cCI6MjA4Mjk1MTY3NX0.ebRmcLR2RCV9H5Nrmh2IlURbZ8u32zvNUnmQ0adL73c';

export class RealtimeClient {
  private supabase: ReturnType<typeof createClient>;
  private channels: Map<string, RealtimeChannel> = new Map();

  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
  }

  async joinQueue(user: any) {
    console.log('Joining queue with user:', user);
    // Simulate queue joining
    return new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 1000);
    });
  }

  async leaveQueue() {
    console.log('Leaving queue');
  }

  async joinRoom(roomId: string, callbacks: {
    onSignalingMessage?: (message: SignalingMessage) => void;
    onGameMessage?: (message: GameMessage) => void;
    onActivityMessage?: (message: ActivityMessage) => void;
  }) {
    console.log('Joining room:', roomId);
    
    // Simulate room joining with demo functionality
    setTimeout(() => {
      // Simulate receiving a chat message
      if (callbacks.onActivityMessage) {
        callbacks.onActivityMessage({
          type: 'chat-message',
          activityType: 'chat',
          payload: {
            id: crypto.randomUUID(),
            userId: 'demo-partner',
            content: 'Hey! This is a demo message. Your real-time chat will work once Supabase Realtime is enabled!',
            timestamp: Date.now()
          }
        });
      }
    }, 2000);
    
    return null;
  }

  async leaveRoom(roomId: string) {
    console.log('Leaving room:', roomId);
  }

  sendSignalingMessage(roomId: string, message: SignalingMessage) {
    console.log('Sending signaling message:', message);
  }

  sendGameMessage(roomId: string, message: GameMessage) {
    console.log('Sending game message:', message);
  }

  sendActivityMessage(roomId: string, message: ActivityMessage) {
    console.log('Sending activity message:', message);
  }
}
