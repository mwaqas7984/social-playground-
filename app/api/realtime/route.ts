// Real-time WebRTC signaling using Vercel Edge Functions with WebSocket
import { NextResponse } from 'next/server';

// In-memory store for active connections (in production, use Redis or database)
const activeRooms = new Map();
const waitingQueue = [];
const connectedUsers = new Map();

function generateRoomId() {
  return `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function GET(request) {
  // Handle WebSocket upgrade for real-time signaling
  const url = new URL(request.url);
  const isWebSocket = request.headers.get('upgrade') === 'websocket';
  
  if (isWebSocket) {
    return new Response('WebSocket upgrade required', { status: 426 });
  }
  
  return NextResponse.json({ 
    status: 'ready',
    waitingUsers: waitingQueue.length,
    activeRooms: activeRooms.size
  });
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
      case 'leave-room':
        return handleLeaveRoom(data);
      default:
        return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function handleFindMatch(userData) {
  console.log('🔍 User looking for match:', userData.userId);
  
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
      user1: user1.userId,
      user2: user2.userId,
      createdAt: Date.now(),
      signaling: {
        user1Offer: null,
        user2Answer: null,
        user1Ice: [],
        user2Ice: []
      }
    });
    
    console.log('🤝 Match found:', { roomId, user1: user1.userId, user2: user2.userId });
    
    return NextResponse.json({
      type: 'matched',
      data: {
        roomId,
        user1: { userId: user1.userId, isInitiator: true, partnerId: user2.userId },
        user2: { userId: user2.userId, isInitiator: false, partnerId: user1.userId }
      }
    });
  }
  
  return NextResponse.json({ type: 'waiting', data: { queuePosition: waitingQueue.length } });
}

function handleSignal(data) {
  const { roomId, userId, signalType, signalData } = data;
  
  if (!activeRooms.has(roomId)) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }
  
  const room = activeRooms.get(roomId);
  
  // Store signaling data
  switch (signalType) {
    case 'offer':
      if (room.user1 === userId) {
        room.signaling.user1Offer = signalData;
      } else {
        room.signaling.user2Offer = signalData;
      }
      break;
    case 'answer':
      if (room.user1 === userId) {
        room.signaling.user1Answer = signalData;
      } else {
        room.signaling.user2Answer = signalData;
      }
      break;
    case 'ice-candidate':
      if (room.user1 === userId) {
        room.signaling.user1Ice.push(signalData);
      } else {
        room.signaling.user2Ice.push(signalData);
      }
      break;
  }
  
  // Return the partner's signaling data if available
  const partnerId = room.user1 === userId ? room.user2 : room.user1;
  let partnerData = null;
  
  if (signalType === 'offer' && room.user2 === userId) {
    partnerData = room.signaling.user1Offer;
  } else if (signalType === 'answer' && room.user1 === userId) {
    partnerData = room.signaling.user2Answer;
  } else if (signalType === 'ice-candidate') {
    const partnerIce = room.user1 === userId ? room.signaling.user2Ice : room.signaling.user1Ice;
    partnerData = partnerIce;
  }
  
  return NextResponse.json({
    type: 'signal-relay',
    data: {
      partnerId,
      signalData: partnerData
    }
  });
}

function handleChatMessage(data) {
  const { roomId, userId, message } = data;
  
  if (!activeRooms.has(roomId)) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }
  
  const room = activeRooms.get(roomId);
  const partnerId = room.user1 === userId ? room.user2 : room.user1;
  
  // In a real implementation, you'd use WebSocket to send this to the partner
  // For now, just acknowledge
  return NextResponse.json({
    type: 'message-relayed',
    data: { partnerId, message }
  });
}

function handleNextMatch(data) {
  const { roomId, userId } = data;
  
  // Remove user from current room
  if (activeRooms.has(roomId)) {
    const room = activeRooms.get(roomId);
    const partnerId = room.user1 === userId ? room.user2 : room.user1;
    
    // Notify partner (in real implementation)
    console.log('👋 User left room:', userId);
    
    // Clean up room if empty
    if (partnerId) {
      // Create new room for remaining user or add to queue
      waitingQueue.push({
        userId: partnerId,
        userData: { mode: 'chat', vibeTags: ['random'] },
        joinedAt: Date.now()
      });
    }
    
    activeRooms.delete(roomId);
  }
  
  // Add user back to queue
  return handleFindMatch(data);
}

function handleLeaveRoom(data) {
  const { roomId, userId } = data;
  
  if (activeRooms.has(roomId)) {
    const room = activeRooms.get(roomId);
    const partnerId = room.user1 === userId ? room.user2 : room.user1;
    
    console.log('👋 User left room:', userId);
    
    // Add partner back to queue
    if (partnerId) {
      waitingQueue.push({
        userId: partnerId,
        userData: { mode: 'chat', vibeTags: ['random'] },
        joinedAt: Date.now()
      });
    }
    
    activeRooms.delete(roomId);
  }
  
  return NextResponse.json({ type: 'room-left' });
}
