import { User } from './types';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lbjymipntzjczegvunyn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxianltaXBudHpqY3plZ3Z1bnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzU2NzUsImV4cCI6MjA4Mjk1MTY3NX0.ebRmcLR2RCV9H5Nrmh2IlURbZ8u32zvNUnmQ0adL73c';

export class MatchingService {
  private supabase = createClient(supabaseUrl, supabaseAnonKey);
  private currentUserId: string;
  private pollingInterval: any = null;
  private realtimeChannel: any = null;

  constructor(userId: string) {
    this.currentUserId = userId;
  }

  async findMatch(user: User, onMatchFound: (roomId: string) => void) {
    console.log(`🎯 User ${user.id} looking for match in mode: ${user.mode}`);
    
    try {
      // Check if there's already someone waiting
      const { data: waitingUsers, error: waitingError } = await this.supabase
        .from('matching_queue')
        .select('*')
        .order('joined_at', { ascending: true })
        .limit(1);

      if (waitingError) {
        console.error('❌ Error checking waiting users:', waitingError);
        return;
      }

      if (waitingUsers && waitingUsers.length > 0) {
        // Someone is already waiting - join their room
        const waitingUser = waitingUsers[0];
        console.log(`🤝 Found waiting user: ${waitingUser.user_id}`);
        
        // Check if they already have a room ID
        if (waitingUser.room_id) {
          console.log(`🏠 Joining existing room: ${waitingUser.room_id}`);
          
          // Create match
          const { error: matchError } = await this.supabase
            .from('matches')
            .insert({
              room_id: waitingUser.room_id,
              user1_id: waitingUser.user_id,
              user2_id: user.id,
              created_at: new Date().toISOString()
            });

          if (matchError) {
            console.error('❌ Failed to create match:', matchError);
            return;
          }

          // Remove both from queue
          await this.supabase
            .from('matching_queue')
            .delete()
            .in('user_id', [waitingUser.user_id, user.id]);

          console.log('🚀 Joining existing room!');
          onMatchFound(waitingUser.room_id);
          return;
        }
      }

      // No one waiting - create a new room and wait
      const roomId = `room-${user.id}-${Date.now()}`;
      console.log(`🏠 Creating new room and waiting: ${roomId}`);
      
      // Add user to queue with room ID
      await this.supabase
        .from('matching_queue')
        .upsert({
          user_id: user.id,
          vibe_tags: user.vibeTags,
          mode: user.mode,
          joined_at: Date.now(),
          room_id: roomId
        }, {
          onConflict: 'user_id'
        });
      
      console.log('✅ Added to queue with room ID, waiting for partner...');
      
      // Set up real-time listener for when someone joins our room
      await this.setupRealtimeListener(onMatchFound);
      
      // Start polling to check if someone joined
      this.pollingInterval = setInterval(async () => {
        await this.checkForPartner(onMatchFound, roomId);
      }, 1000);
      
    } catch (error) {
      console.error('❌ Failed to join queue:', error);
      return;
    }
  }

  private async checkForPartner(onMatchFound: (roomId: string) => void, myRoomId: string) {
    try {
      // Check if someone joined our room
      const { data: matches, error: matchError } = await this.supabase
        .from('matches')
        .select('*')
        .eq('room_id', myRoomId);

      if (matchError) {
        console.error('❌ Error checking for partner:', matchError);
        return;
      }

      if (matches && matches.length > 0) {
        console.log('🎉 Found partner in our room!');
        onMatchFound(myRoomId);
        this.leaveQueue();
      }
    } catch (error) {
      console.error('❌ Error checking for partner:', error);
    }
  }

