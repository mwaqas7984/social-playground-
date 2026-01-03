import { useState, useEffect, useCallback } from 'react';
import { MatchingService } from '../lib/matching';
import { User } from '../lib/types';

export function useMatching() {
  const [isMatching, setIsMatching] = useState(false);
  const [isMatched, setIsMatched] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [queueStatus, setQueueStatus] = useState({ totalInQueue: 0, estimatedWaitTime: 'Unknown' });
  const [error, setError] = useState<string | null>(null);
  const [matchingService, setMatchingService] = useState<MatchingService | null>(null);

  // Initialize matching service
  useEffect(() => {
    const userId = `user-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
    const service = new MatchingService(userId);
    setMatchingService(service);

    return () => {
      service.leaveQueue();
    };
  }, []);

  // Poll queue status
  useEffect(() => {
    if (!matchingService) return;

    const interval = setInterval(async () => {
      try {
        const status = await matchingService.getQueueStatus();
        setQueueStatus(status);
      } catch (err) {
        console.error('Failed to get queue status:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [matchingService]);

  const findMatch = useCallback(async (mode: 'chat' | 'games' | 'activities', vibeTags: string[]) => {
    if (!matchingService) {
      setError('Matching service not initialized');
      return;
    }

    setIsMatching(true);
    setError(null);
    setIsMatched(false);
    setRoomId(null);

    try {
      const user: User = {
        id: (matchingService as any).currentUserId,
        mode,
        vibeTags,
        joinedAt: Date.now()
      };

      await matchingService.findMatch(user, (foundRoomId: string) => {
        console.log('🎉 Match found!', foundRoomId);
        setRoomId(foundRoomId);
        setIsMatched(true);
        setIsMatching(false);
      });
    } catch (err) {
      console.error('Failed to find match:', err);
      setError('Failed to find match');
      setIsMatching(false);
    }
  }, [matchingService]);

  const leaveMatch = useCallback(async () => {
    if (matchingService) {
      await matchingService.leaveQueue();
    }
    setIsMatching(false);
    setIsMatched(false);
    setRoomId(null);
    setError(null);
  }, [matchingService]);

  return {
    isMatching,
    isMatched,
    roomId,
    queueStatus,
    error,
    findMatch,
    leaveMatch,
    matchingService
  };
}
