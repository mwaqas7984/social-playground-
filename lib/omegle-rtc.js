import { io } from 'socket.io-client';

class OmegleRTC {
  constructor() {
    this.socket = null;
    this.localStream = null;
    this.remoteStream = null;
    this.peerConnection = null;
    this.userId = null;
    this.partnerId = null;
    this.roomId = null;
    this.isInitiator = false;
    this.isConnected = false;
    
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
    this.onGameAction = null;
    this.onActivityEvent = null;
    this.onError = null;
    this.onConnectionStateChange = null;
  }

  async connect(serverUrl = 'http://localhost:3001') {
    try {
      console.log('🔌 Connecting to Socket.IO server...');
      
      // Connect to Socket.IO server
      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling']
      });
      
      // Set up socket event handlers
      this.setupSocketHandlers();
      
      console.log('✅ Connected to Socket.IO server');
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to server:', error);
      this.onError?.('Failed to connect to server');
      return false;
    }
  }

  setupSocketHandlers() {
    this.socket.on('connect', () => {
      console.log('🔗 Socket connected');
      this.userId = this.socket.id;
    });

    this.socket.on('matched', (data) => {
      console.log('🤝 Match found!', data);
      this.handleMatchFound(data);
    });

    this.socket.on('signal', (data) => {
      console.log('📡 Received signal:', data.type);
      this.handleSignaling(data);
    });

    this.socket.on('chat-message', (data) => {
      console.log('💬 Received chat message:', data);
      this.onChatMessage?.(data);
    });

    this.socket.on('game-action', (data) => {
      console.log('🎮 Received game action:', data);
      this.onGameAction?.(data);
    });

    this.socket.on('activity-event', (data) => {
      console.log('🎨 Received activity event:', data);
      this.onActivityEvent?.(data);
    });

    this.socket.on('partner-left', (data) => {
      console.log('💔 Partner disconnected:', data);
      this.handlePartnerDisconnected();
    });

    this.socket.on('room-closed', () => {
      console.log('🏠 Room closed');
      this.handlePartnerDisconnected();
    });

    this.socket.on('error', (error) => {
      console.error('❌ Server error:', error);
      this.onError?.(error);
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Disconnected from server');
      this.cleanup();
    });
  }

  async handleMatchFound(data) {
    try {
      this.partnerId = data.partnerId;
      this.roomId = data.roomId;
      this.isInitiator = data.isInitiator;
      
      console.log(`🎯 Matched with partner ${this.partnerId} in room ${this.roomId}`);
      console.log(`🎭 I am the ${this.isInitiator ? 'initiator' : 'responder'}`);
      
      // Initialize WebRTC connection
      await this.initializePeerConnection();
      
      // Get local media
      await this.getLocalMedia();
      
      // Notify callback
      this.onMatchFound?.({
        partnerId: this.partnerId,
        roomId: this.roomId,
        isInitiator: this.isInitiator
      });
      
      // If initiator, create offer
      if (this.isInitiator) {
        console.log('🎬 Creating offer...');
        await this.createOffer();
      }
      
    } catch (error) {
      console.error('❌ Error handling match found:', error);
      this.onError?.('Failed to establish connection');
    }
  }

  async initializePeerConnection() {
    try {
      console.log('🔧 Initializing peer connection...');
      
      // Create peer connection
      this.peerConnection = new RTCPeerConnection(this.configuration);
      
      // Set up peer connection event handlers
      this.setupPeerConnectionHandlers();
      
      console.log('✅ Peer connection initialized');
    } catch (error) {
      console.error('❌ Failed to initialize peer connection:', error);
      throw error;
    }
  }

  setupPeerConnectionHandlers() {
    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 Sending ICE candidate');
        this.sendSignal({
          type: 'ice-candidate',
          candidate: event.candidate
        });
      }
    };

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      console.log('📹 Received remote stream');
      this.remoteStream = event.streams[0];
      this.onRemoteStream?.(this.remoteStream);
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection.connectionState;
      console.log('🔄 Connection state changed:', state);
      this.onConnectionStateChange?.(state);
      
      if (state === 'connected') {
        this.isConnected = true;
      } else if (state === 'failed' || state === 'disconnected') {
        this.isConnected = false;
      }
    };

    // Handle ICE connection state changes
    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection.iceConnectionState;
      console.log('🧊 ICE connection state:', state);
      
      if (state === 'connected') {
        this.isConnected = true;
      } else if (state === 'failed' || state === 'disconnected') {
        this.isConnected = false;
      }
    };
  }

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

  async createOffer() {
    try {
      console.log('📤 Creating offer...');
      
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      await this.peerConnection.setLocalDescription(offer);
      
      console.log('📤 Offer created and set as local description');
      
      // Send offer to peer
      this.sendSignal({
        type: 'offer',
        offer: offer
      });
      
    } catch (error) {
      console.error('❌ Failed to create offer:', error);
      this.onError?.('Failed to create offer');
    }
  }

  async handleOffer(offer) {
    try {
      console.log('📥 Handling offer...');
      
      await this.peerConnection.setRemoteDescription(offer);
      
      // Create answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      console.log('📥 Answer created and set as local description');
      
      // Send answer to peer
      this.sendSignal({
        type: 'answer',
        answer: answer
      });
      
    } catch (error) {
      console.error('❌ Failed to handle offer:', error);
      this.onError?.('Failed to handle offer');
    }
  }

  async handleAnswer(answer) {
    try {
      console.log('📥 Handling answer...');
      
      await this.peerConnection.setRemoteDescription(answer);
      
      console.log('📥 Answer set as remote description');
      
    } catch (error) {
      console.error('❌ Failed to handle answer:', error);
      this.onError?.('Failed to handle answer');
    }
  }

  async handleIceCandidate(candidate) {
    try {
      console.log('🧊 Handling ICE candidate...');
      
      await this.peerConnection.addIceCandidate(candidate);
      
      console.log('🧊 ICE candidate added');
      
    } catch (error) {
      console.error('❌ Failed to handle ICE candidate:', error);
    }
  }

  handleSignaling(data) {
    try {
      switch (data.type) {
        case 'offer':
          this.handleOffer(data.offer);
          break;
        case 'answer':
          this.handleAnswer(data.answer);
          break;
        case 'ice-candidate':
          this.handleIceCandidate(data.candidate);
          break;
        default:
          console.warn('⚠️ Unknown signal type:', data.type);
      }
    } catch (error) {
      console.error('❌ Error handling signal:', error);
    }
  }

  sendSignal(data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('signal', data);
    } else {
      console.error('❌ Socket not connected');
    }
  }

  findMatch(userData) {
    if (this.socket && this.socket.connected) {
      console.log('🔍 Looking for match...');
      this.socket.emit('find-match', userData);
    } else {
      console.error('❌ Socket not connected');
      this.onError?.('Not connected to server');
    }
  }

  nextMatch() {
    if (this.socket && this.socket.connected) {
      console.log('🔄 Looking for next match...');
      this.cleanup();
      this.socket.emit('next-match');
    }
  }

  sendChatMessage(message) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('chat-message', {
        message: message,
        userId: this.userId
      });
    }
  }

  sendGameAction(action) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('game-action', {
        action: action,
        userId: this.userId
      });
    }
  }

  sendActivityEvent(event) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('activity-event', {
        event: event,
        userId: this.userId
      });
    }
  }

  handlePartnerDisconnected() {
    console.log('💔 Handling partner disconnection...');
    
    // Stop remote stream
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
      this.remoteStream = null;
    }
    
    this.isConnected = false;
    
    // Notify callback
    this.onPartnerDisconnected?.();
    
    // Clean up
    this.cleanup();
  }

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
    this.remoteStream = null;
    
    console.log('✅ Cleanup completed');
  }

  // Media controls
  toggleAudio(enabled) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  toggleVideo(enabled) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  // Get connection statistics
  async getStats() {
    if (this.peerConnection) {
      try {
        const stats = await this.peerConnection.getStats();
        return stats;
      } catch (error) {
        console.error('❌ Failed to get stats:', error);
        return null;
      }
    }
    return null;
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OmegleRTC;
} else if (typeof window !== 'undefined') {
  window.OmegleRTC = OmegleRTC;
}
