// Serverless WebRTC signaling using Vercel Edge Functions
import { NextResponse } from 'next/server';

// In-memory store for active connections (in production, use Redis or database)
const activeRooms = new Map();
const waitingQueue = [];

function generateRoomId() {
  return `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function POST(request) {
  try {
    const { type, data } = await request.json();
    
    switch (type) {
      case 'find-match':
        return handleFindMatch(data);
      case 'signal':
        return handleSignal(data);
      case 'chat-message':
        return handleChatMessage(data);
      case 'next-match':
        return handleNextMatch(data);
      default:
        return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function handleFindMatch(userData) {
  // Add to waiting queue
  waitingQueue.push({
    userId: userData.userId,
    userData: userData,
    joinedAt: Date.now()
  });
  
  // Try to match users
  if (waitingQueue.length >= 2) {
    const user1 = waitingQueue.shift();
    const user2 = waitingQueue.shift();
    
    const roomId = generateRoomId();
    
    // Create room
    activeRooms.set(roomId, {
      users: [user1.userId, user2.userId],
      createdAt: Date.now()
    });
    
    // Return match for both users
    return NextResponse.json({
      type: 'matched',
      data: {
        roomId,
        user1: { userId: user1.userId, isInitiator: true, partnerId: user2.userId },
        user2: { userId: user2.userId, isInitiator: false, partnerId: user1.userId }
      }
    });
  }
  
  return NextResponse.json({ type: 'waiting' });
}

function handleSignal(data) {
  // In a real implementation, you'd relay this to the other user
  // For now, just acknowledge
  return NextResponse.json({ type: 'signal-relayed' });
}

function handleChatMessage(data) {
  // In a real implementation, you'd relay this to the other user
  return NextResponse.json({ type: 'message-relayed' });
}

function handleNextMatch(data) {
  // Remove user from current room
  // Add back to queue
  return handleFindMatch(data);
}
