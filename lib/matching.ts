import { User, Room } from './types';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lbjymipntzjczegvunyn.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxianltaXBudHpqY3plZ3Z1bnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzU2NzUsImV4cCI6MjA4Mjk1MTY3NX0.ebRmcLR2RCV9H5Nrmh2IlURbZ8u32zvNUnmQ0adL73c';

export class MatchingService {
  private supabase = createClient(supabaseUrl, supabaseAnonKey);
  private currentUserId: string;
  private subscription: any = null;

  constructor(userId: string) {
    this.currentUserId = userId;
  }

  async findMatch(user: User, onMatchFound: (roomId: string) => void) {
    // Add user to queue
    await this.supabase
      .from('matching_queue')
      .insert({
        user_id: user.id,
        vibe_tags: user.vibeTags,
        mode: user.mode,
        joined_at: Date.now()
      });

    // Listen for matches
    this.subscription = this.supabase
      .channel('matching')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'matches' },
        (payload: any) => {
          const match = payload.new;
          if (match.user1_id === this.currentUserId || match.user2_id === this.currentUserId) {
            onMatchFound(match.room_id);
            this.leaveQueue();
          }
        }
      )
      .subscribe();

    // Try to find existing match with smart logic
    await this.smartMatch(user, onMatchFound);
  }

  private async smartMatch(user: User, onMatchFound: (roomId: string) => void) {
    // First, get total queue size
    const { count: totalQueueSize } = await this.supabase
      .from('matching_queue')
      .select('*', { count: 'exact', head: true })
      .neq('user_id', this.currentUserId);

    const queueSize = totalQueueSize || 0;
    console.log(`Queue size: ${queueSize}, User mode: ${user.mode}`);

    let potentialMatches;

    if (queueSize === 0) {
      // No one in queue - wait for someone
      console.log('No one in queue, waiting...');
      return;
    } else if (queueSize <= 2) {
      // Low traffic (1-2 people) - match with anyone immediately
      console.log('Low traffic - matching with anyone');
      const { data: matches } = await this.supabase
        .from('matching_queue')
        .select('*')
        .neq('user_id', this.currentUserId)
        .limit(1);
      
      potentialMatches = matches;
    } else if (queueSize <= 6) {
      // Medium traffic (3-6 people) - try mode match first, then fallback
      console.log('Medium traffic - trying mode match first');
      
      // Try to match by mode first
      const { data: modeMatches } = await this.supabase
        .from('matching_queue')
        .select('*')
        .neq('user_id', this.currentUserId)
        .eq('mode', user.mode)
        .limit(1);

      if (modeMatches && modeMatches.length > 0) {
        potentialMatches = modeMatches;
      } else {
        // Fallback to anyone
        console.log('No mode match found, matching with anyone');
        const { data: fallbackMatches } = await this.supabase
          .from('matching_queue')
          .select('*')
          .neq('user_id', this.currentUserId)
          .limit(1);
        
        potentialMatches = fallbackMatches;
      }
    } else {
      // High traffic (7+ people) - strict mode matching with vibe tags
      console.log('High traffic - strict mode and vibe matching');
      
      // Try exact mode + vibe tag match
      const { data: vibeMatches } = await this.supabase
        .from('matching_queue')
        .select('*')
        .neq('user_id', this.currentUserId)
        .eq('mode', user.mode)
        .contains('vibe_tags', [user.vibeTags[0] || 'random']) // Match at least one vibe tag
        .limit(1);

      if (vibeMatches && vibeMatches.length > 0) {
        potentialMatches = vibeMatches;
      } else {
        // Fallback to mode match only
        console.log('No vibe match, trying mode only');
        const { data: modeMatches } = await this.supabase
          .from('matching_queue')
          .select('*')
          .neq('user_id', this.currentUserId)
          .eq('mode', user.mode)
          .limit(1);
        
        potentialMatches = modeMatches;
      }
    }

    if (potentialMatches && potentialMatches.length > 0) {
      const match = potentialMatches[0];
      const roomId = crypto.randomUUID();
      
      console.log(`Matched with user ${match.user_id} in room ${roomId}`);
      
      // Create match record
      await this.supabase
        .from('matches')
        .insert({
          room_id: roomId,
          user1_id: this.currentUserId,
          user2_id: match.user_id,
          created_at: new Date().toISOString()
        });

      // Remove both users from queue
      await this.supabase
        .from('matching_queue')
        .delete()
        .in('user_id', [this.currentUserId, match.user_id]);

      onMatchFound(roomId);
    } else {
      console.log('No matches found, continuing to wait...');
    }
  }

  async leaveQueue() {
    if (this.subscription) {
      await this.subscription.unsubscribe();
      this.subscription = null;
    }

    await this.supabase
      .from('matching_queue')
      .delete()
      .eq('user_id', this.currentUserId);
  }

  // Get queue status for UI
  async getQueueStatus() {
    const { count } = await this.supabase
      .from('matching_queue')
      .select('*', { count: 'exact', head: true });
    
    return {
      totalInQueue: count || 0,
      estimatedWaitTime: this.calculateWaitTime(count || 0)
    };
  }

  private calculateWaitTime(queueSize: number): string {
    if (queueSize === 0) return 'Waiting for someone to join...';
    if (queueSize <= 2) return '< 10 seconds';
    if (queueSize <= 6) return '< 30 seconds';
    return '< 1 minute';
  }
}
