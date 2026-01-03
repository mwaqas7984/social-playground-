import { User } from './types';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lbjymipntzjczegvunyn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxianltaXBudHpqY3plZ3Z1bnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzU2NzUsImV4cCI6MjA4Mjk1MTY3NX0.ebRmcLR2RCV9H5Nrmh2IlURbZ8u32zvNUnmQ0adL73c';

export class MatchingService {
  private supabase = createClient(supabaseUrl, supabaseAnonKey);
  private currentUserId: string;
  private pollingInterval: any = null;

  constructor(userId: string) {
    this.currentUserId = userId;
  }

  async findMatch(user: User, onMatchFound: (roomId: string) => void) {
    console.log(`🎯 User ${user.id} looking for match in mode: ${user.mode}`);
    
    // Add user to queue
    try {
      await this.supabase
        .from('matching_queue')
        .upsert({
          user_id: user.id,
          vibe_tags: user.vibeTags,
          mode: user.mode,
          joined_at: Date.now()
        }, {
          onConflict: 'user_id'
        });
      
      console.log('✅ Added to queue');
    } catch (error) {
      console.error('❌ Failed to join queue:', error);
      return;
    }

    // Start polling for matches
    this.pollingInterval = setInterval(async () => {
      await this.checkForMatch(onMatchFound);
    }, 1000);

    // Also check immediately
    await this.checkForMatch(onMatchFound);
  }

  private async checkForMatch(onMatchFound: (roomId: string) => void) {
    try {
      // Check if we're already matched
      const { data: existingMatch } = await this.supabase
        .from('matches')
        .select('*')
        .or(`user1_id.eq.${this.currentUserId},user2_id.eq.${this.currentUserId}`)
        .single();

      if (existingMatch) {
        console.log('🎉 Found existing match:', existingMatch.room_id);
        onMatchFound(existingMatch.room_id);
        this.leaveQueue();
        return;
      }

      // Look for someone to match with
      const { data: potentialMatches } = await this.supabase
        .from('matching_queue')
        .select('*')
        .neq('user_id', this.currentUserId)
        .limit(1);

      if (potentialMatches && potentialMatches.length > 0) {
        const match = potentialMatches[0];
        const roomId = crypto.randomUUID();
        
        console.log(`🤝 Found match! Creating room: ${roomId}`);
        
        // Create the match
        const { error: matchError } = await this.supabase
          .from('matches')
          .insert({
            room_id: roomId,
            user1_id: this.currentUserId,
            user2_id: match.user_id,
            created_at: new Date().toISOString()
          });

        if (matchError) {
          console.error('❌ Failed to create match:', matchError);
          return;
        }

        // Remove both users from queue
        await this.supabase
          .from('matching_queue')
          .delete()
          .in('user_id', [this.currentUserId, match.user_id]);

        console.log('🚀 Match created successfully!');
        onMatchFound(roomId);
        this.leaveQueue();
      } else {
        console.log('⏳ No matches found, still waiting...');
      }
    } catch (error) {
      console.error('❌ Error checking for match:', error);
    }
  }

  async leaveQueue() {
    console.log('👋 Leaving queue');
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    try {
      await this.supabase
        .from('matching_queue')
        .delete()
        .eq('user_id', this.currentUserId);
    } catch (error) {
      console.error('❌ Failed to leave queue:', error);
    }
  }

  async getQueueStatus() {
    try {
      const { count } = await this.supabase
        .from('matching_queue')
        .select('*', { count: 'exact', head: true });
      
      const queueCount = count || 0;
      
      return {
        totalInQueue: queueCount,
        estimatedWaitTime: queueCount === 0 ? 'Waiting for someone...' : queueCount <= 2 ? '< 10 seconds' : '< 30 seconds'
      };
    } catch (error) {
      console.error('❌ Failed to get queue status:', error);
      return {
        totalInQueue: 0,
        estimatedWaitTime: 'Unknown'
      };
    }
  }
}