  private async setupRealtimeListener(onMatchFound: (roomId: string) => void) {
    // Listen for real-time changes in matches table
    this.realtimeChannel = this.supabase
      .channel('matches-channel')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'matches',
          filter: `user1_id=eq.${this.currentUserId}` 
        },
        (payload: any) => {
          console.log('🎉 Real-time match found!', payload.new);
          onMatchFound(payload.new.room_id);
          this.leaveQueue();
        }
      )
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'matches',
          filter: `user2_id=eq.${this.currentUserId}` 
        },
        (payload: any) => {
          console.log('🎉 Real-time match found!', payload.new);
          onMatchFound(payload.new.room_id);
          this.leaveQueue();
        }
      )
      .subscribe((status: any) => {
        console.log('📡 Realtime subscription status:', status);
      });
  }

  private async checkForMatch(onMatchFound: (roomId: string) => void) {
    try {
      console.log(`🔍 Checking for match for user: ${this.currentUserId}`);
      
      // First check if we're already matched
      const { data: existingMatch, error: matchCheckError } = await this.supabase
        .from('matches')
        .select('*')
        .or(`user1_id.eq.${this.currentUserId},user2_id.eq.${this.currentUserId}`);

      if (matchCheckError) {
        console.error('❌ Error checking existing match:', matchCheckError);
      }

      if (existingMatch && existingMatch.length > 0) {
        console.log('🎉 Found existing match:', existingMatch[0].room_id);
        onMatchFound(existingMatch[0].room_id);
        this.leaveQueue();
        return;
      }

      // Get current queue status
      const { data: queueData, error: queueError } = await this.supabase
        .from('matching_queue')
        .select('*')
        .order('joined_at', { ascending: true });

      if (queueError) {
        console.error('❌ Error checking queue:', queueError);
        return;
      }

      console.log(`👥 Queue status: ${queueData?.length || 0} users waiting`);

      if (queueData && queueData.length >= 2) {
        // Omegle-style: pair first two users in queue
        const user1 = queueData[0];
        const user2 = queueData[1];
        
        // Skip if we're not one of the first two
        if (user1.user_id !== this.currentUserId && user2.user_id !== this.currentUserId) {
          console.log('⏳ Not our turn yet, waiting...');
          return;
        }
        
        console.log(`🤝 Pairing users: ${user1.user_id} <-> ${user2.user_id}`);
        
        // Create deterministic room ID
        const roomIds = [user1.user_id, user2.user_id].sort();
        const roomId = `room-${roomIds[0]}-${roomIds[1]}`;
        
        console.log(`🏠 Creating room: ${roomId}`);
        
        // Create the match
        const { data: createdMatch, error: matchError } = await this.supabase
          .from('matches')
          .insert({
            room_id: roomId,
            user1_id: user1.user_id,
            user2_id: user2.user_id,
            created_at: new Date().toISOString()
          })
          .select();

        if (matchError) {
          console.error('❌ Failed to create match:', matchError);
          
          // Check if match was created by other user (race condition)
          const { data: raceMatch } = await this.supabase
            .from('matches')
            .select('*')
            .or(`user1_id.eq.${this.currentUserId},user2_id.eq.${this.currentUserId}`)
            .single();

          if (raceMatch) {
            console.log('🎉 Found match after race condition:', raceMatch.room_id);
            onMatchFound(raceMatch.room_id);
            this.leaveQueue();
          }
          return;
        }

        if (createdMatch) {
          console.log('✅ Match created successfully!', createdMatch[0]);
          
          // Remove both users from queue
          const { error: deleteError } = await this.supabase
            .from('matching_queue')
            .delete()
            .in('user_id', [user1.user_id, user2.user_id]);

          if (deleteError) {
            console.error('❌ Error removing from queue:', deleteError);
          } else {
            console.log('🗑️ Removed both users from queue');
          }

          console.log('🚀 Redirecting to room:', roomId);
          onMatchFound(roomId);
          this.leaveQueue();
        }
      } else {
        console.log('⏳ Not enough users in queue, waiting...');
      }
    } catch (error) {
      console.error('❌ Error checking for match:', error);
    }
  }

  async leaveQueue() {
    console.log('👋 Leaving queue');
    
    // Clear polling
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    // Unsubscribe from realtime
    if (this.realtimeChannel) {
      await this.supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }

    // Remove from queue
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
