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

    // Try to find existing match
    await this.checkForExistingMatch(onMatchFound);
  }

  private async checkForExistingMatch(onMatchFound: (roomId: string) => void) {
    // Look for another user in queue with similar preferences
    const { data: potentialMatches } = await this.supabase
      .from('matching_queue')
      .select('*')
      .neq('user_id', this.currentUserId)
      .eq('mode', 'chat') // For now, just match by mode
      .limit(1);

    if (potentialMatches && potentialMatches.length > 0) {
      const match = potentialMatches[0];
      const roomId = crypto.randomUUID();
      
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
}
