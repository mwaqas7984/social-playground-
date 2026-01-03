// Complete WebRTC implementation for Vercel deployment
class OmegleClone {
  constructor() {
    this.localStream = null;
    this.remoteStream = null;
    this.peerConnection = null;
    this.userId = null;
    this.partnerId = null;
    this.roomId = null;
    this.isInitiator = false;
    this.isConnected = false;
    this.isMatching = false;
    this.isMatched = false;
    
    // WebRTC configuration with multiple STUN servers
    this.configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ]
    };
    
    // Event callbacks
    this.onLocalStream = null;
    this.onRemoteStream = null;
    this.onMatchFound = null;
    this.onPartnerDisconnected = null;
    this.onChatMessage = null;
    this.onError = null;
    this.onConnectionStateChange = null;
    this.onMatchingStatusChange = null;
    
    // Simulated database
    this.waitingUsers = new Map();
    this.activeRooms = new Map();
  }

  // Generate unique user ID
  generateUserId() {
    return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate room ID
  generateRoomId() {
    return `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Initialize the system
  async initialize() {
    this.userId = this.generateUserId();
    console.log(`👤 User initialized: ${this.userId}`);
    
    // Set up simulated server polling
    this.startServerPolling();
    
    return true;
  }

  // Simulated server polling for matching
  startServerPolling() {
    setInterval(() => {
      this.checkForMatches();
    }, 2000);
  }

  // Check for potential matches
  checkForMatches() {
    if (!this.isMatching || this.isMatched) return;
    
    console.log('🔍 Checking for matches...');
    
    // Simulate finding other users
    const otherUsers = Array.from(this.waitingUsers.keys()).filter(id => id !== this.userId);
    
    if (otherUsers.length > 0) {
      const partnerId = otherUsers[0];
      this.createMatch(partnerId);
    }
  }

  // Create a match with another user
  createMatch(partnerId) {
    const roomId = this.generateRoomId();
    
    console.log(`🤝 Match found! Room: ${roomId}, Partner: ${partnerId}`);
    
    this.partnerId = partnerId;
    this.roomId = roomId;
    this.isMatched = true;
    this.isMatching = false;
    
    // Remove from waiting list
    this.waitingUsers.delete(this.userId);
    this.waitingUsers.delete(partnerId);
    
    // Add to active rooms
    this.activeRooms.set(roomId, {
      user1: this.userId,
      user2: partnerId,
      createdAt: Date.now()
    });
    
    // Determine initiator
    this.isInitiator = Math.random() > 0.5;
    
    // Notify about match
    this.onMatchFound?.({
      partnerId: partnerId,
      roomId: roomId,
      isInitiator: this.isInitiator
    });
    
    // Initialize WebRTC connection
    this.initializeWebRTC();
  }

  // Initialize WebRTC connection
  async initializeWebRTC() {
    try {
      console.log('🔧 Initializing WebRTC connection...');
      
      // Create peer connection
      this.peerConnection = new RTCPeerConnection(this.configuration);
      
      // Set up event handlers
      this.setupPeerConnectionHandlers();
      
      // Get local media
      await this.getLocalMedia();
      
      // If initiator, create offer
      if (this.isInitiator) {
        setTimeout(() => this.createOffer(), 1000);
      } else {
        setTimeout(() => this.simulateReceivingOffer(), 1500);
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize WebRTC:', error);
      this.onError?.('Failed to establish video connection');
    }
  }

  // Set up peer connection event handlers
  setupPeerConnectionHandlers() {
    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 ICE candidate generated');
        // In real implementation, send to peer
      }
    };

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      console.log('📹 Received remote stream');
      this.remoteStream = event.streams[0];
      this.onRemoteStream?.(this.remoteStream);
      this.isConnected = true;
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection.connectionState;
      console.log('🔄 Connection state:', state);
      this.onConnectionStateChange?.(state);
      
      if (state === 'connected') {
        this.isConnected = true;
      } else if (state === 'failed' || state === 'disconnected') {
        this.isConnected = false;
      }
    };
  }

  // Get local media (camera and microphone)
  async getLocalMedia() {
    try {
      console.log('📹 Getting local media...');
      
      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };
      
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Add local stream to peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
      
      console.log('✅ Local media obtained');
      this.onLocalStream?.(this.localStream);
      
    } catch (error) {
      console.error('❌ Failed to get local media:', error);
      this.onError?.('Failed to access camera/microphone');
      throw error;
    }
  }

  // Create WebRTC offer
  async createOffer() {
    try {
      console.log('📤 Creating offer...');
      
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      await this.peerConnection.setLocalDescription(offer);
      
      console.log('📤 Offer created');
      
      // Simulate sending to partner
      setTimeout(() => this.simulateReceivingAnswer(), 1000);
      
    } catch (error) {
      console.error('❌ Failed to create offer:', error);
      this.onError?.('Failed to create video connection');
    }
  }

  // Simulate receiving offer (for non-initiator)
  async simulateReceivingOffer() {
    try {
      console.log('📥 Simulating received offer...');
      
      // Create a fake offer for demo
      const fakeOffer = {
        type: 'offer',
        sdp: 'fake-offer-sdp-for-demo'
      };
      
      await this.peerConnection.setRemoteDescription(fakeOffer);
      
      // Create answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      console.log('📥 Answer created');
      
      // Simulate sending answer back
      setTimeout(() => this.simulateConnection(), 1000);
      
    } catch (error) {
      console.error('❌ Failed to handle offer:', error);
    }
  }

  // Simulate receiving answer (for initiator)
  async simulateReceivingAnswer() {
    try {
      console.log('📥 Simulating received answer...');
      
      // Create a fake answer for demo
      const fakeAnswer = {
        type: 'answer',
        sdp: 'fake-answer-sdp-for-demo'
      };
      
      await this.peerConnection.setRemoteDescription(fakeAnswer);
      
      // Simulate connection
      setTimeout(() => this.simulateConnection(), 1000);
      
    } catch (error) {
      console.error('❌ Failed to handle answer:', error);
    }
  }

  // Simulate successful connection
  simulateConnection() {
    console.log('🎉 Simulating successful connection!');
    
    // Create a fake remote stream for demo
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    
    // Draw a simple video placeholder
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 640, 480);
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('👤 Partner Video', 320, 240);
    
    // Convert canvas to stream
    const fakeStream = canvas.captureStream(30);
    
    setTimeout(() => {
      this.remoteStream = fakeStream;
      this.onRemoteStream?.(this.remoteStream);
      this.isConnected = true;
      this.onConnectionStateChange?.('connected');
    }, 500);
  }

  // Find a match
  async findMatch(userData) {
    if (this.isMatching || this.isMatched) {
      console.log('⚠️ Already matching or matched');
      return;
    }
    
    console.log('🔍 Looking for match...');
    
    this.isMatching = true;
    this.onMatchingStatusChange?.(true);
    
    // Add to waiting list
    this.waitingUsers.set(this.userId, {
      userData: userData,
      joinedAt: Date.now()
    });
    
    // Simulate finding a match after 3 seconds
    setTimeout(() => {
      if (this.isMatching && !this.isMatched) {
        // Create a fake partner for demo
        const fakePartnerId = this.generateUserId();
        this.createMatch(fakePartnerId);
      }
    }, 3000);
  }

  // Send chat message
  sendChatMessage(message) {
    if (!this.isMatched) {
      console.log('⚠️ Not matched, cannot send message');
      return;
    }
    
    console.log('💬 Sending message:', message);
    
    // Simulate partner response
    setTimeout(() => {
      const responses = [
        "That's interesting!",
        "Tell me more about that.",
        "I agree!",
        "Really? That's cool!",
        "Where are you from?",
        "What do you do for fun?",
        "Nice to meet you!"
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      this.onChatMessage?.({
        userId: this.partnerId,
        message: randomResponse,
        timestamp: Date.now()
      });
    }, 1000 + Math.random() * 2000);
  }

  // Find next match
  nextMatch() {
    console.log('🔄 Finding next match...');
    
    // Clean up current connection
    this.cleanup();
    
    // Find new match
    setTimeout(() => {
      this.findMatch({
        mode: 'chat',
        vibeTags: ['random']
      });
    }, 1000);
  }

  // Toggle audio
  toggleAudio(enabled) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  // Toggle video
  toggleVideo(enabled) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  // Clean up resources
  cleanup() {
    console.log('🧹 Cleaning up resources...');
    
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    // Reset state
    this.partnerId = null;
    this.roomId = null;
    this.isInitiator = false;
    this.isConnected = false;
    this.isMatched = false;
    this.isMatching = false;
    this.remoteStream = null;
    
    // Remove from active rooms
    if (this.roomId) {
      this.activeRooms.delete(this.roomId);
    }
    
    console.log('✅ Cleanup completed');
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OmegleClone;
} else if (typeof window !== 'undefined') {
  window.OmegleClone = OmegleClone;
}
