import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { OmegleRTC } from '../lib/omegle-rtc';

export function useOmegleRTC(serverUrl = 'http://localhost:3001') {
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
    const rtc = new OmegleRTC();
    
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
        userId: data.from,
        message: data.message,
        timestamp: data.timestamp,
        isMe: data.from === rtcRef.current?.userId
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
    
    rtcRef.current = rtc;
    
    return () => {
      rtc.cleanup();
    };
  }, []);

  // Connect to server
  const connect = useCallback(async () => {
    if (rtcRef.current) {
      const success = await rtcRef.current.connect(serverUrl);
      setIsConnected(success);
      return success;
    }
    return false;
  }, [serverUrl]);

  // Find a match
  const findMatch = useCallback((userData) => {
    if (rtcRef.current && isConnected) {
      setIsMatching(true);
      setError(null);
      rtcRef.current.findMatch(userData);
    } else {
      setError('Not connected to server');
    }
  }, [isConnected]);

  // Find next match
  const nextMatch = useCallback(() => {
    if (rtcRef.current) {
      rtcRef.current.nextMatch();
      setIsMatched(false);
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

  // Send game action
  const sendGameAction = useCallback((action) => {
    if (rtcRef.current && isMatched) {
      rtcRef.current.sendGameAction(action);
    }
  }, [isMatched]);

  // Send activity event
  const sendActivityEvent = useCallback((event) => {
    if (rtcRef.current && isMatched) {
      rtcRef.current.sendActivityEvent(event);
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

  // Get connection stats
  const getStats = useCallback(async () => {
    if (rtcRef.current) {
      return await rtcRef.current.getStats();
    }
    return null;
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
    connect,
    findMatch,
    nextMatch,
    sendChatMessage,
    sendGameAction,
    sendActivityEvent,
    toggleAudio,
    toggleVideo,
    getStats,
    
    // Ref setters
    setLocalVideoRef,
    setRemoteVideoRef,
  };
}
