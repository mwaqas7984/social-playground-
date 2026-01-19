import { useState, useEffect, useRef, useCallback } from 'react';
import { OmegleClone } from '../lib/omegle-clone';

export function useOmegleClone() {
  const [isConnected, setIsConnected] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [isMatched, setIsMatched] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [connectionState, setConnectionState] = useState('new');
  const [error, setError] = useState(null);
  const [matchInfo, setMatchInfo] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  
  const rtcRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Initialize RTC instance
  useEffect(() => {
    const rtc = new OmegleClone();
    
    // Set up event handlers
    rtc.onLocalStream = (stream) => {
      console.log('📹 Local stream received');
      setLocalStream(stream);
      
      // Attach to local video element
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    };
    
    rtc.onRemoteStream = (stream) => {
      console.log('📹 Remote stream received');
      setRemoteStream(stream);
      
      // Attach to remote video element
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
    };
    
    rtc.onMatchFound = (data) => {
      console.log('🤝 Match found:', data);
      setIsMatching(false);
      setIsMatched(true);
      setMatchInfo(data);
      setError(null);
    };
    
    rtc.onPartnerDisconnected = () => {
      console.log('💔 Partner disconnected');
      setIsMatched(false);
      setMatchInfo(null);
      setRemoteStream(null);
      setChatMessages([]);
      
      // Clear remote video
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    };
    
    rtc.onChatMessage = (data) => {
      console.log('💬 Chat message received:', data);
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        userId: data.userId,
        message: data.message,
        timestamp: data.timestamp,
        isMe: data.userId === rtcRef.current?.userId
      }]);
    };
    
    rtc.onError = (errorMessage) => {
      console.error('❌ RTC Error:', errorMessage);
      setError(errorMessage);
      setIsMatching(false);
      setIsMatched(false);
    };
    
    rtc.onConnectionStateChange = (state) => {
      console.log('🔄 Connection state:', state);
      setConnectionState(state);
    };
    
    rtc.onMatchingStatusChange = (isMatching) => {
      setIsMatching(isMatching);
    };
    
    rtcRef.current = rtc;
    
    // Initialize on mount
    rtc.initialize();
    
    return () => {
      rtc.cleanup();
    };
  }, []);

  // Find a match
  const findMatch = useCallback((userData) => {
    if (rtcRef.current) {
      setError(null);
      rtcRef.current.findMatch(userData);
    }
  }, []);

  // Find next match
  const nextMatch = useCallback(() => {
    if (rtcRef.current) {
      rtcRef.current.nextMatch();
      setMatchInfo(null);
      setChatMessages([]);
    }
  }, []);

  // Send chat message
  const sendChatMessage = useCallback((message) => {
    if (rtcRef.current && isMatched) {
      rtcRef.current.sendChatMessage(message);
      
      // Add own message to local state
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        userId: rtcRef.current.userId,
        message: message,
        timestamp: Date.now(),
        isMe: true
      }]);
    }
  }, [isMatched]);

  // Toggle audio
  const toggleAudio = useCallback((enabled) => {
    if (rtcRef.current) {
      rtcRef.current.toggleAudio(enabled);
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback((enabled) => {
    if (rtcRef.current) {
      rtcRef.current.toggleVideo(enabled);
    }
  }, []);

  // Set video refs
  const setLocalVideoRef = useCallback((ref) => {
    localVideoRef.current = ref;
    if (ref && localStream) {
      ref.srcObject = localStream;
    }
  }, [localStream]);

  const setRemoteVideoRef = useCallback((ref) => {
    remoteVideoRef.current = ref;
    if (ref && remoteStream) {
      ref.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return {
    // State
    isConnected,
    isMatching,
    isMatched,
    localStream,
    remoteStream,
    connectionState,
    error,
    matchInfo,
    chatMessages,
    
    // Actions
    findMatch,
    nextMatch,
    sendChatMessage,
    toggleAudio,
    toggleVideo,
    
    // Ref setters
    setLocalVideoRef,
    setRemoteVideoRef,
  };
}
