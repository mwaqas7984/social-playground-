import { useState, useCallback, useRef } from 'react';

export function useWebRTC() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const startCall = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      setLocalStream(stream);
      
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      });
      
      peerConnectionRef.current = pc;
      
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
      
      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          // Send ICE candidate through signaling channel
          console.log('ICE candidate:', event.candidate);
        }
      };
      
    } catch (error) {
      console.error('Failed to start call:', error);
    }
  }, []);

  const endCall = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    setRemoteStream(null);
  }, [localStream]);

  const toggleCamera = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  }, [localStream]);

  const toggleMic = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  }, [localStream]);

  const createOffer = useCallback(async () => {
    if (!peerConnectionRef.current) return null;
    
    const offer = await peerConnectionRef.current.createOffer();
    await peerConnectionRef.current.setLocalDescription(offer);
    return offer;
  }, []);

  const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit) => {
    if (!peerConnectionRef.current) return;
    
    await peerConnectionRef.current.setRemoteDescription(offer);
    const answer = await peerConnectionRef.current.createAnswer();
    await peerConnectionRef.current.setLocalDescription(answer);
    return answer;
  }, []);

  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    if (!peerConnectionRef.current) return;
    
    await peerConnectionRef.current.setRemoteDescription(answer);
  }, []);

  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    if (!peerConnectionRef.current) return;
    
    await peerConnectionRef.current.addIceCandidate(candidate);
  }, []);

  return {
    localStream,
    remoteStream,
    isCameraOn,
    isMicOn,
    startCall,
    endCall,
    toggleCamera,
    toggleMic,
    createOffer,
    handleOffer,
    handleAnswer,
    handleIceCandidate
  };
}
