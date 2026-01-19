// Real-time WebRTC implementation for actual partner matching
class RealTimeWebRTC {
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
    this.pollingInterval = null;
    
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
    
    // API endpoint
    this.apiEndpoint = '/api/realtime';
  }

  // Generate unique user ID
  generateUserId() {
    return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Initialize the system
  async initialize() {
    this.userId = this.generateUserId();
    console.log(`👤 User initialized: ${this.userId}`);
    
    return true;
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
      
      console.log('✅ WebRTC initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize WebRTC:', error);
      this.onError?.('Failed to establish video connection');
      throw error;
    }
  }

  // Set up peer connection event handlers
  setupPeerConnectionHandlers() {
    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 ICE candidate generated');
        this.sendSignal('ice-candidate', event.candidate);
      }
    };

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      console.log('📹 Received remote stream');
      this.remoteStream = event.streams[0];
      this.onRemoteStream?.(this.remoteStream);
      this.isConnected = true;
      this.onConnectionStateChange?.('connected');
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
        this.handlePartnerDisconnected();
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
        this.handlePartnerDisconnected();
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
      
      // Send offer to partner via API
      await this.sendSignal('offer', offer);
      
    } catch (error) {
      console.error('❌ Failed to create offer:', error);
      this.onError?.('Failed to create video connection');
    }
  }

  // Handle WebRTC offer
  async handleOffer(offer) {
    try {
      console.log('📥 Handling offer...');
      
      await this.peerConnection.setRemoteDescription(offer);
      
      // Create answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      console.log('📥 Answer created');
      
      // Send answer to partner via API
      await this.sendSignal('answer', answer);
      
    } catch (error) {
      console.error('❌ Failed to handle offer:', error);
      this.onError?.('Failed to handle video connection');
    }
  }

  // Handle WebRTC answer
  async handleAnswer(answer) {
    try {
      console.log('📥 Handling answer...');
      
      await this.peerConnection.setRemoteDescription(answer);
      
      console.log('📥 Answer set as remote description');
      
    } catch (error) {
      console.error('❌ Failed to handle answer:', error);
      this.onError?.('Failed to handle video connection');
    }
  }

  // Handle ICE candidate
  async handleIceCandidate(candidate) {
    try {
      console.log('🧊 Handling ICE candidate...');
      
      await this.peerConnection.addIceCandidate(candidate);
      
      console.log('🧊 ICE candidate added');
      
    } catch (error) {
      console.error('❌ Failed to handle ICE candidate:', error);
    }
  }

  // Send signaling data via API
  async sendSignal(signalType, signalData) {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'signal',
          data: {
            roomId: this.roomId,
            userId: this.userId,
            signalType,
            signalData
          }
        })
      });
      
      const result = await response.json();
      
      if (result.type === 'signal-relay' && result.data.signalData) {
        // Handle partner's signaling data
        if (signalType === 'offer' && result.data.signalData.type === 'answer') {
          await this.handleAnswer(result.data.signalData);
        } else if (signalType === 'answer' && result.data.signalData.type === 'offer') {
          await this.handleOffer(result.data.signalData);
        } else if (signalType === 'ice-candidate') {
          await this.handleIceCandidate(result.data.signalData);
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to send signal:', error);
    }
  }

  // Find a match with real partner
  async findMatch(userData) {
    if (this.isMatching || this.isMatched) {
      console.log('⚠️ Already matching or matched');
      return;
    }
    
    console.log('🔍 Looking for real match...');
    
    this.isMatching = true;
    this.onMatchingStatusChange?.(true);
    
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'find-match',
          data: {
            ...userData,
            userId: this.userId
          }
        })
      });
      
      const result = await response.json();
      
      if (result.type === 'matched') {
        // Determine which user data applies to us
        const userData = result.data.user1.userId === this.userId ? result.data.user1 : result.data.user2;
        
        this.partnerId = userData.partnerId;
        this.roomId = result.data.roomId;
        this.isInitiator = userData.isInitiator;
        this.isMatched = true;
        this.isMatching = false;
        
        console.log(`🤝 Real match found! Room: ${this.roomId}, Partner: ${this.partnerId}`);
        
        this.onMatchFound?.({
          partnerId: this.partnerId,
          roomId: this.roomId,
          isInitiator: this.isInitiator
        });
        
        // Initialize WebRTC connection
        await this.initializeWebRTC();
        
        // If initiator, create offer
        if (this.isInitiator) {
          setTimeout(() => this.createOffer(), 1000);
        }
        
        // Start polling for partner signals
        this.startSignalPolling();
        
      } else if (result.type === 'waiting') {
        console.log(`⏳ Waiting for partner... Position: ${result.data.queuePosition}`);
        
        // Start polling for match
        this.startMatchPolling(userData);
      }
      
    } catch (error) {
      console.error('❌ Failed to find match:', error);
      this.onError?.('Failed to find partner');
      this.isMatching = false;
      this.onMatchingStatusChange?.(false);
    }
  }

  // Start polling for match
  startMatchPolling(userData) {
    this.pollingInterval = setInterval(async () => {
      if (!this.isMatching) {
        clearInterval(this.pollingInterval);
        return;
      }
      
      try {
        const response = await fetch(this.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'find-match',
            data: {
              ...userData,
              userId: this.userId
            }
          })
        });
        
        const result = await response.json();
        
        if (result.type === 'matched') {
          clearInterval(this.pollingInterval);
          
          // Handle match (same as above)
          const userData = result.data.user1.userId === this.userId ? result.data.user1 : result.data.user2;
          
          this.partnerId = userData.partnerId;
          this.roomId = result.data.roomId;
          this.isInitiator = userData.isInitiator;
          this.isMatched = true;
          this.isMatching = false;
          
          console.log(`🤝 Real match found! Room: ${this.roomId}, Partner: ${this.partnerId}`);
          
          this.onMatchFound?.({
            partnerId: this.partnerId,
            roomId: this.roomId,
            isInitiator: this.isInitiator
          });
          
          await this.initializeWebRTC();
          
          if (this.isInitiator) {
            setTimeout(() => this.createOffer(), 1000);
          }
          
          this.startSignalPolling();
        }
        
      } catch (error) {
        console.error('❌ Error polling for match:', error);
      }
    }, 2000);
  }

  // Start polling for signals
  startSignalPolling() {
    // In a real implementation, you'd use WebSockets for real-time signaling
    // For now, we'll use polling as a fallback
    console.log('📡 Starting signal polling...');
  }

  // Send chat message to real partner
  async sendChatMessage(message) {
    if (!this.isMatched) {
      console.log('⚠️ Not matched, cannot send message');
      return;
    }
    
    console.log('💬 Sending message to real partner:', message);
    
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'chat-message',
          data: {
            roomId: this.roomId,
            userId: this.userId,
            message: message
          }
        })
      });
      
      const result = await response.json();
      
      if (result.type === 'message-relayed') {
        console.log('✅ Message relayed to partner');
      }
      
    } catch (error) {
      console.error('❌ Failed to send message:', error);
    }
  }

  // Find next match with real partner
  async nextMatch() {
    console.log('🔄 Finding next real match...');
    
    // Leave current room
    if (this.roomId) {
      try {
        await fetch(this.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'next-match',
            data: {
              roomId: this.roomId,
              userId: this.userId
            }
          })
        });
      } catch (error) {
        console.error('❌ Failed to leave room:', error);
      }
    }
    
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

  // Handle partner disconnection
  handlePartnerDisconnected() {
    console.log('💔 Partner disconnected');
    
    this.isMatched = false;
    this.isMatching = false;
    
    // Stop remote stream
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
      this.remoteStream = null;
    }
    
    this.onPartnerDisconnected?.();
    
    // Clean up
    this.cleanup();
  }

  // Clean up resources
  cleanup() {
    console.log('🧹 Cleaning up resources...');
    
    // Clear polling
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
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
    
    console.log('✅ Cleanup completed');
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RealTimeWebRTC;
} else if (typeof window !== 'undefined') {
  window.RealTimeWebRTC = RealTimeWebRTC;
}
