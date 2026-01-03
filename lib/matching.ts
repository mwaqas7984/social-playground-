import { User, Room } from './types';
import { RealtimeClient } from './realtimeClient';

export class MatchingService {
  private realtimeClient: RealtimeClient;
  private currentUserId: string;
  private onMatchFound?: (roomId: string) => void;

  constructor(userId: string) {
    this.realtimeClient = new RealtimeClient();
    this.currentUserId = userId;
  }

  async findMatch(user: User, onMatchFound: (roomId: string) => void) {
    this.onMatchFound = onMatchFound;
    
    await this.realtimeClient.joinQueue(user);
    
    // Simulate matching after 3 seconds
    setTimeout(() => {
      const roomId = crypto.randomUUID();
      onMatchFound(roomId);
    }, 3000);
  }

  async leaveQueue() {
    await this.realtimeClient.leaveQueue();
  }
}
