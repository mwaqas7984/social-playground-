const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'https://*.vercel.app'],
  methods: ['GET', 'POST'],
  credentials: true
}));

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'https://*.vercel.app'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Global state
const waitingQueue = [];
const activeRooms = new Map(); // roomId -> { users: [], createdAt }
const socketToRoom = new Map(); // socketId -> roomId
const socketToUser = new Map(); // socketId -> userData

function generateRoomId() {
  return `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function cleanupRoom(roomId) {
  console.log(`🧹 Cleaning up room: ${roomId}`);
  
  if (activeRooms.has(roomId)) {
    const room = activeRooms.get(roomId);
    
    // Notify all users in room
    room.users.forEach(userId => {
      const socket = Array.from(io.sockets.sockets.values()).find(s => s.id === userId);
      if (socket) {
        socket.emit('room-closed');
      }
    });
    
    activeRooms.delete(roomId);
  }
}

function matchUsers() {
  console.log(`🎯 Matching users. Queue size: ${waitingQueue.length}`);
  
  while (waitingQueue.length >= 2) {
    const user1 = waitingQueue.shift();
    const user2 = waitingQueue.shift();
    
    const roomId = generateRoomId();
    
    // Create room
    activeRooms.set(roomId, {
      users: [user1.socketId, user2.socketId],
      createdAt: Date.now()
    });
    
    // Update mappings
    socketToRoom.set(user1.socketId, roomId);
    socketToRoom.set(user2.socketId, roomId);
    
    // Get socket objects
    const socket1 = io.sockets.sockets.get(user1.socketId);
    const socket2 = io.sockets.sockets.get(user2.socketId);
    
    if (socket1 && socket2) {
      console.log(`🤝 Matched users: ${user1.socketId} <-> ${user2.socketId} in room ${roomId}`);
      
      // Join both to room
      socket1.join(roomId);
      socket2.join(roomId);
      
      // Notify both users
      socket1.emit('matched', { 
        roomId, 
        isInitiator: true,
        partnerId: user2.socketId 
      });
      
      socket2.emit('matched', { 
        roomId, 
        isInitiator: false,
        partnerId: user1.socketId 
      });
      
      // Notify room about new users
      io.to(roomId).emit('user-joined', {
        userId: user1.socketId,
        userCount: 2
      });
      
      io.to(roomId).emit('user-joined', {
        userId: user2.socketId,
        userCount: 2
      });
    }
  }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 New connection: ${socket.id}`);
  
  // Handle user looking for match
  socket.on('find-match', (userData) => {
    console.log(`🔍 User ${socket.id} looking for match:`, userData);
    
    // Store user data
    socketToUser.set(socket.id, {
      ...userData,
      joinedAt: Date.now()
    });
    
    // Add to waiting queue
    waitingQueue.push({
      socketId: socket.id,
      userData: userData,
      joinedAt: Date.now()
    });
    
    console.log(`📋 Added to waiting queue. Queue size: ${waitingQueue.length}`);
    
    // Try to match immediately
    matchUsers();
  });
  
  // Handle WebRTC signaling
  socket.on('signal', (data) => {
    console.log(`📡 Signal from ${socket.id}:`, data.type);
    
    const roomId = socketToRoom.get(socket.id);
    if (roomId) {
      // Relay to all other users in room
      socket.to(roomId).emit('signal', {
        ...data,
        from: socket.id
      });
    } else {
      console.log(`❌ User ${socket.id} not in any room`);
    }
  });
  
  // Handle chat messages
  socket.on('chat-message', (data) => {
    console.log(`💬 Chat message from ${socket.id}:`, data);
    
    const roomId = socketToRoom.get(socket.id);
    if (roomId) {
      // Broadcast to room
      socket.to(roomId).emit('chat-message', {
        ...data,
        from: socket.id,
        timestamp: Date.now()
      });
    }
  });
  
  // Handle game actions
  socket.on('game-action', (data) => {
    console.log(`🎮 Game action from ${socket.id}:`, data);
    
    const roomId = socketToRoom.get(socket.id);
    if (roomId) {
      socket.to(roomId).emit('game-action', {
        ...data,
        from: socket.id,
        timestamp: Date.now()
      });
    }
  });
  
  // Handle activity events
  socket.on('activity-event', (data) => {
    console.log(`🎨 Activity event from ${socket.id}:`, data);
    
    const roomId = socketToRoom.get(socket.id);
    if (roomId) {
      socket.to(roomId).emit('activity-event', {
        ...data,
        from: socket.id,
        timestamp: Date.now()
      });
    }
  });
  
  // Handle next button (find new match)
  socket.on('next-match', () => {
    console.log(`🔄 User ${socket.id} wants next match`);
    
    // Leave current room
    const currentRoomId = socketToRoom.get(socket.id);
    if (currentRoomId) {
      socket.leave(currentRoomId);
      socket.to(currentRoomId).emit('partner-left', { userId: socket.id });
      
      // Update room
      const room = activeRooms.get(currentRoomId);
      if (room) {
        room.users = room.users.filter(id => id !== socket.id);
        if (room.users.length === 0) {
          cleanupRoom(currentRoomId);
        }
      }
      
      socketToRoom.delete(socket.id);
    }
    
    // Find new match
    socket.emit('find-match', socketToUser.get(socket.id));
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`🔌 User ${socket.id} disconnected`);
    
    // Remove from waiting queue
    const queueIndex = waitingQueue.findIndex(u => u.socketId === socket.id);
    if (queueIndex > -1) {
      waitingQueue.splice(queueIndex, 1);
    }
    
    // Handle room cleanup
    const roomId = socketToRoom.get(socket.id);
    if (roomId) {
      socket.to(roomId).emit('partner-left', { userId: socket.id });
      
      const room = activeRooms.get(roomId);
      if (room) {
        room.users = room.users.filter(id => id !== socket.id);
        if (room.users.length === 0) {
          cleanupRoom(roomId);
        }
      }
      
      socketToRoom.delete(socket.id);
    }
    
    socketToUser.delete(socket.id);
  });
  
  // Handle leave queue
  socket.on('leave-queue', () => {
    console.log(`🚪 User ${socket.id} leaving queue`);
    
    const queueIndex = waitingQueue.findIndex(u => u.socketId === socket.id);
    if (queueIndex > -1) {
      waitingQueue.splice(queueIndex, 1);
    }
  });
});

// Error handling
io.on('error', (err) => {
  console.error('❌ Socket.IO error:', err);
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Omegle-style server running on port ${PORT}`);
  console.log(`📊 Waiting queue: ${waitingQueue.length} users`);
  console.log(`🏠 Active rooms: ${activeRooms.size} rooms`);
});

// Cleanup old rooms periodically
setInterval(() => {
  const now = Date.now();
  const ROOM_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  
  for (const [roomId, room] of activeRooms.entries()) {
    if (now - room.createdAt > ROOM_TIMEOUT) {
      console.log(`🕐 Cleaning up old room: ${roomId}`);
      cleanupRoom(roomId);
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('🔌 Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('🔌 Server closed');
    process.exit(0);
  });
});
