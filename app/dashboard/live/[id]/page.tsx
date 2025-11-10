'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Eye, Search, AlertTriangle, Activity, BarChart3, Clock, Copy, Send, Video, Monitor } from 'lucide-react';
import { API_BASE_URL, WS_VIDEO_URL } from '@/lib/config';
import { ProtectedRoute } from '@/components/protected-route';
import { api } from '@/lib/api';

interface LiveData {
  timestamp: string;
  watcher: any;
  extractor: any;
  sanity: any;
  metrics: any;
  timeline: any[];
  latestActivity: any[];
  alerts: any[];
}

function LiveMonitoringPageContent() {
  const params = useParams();
  const router = useRouter();
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoChunks, setVideoChunks] = useState<any[]>([]);
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const screenshareVideoRef = useRef<HTMLVideoElement>(null);
  const webcamInitializedRef = useRef(false);
  const screenshareInitializedRef = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleVideoChunkRef = useRef<((message: any) => void) | null>(null);
  // Store chunks with their index for proper sorting
  const webcamChunkQueue = useRef<Array<{data: Uint8Array, index: number}>>([]);
  const screenshareChunkQueue = useRef<Array<{data: Uint8Array, index: number}>>([]);
  const webcamRetryCount = useRef<number>(0);
  const screenshareRetryCount = useRef<number>(0);
  const webcamMediaSourceRef = useRef<MediaSource | null>(null);
  const screenshareMediaSourceRef = useRef<MediaSource | null>(null);
  const webcamSourceBufferRef = useRef<SourceBuffer | null>(null);
  const screenshareSourceBufferRef = useRef<SourceBuffer | null>(null);
  const webcamAppendingRef = useRef<boolean>(false);
  const screenshareAppendingRef = useRef<boolean>(false);

  // Process queued chunks for a stream (defined first to avoid forward reference issues)
  const processChunkQueue = useCallback(async (streamType: 'webcam' | 'screenshare') => {
    const chunkQueue = streamType === 'webcam' ? webcamChunkQueue : screenshareChunkQueue;
    const sourceBufferRef = streamType === 'webcam' ? webcamSourceBufferRef : screenshareSourceBufferRef;
    const appendingRef = streamType === 'webcam' ? webcamAppendingRef : screenshareAppendingRef;
    const mediaSourceRef = streamType === 'webcam' ? webcamMediaSourceRef : screenshareMediaSourceRef;
    const videoRef = streamType === 'webcam' ? webcamVideoRef : screenshareVideoRef;

    const sourceBuffer = sourceBufferRef.current;
    const mediaSource = mediaSourceRef.current;

    if (!sourceBuffer || !mediaSource) {
      console.log(`${streamType}: SourceBuffer or MediaSource not ready`);
      return;
    }

    if (appendingRef.current) {
      console.log(`${streamType}: Already appending, waiting...`);
      return;
    }

    if (chunkQueue.current.length === 0) {
      return;
    }

    if (mediaSource.readyState !== 'open') {
      console.log(`${streamType}: MediaSource not open (readyState: ${mediaSource.readyState})`);
      return;
    }

    if (sourceBuffer.updating) {
      console.log(`${streamType}: SourceBuffer is updating, waiting...`);
      return;
    }

    // Check if we have chunk 0 (initialization segment)
    const isFirstAppend = sourceBuffer.buffered.length === 0;
    if (isFirstAppend) {
      const chunk0Item = (chunkQueue.current as Array<{data: Uint8Array, index: number}>).find((item: any) => item.index === 0);
      
      if (!chunk0Item) {
        console.log(`${streamType}: Waiting for chunk 0 (initialization segment)...`);
        return;
      }

      // Ensure chunk 0 is first (remove any duplicates first)
      const chunk0Items = (chunkQueue.current as Array<{data: Uint8Array, index: number}>).filter((item: any) => item.index === 0);
      if (chunk0Items.length > 1) {
        console.warn(`${streamType}: Multiple chunk 0 found, keeping only the first one`);
        // Remove all chunk 0s
        chunkQueue.current = (chunkQueue.current as Array<any>).filter((item: any) => item.index !== 0);
        // Add back only the first one
        (chunkQueue.current as Array<any>).unshift(chunk0Items[0]);
      } else {
        // Move chunk 0 to front if not already first
        const chunk0Index = (chunkQueue.current as Array<{data: Uint8Array, index: number}>).findIndex((item: any) => item.index === 0);
        if (chunk0Index > 0) {
          const chunk0 = (chunkQueue.current as Array<any>).splice(chunk0Index, 1)[0];
          (chunkQueue.current as Array<any>).unshift(chunk0);
          console.log(`${streamType}: Moved chunk 0 to front of queue`);
        }
      }
    }

    try {
      const chunkItem = (chunkQueue.current as Array<any>).shift();
      if (!chunkItem) return;

      const chunkData = chunkItem.data;
      const chunkIndex = chunkItem.index;

      if (!chunkData || !(chunkData instanceof Uint8Array)) {
        console.warn(`${streamType}: Invalid chunk data, skipping`);
        return;
      }

      if (chunkData.length === 0) {
        console.warn(`${streamType}: Empty chunk ${chunkIndex}, skipping`);
        return;
      }

      console.log(`${streamType}: Appending chunk ${chunkIndex} (${chunkData.length} bytes)`);

      appendingRef.current = true;
      sourceBuffer.appendBuffer(chunkData);

      // Try to play video after first chunk is appended
      if (isFirstAppend && videoRef.current) {
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.play().catch(e => {
              if (e.name !== 'NotAllowedError') {
                console.warn(`${streamType}: Failed to auto-play:`, e);
              }
            });
          }
        }, 100);
      }
      
    } catch (error) {
      console.error(`❌ ${streamType}: Error appending chunk:`, error);
      appendingRef.current = false;
      
      if (error instanceof DOMException) {
        if (error.name === 'QuotaExceededError') {
          console.warn(`${streamType}: Quota exceeded, removing old data`);
          try {
            if (sourceBuffer.buffered.length > 0) {
              const end = sourceBuffer.buffered.end(sourceBuffer.buffered.length - 1);
              const removeStart = Math.max(0, end - 30); // Keep last 30 seconds
              sourceBuffer.remove(0, removeStart);
              console.log(`${streamType}: Removed old data: 0s to ${removeStart}s`);
            }
          } catch (removeError) {
            console.error(`${streamType}: Error removing old data:`, removeError);
          }
        }
      }
      
      // Continue processing after error
      setTimeout(() => processChunkQueue(streamType), 100);
    }
  }, []);

  // Initialize MediaSource for a stream (using useCallback to avoid recreating on each render)
  const initializeMediaSource = useCallback((streamType: 'webcam' | 'screenshare', retryCount = 0) => {
    const videoRef = streamType === 'webcam' ? webcamVideoRef : screenshareVideoRef;
    const mediaSourceRef = streamType === 'webcam' ? webcamMediaSourceRef : screenshareMediaSourceRef;
    const sourceBufferRef = streamType === 'webcam' ? webcamSourceBufferRef : screenshareSourceBufferRef;
    const appendingRef = streamType === 'webcam' ? webcamAppendingRef : screenshareAppendingRef;

    // Retry if video element not ready (wait for DOM)
    if (!videoRef.current) {
      if (retryCount < 5) {
        console.log(`${streamType}: Video element not ready, retrying in 100ms... (attempt ${retryCount + 1}/5)`);
        setTimeout(() => {
          initializeMediaSource(streamType, retryCount + 1);
        }, 100);
        return;
      } else {
        console.error(`${streamType}: Video element not found after ${retryCount} retries`);
        return;
      }
    }

    // Don't reinitialize if MediaSource already exists and is open
    if (mediaSourceRef.current && mediaSourceRef.current.readyState === 'open') {
      console.log(`${streamType}: MediaSource already initialized and open, skipping re-initialization`);
      return;
    }

    // Clean up existing MediaSource if it exists and is closed/ended
    if (mediaSourceRef.current) {
      try {
        const oldState = mediaSourceRef.current.readyState;
        console.log(`${streamType}: Cleaning up old MediaSource (state: ${oldState})`);
        
        // Only end stream if it's still open (shouldn't happen due to check above, but safety check)
        if (mediaSourceRef.current.readyState === 'open') {
          mediaSourceRef.current.endOfStream();
        }
        
        // Clean up video element
        const oldUrl = videoRef.current.src;
        videoRef.current.src = '';
        if (oldUrl && oldUrl.startsWith('blob:')) {
          URL.revokeObjectURL(oldUrl);
        }
        
        // Clear SourceBuffer ref
        sourceBufferRef.current = null;
        appendingRef.current = false;
      } catch (e) {
        console.warn(`${streamType}: Error cleaning up old MediaSource:`, e);
      }
      mediaSourceRef.current = null;
    }

    try {
      // Check if MediaSource is supported
      if (!('MediaSource' in window)) {
        console.error(`${streamType}: MediaSource API not supported`);
        return;
      }

      const mediaSource = new MediaSource();
      mediaSourceRef.current = mediaSource;

      const video = videoRef.current;
      const url = URL.createObjectURL(mediaSource);
      video.src = url;

      console.log(`${streamType}: MediaSource created and attached to video`);

      mediaSource.addEventListener('sourceopen', () => {
        console.log(`${streamType}: MediaSource opened`);
        
        try {
          // ✅ FIX: Different codec priority based on stream type
          // Screenshare typically has NO audio, so try VP9 without audio first
          // Webcam typically has audio, so try VP9 with audio first
          const codecs = streamType === 'screenshare' 
            ? [
                // Screenshare: Try WITHOUT audio first (most common case)
                'video/webm;codecs="vp9"',           // ← No audio (most likely)
                'video/webm;codecs="vp8"',           // ← No audio fallback
                'video/webm;codecs="vp9,opus"',      // ← With audio (fallback if screenshare has audio)
                'video/webm;codecs="vp8,opus"',      // ← With audio fallback
                'video/webm'                         // ← Generic fallback
              ]
            : [
                // Webcam: Try WITH audio first (most common case)
                'video/webm;codecs="vp9,opus"',      // ← With audio (most likely)
                'video/webm;codecs="vp9"',           // ← No audio fallback
                'video/webm;codecs="vp8,opus"',      // ← With audio fallback
                'video/webm;codecs="vp8"',           // ← No audio fallback
                'video/webm'                         // ← Generic fallback
              ];

          console.log(`${streamType}: Trying codecs in order:`, codecs);

          let sourceBuffer: SourceBuffer | null = null;
          let selectedCodec = '';
          
          for (const codec of codecs) {
            if (MediaSource.isTypeSupported(codec)) {
              try {
                sourceBuffer = mediaSource.addSourceBuffer(codec);
                selectedCodec = codec;
                console.log(`✅ Created SourceBuffer for ${streamType} with codec: ${codec}`);
                break;
              } catch (e) {
                console.warn(`${streamType}: Failed to create SourceBuffer with ${codec}:`, e);
                continue;
              }
            } else {
              console.log(`${streamType}: Codec not supported: ${codec}`);
            }
          }

          if (!sourceBuffer) {
            console.error(`❌ ${streamType}: No supported codec found`);
            mediaSource.endOfStream();
            return;
          }

          sourceBufferRef.current = sourceBuffer;

          // Set up event listeners
          sourceBuffer.addEventListener('updateend', () => {
            console.log(`${streamType}: SourceBuffer update ended`);
            appendingRef.current = false;
            
            // ✅ Check if MediaSource is still open before processing queue
            if (mediaSource.readyState === 'open') {
              processChunkQueue(streamType);
            } else {
              console.warn(`${streamType}: MediaSource closed (readyState: ${mediaSource.readyState}), cannot process queue`);
            }
          });

          sourceBuffer.addEventListener('error', (e) => {
            const error = (e.target as SourceBuffer)?.error;
            const errorDetails = {
              error: error,
              errorCode: error?.code,
              errorMessage: error?.message,
              readyState: mediaSource.readyState,
              updating: sourceBuffer.updating,
              codec: selectedCodec,
              buffered: sourceBuffer.buffered.length > 0 ? {
                start: sourceBuffer.buffered.start(0),
                end: sourceBuffer.buffered.end(sourceBuffer.buffered.length - 1),
                length: sourceBuffer.buffered.length
              } : 'empty'
            };
            
            console.error(`❌ ${streamType}: SourceBuffer error:`, errorDetails);
            appendingRef.current = false;
            
            // ✅ CRITICAL: Check if MediaSource ended unexpectedly (codec mismatch)
            if (mediaSource.readyState === 'ended') {
              console.error(`❌ ${streamType}: MediaSource ended unexpectedly!`);
              console.error(`❌ ${streamType}: This usually means codec mismatch between recording and playback.`);
              console.error(`❌ ${streamType}: Recorded codec may not match playback codec: ${selectedCodec}`);
              console.error(`❌ ${streamType}: Screenshare might have been recorded without audio, but we tried codec with audio.`);
              
              // Don't try to recover - MediaSource is ended and cannot be reopened
              // The user will need to refresh or we'll need to reinitialize
              return;
            }
            
            // Handle different error types
            if (error) {
              // MEDIA_ERR_SRC_NOT_SUPPORTED - codec mismatch
              if (error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED || error.code === 4) {
                console.error(`❌ ${streamType}: Codec not supported or mismatch!`);
                console.error(`❌ ${streamType}: Tried codec: ${selectedCodec}`);
                console.error(`❌ ${streamType}: This chunk may have been recorded with a different codec.`);
                // MediaSource will likely end - cannot recover from codec mismatch
                return;
              } else if (error.code === 22) { // QUOTA_EXCEEDED_ERR
                console.warn(`${streamType}: Quota exceeded, removing old data...`);
                try {
                  if (sourceBuffer.buffered.length > 0) {
                    const end = sourceBuffer.buffered.end(sourceBuffer.buffered.length - 1);
                    const removeStart = Math.max(0, end - 30); // Keep last 30 seconds
                    sourceBuffer.remove(0, removeStart);
                    console.log(`${streamType}: Removed old data: 0s to ${removeStart}s`);
                  }
                } catch (removeError) {
                  console.error(`${streamType}: Error removing old data:`, removeError);
                }
              }
            }
            
            // Only try to continue if MediaSource is still open
            if (mediaSource.readyState === 'open' && !sourceBuffer.updating) {
              // Wait a bit before retrying to avoid rapid error loops
              setTimeout(() => {
                if (mediaSource.readyState === 'open') {
                  console.log(`${streamType}: Retrying after error...`);
                  processChunkQueue(streamType);
                } else {
                  console.warn(`${streamType}: MediaSource closed during retry (readyState: ${mediaSource.readyState})`);
                }
              }, 500);
            } else {
              console.warn(`${streamType}: Cannot retry - MediaSource state: ${mediaSource.readyState}, SourceBuffer updating: ${sourceBuffer.updating}`);
            }
          });

          sourceBuffer.addEventListener('abort', (e) => {
            console.warn(`${streamType}: SourceBuffer aborted:`, e);
            appendingRef.current = false;
          });

          // Start processing queued chunks
          console.log(`${streamType}: Starting to process chunk queue...`);
          
          // Mark initialization as complete
          initializationInProgressRef.current.delete(streamType);
          
          processChunkQueue(streamType);
          
        } catch (error) {
          console.error(`❌ ${streamType}: Failed to create SourceBuffer:`, error);
          
          // Mark initialization as complete even on error
          initializationInProgressRef.current.delete(streamType);
          
          // Don't end stream immediately - let it retry when next chunk arrives
          // This allows recovery if the error was temporary
          console.log(`${streamType}: SourceBuffer creation failed, will retry when next chunk arrives`);
          // Don't call endOfStream() - allow retry
        }
      });

      mediaSource.addEventListener('sourceended', () => {
        console.log(`${streamType}: MediaSource ended`);
      });

      mediaSource.addEventListener('error', (e) => {
        console.error(`❌ ${streamType}: MediaSource error:`, e);
      });

      // Don't try to autoplay yet - wait for chunks
      
    } catch (error) {
      console.error(`❌ ${streamType}: Failed to initialize MediaSource:`, error);
    }
  }, [processChunkQueue]);

  // Track processed chunks to prevent duplicates
  // Clear this set periodically to prevent memory issues (keep last 1000 chunks)
  const processedChunksRef = useRef<Set<string>>(new Set());
  const initializationInProgressRef = useRef<Set<'webcam' | 'screenshare'>>(new Set());

  // Store the actual handler in a ref so it can be used in WebSocket without causing dependency issues
  const handleVideoChunkImpl = useCallback((message: any) => {
    try {
      const base64Data = message.data;
      
      if (!base64Data || typeof base64Data !== 'string') {
        console.error(`${message.streamType} chunk ${message.chunkIndex}: Invalid data`);
        return;
      }

      // Create unique chunk identifier to prevent duplicates
      const chunkId = `${message.streamType}-${message.chunkIndex}-${base64Data.length}`;
      
      // Skip if already processed
      if (processedChunksRef.current.has(chunkId)) {
        console.log(`⏭️  ${message.streamType} chunk ${message.chunkIndex}: Already processed, skipping duplicate`);
        return;
      }
      
      // Mark as processed
      processedChunksRef.current.add(chunkId);
      
      console.log(`📡 Received ${message.streamType} chunk ${message.chunkIndex} via WebSocket (${base64Data.length} chars)`);
      
      // Decode base64 to binary
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      if (bytes.length === 0) {
        console.error(`${message.streamType} chunk ${message.chunkIndex}: Empty chunk`);
        return;
      }
      
      console.log(`✅ Decoded ${message.streamType} chunk ${message.chunkIndex} (${bytes.length} bytes)`);

      // Queue chunk
      const chunkQueue = message.streamType === 'webcam' ? webcamChunkQueue : screenshareChunkQueue;
      const mediaSourceRef = message.streamType === 'webcam' ? webcamMediaSourceRef : screenshareMediaSourceRef;
      const videoRef = message.streamType === 'webcam' ? webcamVideoRef : screenshareVideoRef;

      // ✅ Check if video element still exists (component may have unmounted)
      if (!videoRef.current) {
        console.warn(`${message.streamType}: Video element not mounted, discarding chunk ${message.chunkIndex}`);
        return;
      }

      // Check if chunk already exists in queue (prevent duplicates)
      const existingChunk = (chunkQueue.current as Array<{data: Uint8Array, index: number}>).find(
        item => item.index === message.chunkIndex
      );

      if (existingChunk) {
        console.log(`⏭️  ${message.streamType} chunk ${message.chunkIndex}: Already in queue, skipping duplicate`);
        return;
      }

      (chunkQueue.current as Array<{data: Uint8Array, index: number}>).push({
        data: bytes,
        index: message.chunkIndex
      });

      // Sort queue by index
      (chunkQueue.current as Array<{data: Uint8Array, index: number}>).sort((a, b) => a.index - b.index);

      // Check if chunk 0 arrived
      const hasChunk0 = (chunkQueue.current as Array<{data: Uint8Array, index: number}>).some(item => item.index === 0);

      // Initialize MediaSource if needed (only once when chunk 0 arrives)
      // Prevent multiple simultaneous initializations
      if (hasChunk0 && !mediaSourceRef.current && !initializationInProgressRef.current.has(message.streamType)) {
        console.log(`${message.streamType}: Chunk 0 available, initializing MediaSource...`);
        initializationInProgressRef.current.add(message.streamType);
        initializeMediaSource(message.streamType);
        // Remove from in-progress set after a delay (allows initialization to complete)
        setTimeout(() => {
          initializationInProgressRef.current.delete(message.streamType);
        }, 2000);
      } else if (mediaSourceRef.current) {
        // Process queue if MediaSource exists
        if (mediaSourceRef.current.readyState === 'open') {
          // MediaSource is open - process queue
          processChunkQueue(message.streamType);
        } else {
          console.log(`${message.streamType}: MediaSource exists but not open (readyState: ${mediaSourceRef.current.readyState}), waiting...`);
          // MediaSource is not open yet - wait for it to open
          // The sourceopen event will trigger processChunkQueue
        }
      }
      
      // Limit processed chunks set size to prevent memory issues
      if (processedChunksRef.current.size > 1000) {
        const chunksArray = Array.from(processedChunksRef.current);
        processedChunksRef.current = new Set(chunksArray.slice(-500)); // Keep last 500
      }
      
    } catch (error) {
      console.error(`❌ Failed to process ${message.streamType} chunk ${message.chunkIndex}:`, error);
    }
  }, [initializeMediaSource, processChunkQueue]);

  // Update the ref whenever the implementation changes
  useEffect(() => {
    handleVideoChunkRef.current = handleVideoChunkImpl;
  }, [handleVideoChunkImpl]);

  // Stable wrapper function for WebSocket that uses the ref
  const handleVideoChunk = useCallback((message: any) => {
    if (handleVideoChunkRef.current) {
      handleVideoChunkRef.current(message);
    }
  }, []);

  useEffect(() => {
    const id = params?.id as string;
    if (!id) return;

    // Initial load
    loadLiveData(id);
    loadVideoChunks(id);

    // Poll every 5 seconds for live updates (reduced frequency to avoid rate limiting)
    const interval = setInterval(() => {
      loadLiveData(id);
    }, 5000);

    // Poll for video chunks less frequently
    const videoInterval = setInterval(() => {
      loadVideoChunks(id);
    }, 10000); // Every 10 seconds

    return () => {
      clearInterval(interval);
      clearInterval(videoInterval);
    };
  }, [params]);

  // WebSocket for true live streaming
  useEffect(() => {
    const id = params?.id as string;
    if (!id) return;

    // Mark as mounted
    isMountedRef.current = true;

    // Clear any existing reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close existing WebSocket if any (from previous mount in Strict Mode)
    if (wsRef.current) {
      const existingWs = wsRef.current;
      // Remove all event listeners to prevent them from firing during cleanup
      existingWs.onopen = null;
      existingWs.onmessage = null;
      existingWs.onerror = null;
      existingWs.onclose = null;
      
      // Only close if it's actually open or connecting
      if (existingWs.readyState === WebSocket.OPEN || existingWs.readyState === WebSocket.CONNECTING) {
        try {
          existingWs.close(1000, 'Reconnecting');
        } catch (e) {
          // Ignore errors during close
        }
      }
      wsRef.current = null;
    }

    console.log('Connecting to WebSocket for live streaming...');
    const ws = new WebSocket(WS_VIDEO_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      // Check if component is still mounted before handling open
      if (!isMountedRef.current) {
        ws.close();
        return;
      }

      console.log('WebSocket connected as recruiter');
      
      // Clear processed chunks on new connection (server may resend initial chunks)
      processedChunksRef.current.clear();
      console.log('Cleared processed chunks cache for new WebSocket connection');
      
      ws.send(JSON.stringify({
        type: 'register',
        sessionId: id,
        clientType: 'recruiter'
      }));
    };

    ws.onmessage = (event) => {
      // Check if component is still mounted before handling message
      if (!isMountedRef.current) return;

      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'video-chunk') {
          handleVideoChunk(message);
        } else if (message.type === 'registered') {
          console.log(`✅ WebSocket registered as ${message.clientType} for session ${message.sessionId}`);
        } else if (message.type === 'error') {
          console.error('WebSocket server error:', message.message);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      // Only log error if component is still mounted
      if (isMountedRef.current) {
        console.error('WebSocket error:', error);
      }
      // Don't show alert - WebSocket errors are expected if backend is down
      // Video chunks can still be loaded from stored files
    };

    ws.onclose = (event) => {
      // Don't log or reconnect if component is unmounting
      if (!isMountedRef.current) {
        return;
      }

      console.log('WebSocket disconnected', { code: event.code, reason: event.reason });
      wsRef.current = null;
      
      // Attempt to reconnect if connection was closed unexpectedly and component is still mounted
      if (event.code !== 1000 && event.code !== 1001 && isMountedRef.current && id) {
        console.log('Attempting to reconnect WebSocket...');
        reconnectTimeoutRef.current = setTimeout(() => {
          // Check again if component is still mounted before reconnecting
          if (!isMountedRef.current) {
            return;
          }

          try {
            const newWs = new WebSocket(WS_VIDEO_URL);
            wsRef.current = newWs;
            newWs.onopen = () => {
              if (!isMountedRef.current) {
                newWs.close();
                return;
              }

              console.log('WebSocket reconnected');
              
              // Clear processed chunks on reconnection (server may resend chunks)
              processedChunksRef.current.clear();
              console.log('Cleared processed chunks cache for WebSocket reconnection');
              
              newWs.send(JSON.stringify({
                type: 'register',
                sessionId: id,
                clientType: 'recruiter'
              }));
            };
            newWs.onmessage = (event) => {
              if (!isMountedRef.current) return;

              try {
                const message = JSON.parse(event.data);
                if (message.type === 'video-chunk') {
                  handleVideoChunk(message);
                } else if (message.type === 'registered') {
                  console.log(`✅ WebSocket reconnected and registered as ${message.clientType}`);
                } else if (message.type === 'error') {
                  console.error('WebSocket server error:', message.message);
                }
              } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
              }
            };
            newWs.onerror = (err) => {
              if (isMountedRef.current) {
                console.error('WebSocket reconnect error:', err);
              }
            };
            newWs.onclose = () => {
              if (isMountedRef.current) {
                console.log('WebSocket disconnected again');
              }
            };
          } catch (err) {
            if (isMountedRef.current) {
              console.error('Failed to reconnect WebSocket:', err);
            }
          }
        }, 3000);
      }
    };

    return () => {
      // Mark as unmounted
      isMountedRef.current = false;

      // Clear reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Close WebSocket if it exists
      if (wsRef.current) {
        const wsToClose = wsRef.current;
        // Remove all event listeners first
        wsToClose.onopen = null;
        wsToClose.onmessage = null;
        wsToClose.onerror = null;
        wsToClose.onclose = null;
        
        // Only close if it's open or connecting
        if (wsToClose.readyState === WebSocket.OPEN || wsToClose.readyState === WebSocket.CONNECTING) {
          try {
            wsToClose.close(1000, 'Component unmounting');
          } catch (e) {
            // Ignore errors during cleanup
          }
        }
        wsRef.current = null;
      }
      
      // Clean up MediaSource
      if (webcamMediaSourceRef.current && webcamMediaSourceRef.current.readyState === 'open') {
        try {
          webcamMediaSourceRef.current.endOfStream();
        } catch (e) {
          // Ignore errors when closing
        }
      }
      if (screenshareMediaSourceRef.current && screenshareMediaSourceRef.current.readyState === 'open') {
        try {
          screenshareMediaSourceRef.current.endOfStream();
        } catch (e) {
          // Ignore errors when closing
        }
      }

      // Revoke blob URLs if any
      if (webcamVideoRef.current?.src) {
        URL.revokeObjectURL(webcamVideoRef.current.src);
      }
      if (screenshareVideoRef.current?.src) {
        URL.revokeObjectURL(screenshareVideoRef.current.src);
      }

      // Clear queues
      webcamChunkQueue.current = [];
      screenshareChunkQueue.current = [];
      webcamMediaSourceRef.current = null;
      screenshareMediaSourceRef.current = null;
      webcamSourceBufferRef.current = null;
      screenshareSourceBufferRef.current = null;
    };
  }, [params]);

  async function loadLiveData(sessionId: string) {
    try {
      const response = await api.get(`/api/live-monitoring/${sessionId}`);
      const result = await response.json();
      
      if (!response.ok) {
        // Handle rate limiting gracefully
        if (response.status === 429) {
          console.warn('Rate limited - reducing polling frequency');
          // Don't throw error for rate limiting, just skip this poll
          return;
        }
        // If response is not OK, use the error from the result
        throw new Error(result.error || `HTTP ${response.status}: Failed to load live data`);
      }
      
      if (result.success) {
        setLiveData(result.data);
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to load live data');
      }
    } catch (e: any) {
      // Handle network errors or API errors
      // Don't show error for rate limiting
      if (e.message && (e.message.includes('429') || e.message.includes('Too many'))) {
        console.warn('Rate limited - will retry later');
        return;
      }
      
      let errorMessage = 'Failed to load live data';
      if (e.message) {
        errorMessage = e.message;
      } else if (typeof e === 'string') {
        errorMessage = e;
      }
      // Only set error for non-rate-limit errors
      if (!errorMessage.includes('429') && !errorMessage.includes('Too many')) {
        setError(errorMessage);
      }
      console.error('Error loading live data:', e);
    } finally {
      setLoading(false);
    }
  }

  async function loadVideoChunks(sessionId: string) {
    try {
      const response = await api.get(`/api/video/${sessionId}`);
      const result = await response.json();
      
      if (result.success) {
        // Ensure we always set an array, even if result.data is not an array
        const chunks = Array.isArray(result.data) ? result.data : [];
        setVideoChunks(chunks);
      }
    } catch (e: any) {
      console.error('Failed to load video chunks:', e);
      // Ensure videoChunks is always an array even on error
      setVideoChunks([]);
    }
  }

  // Helper function to initialize simple sequential video player
  const initializeVideoPlayer = (chunks: any[], videoRef: React.RefObject<HTMLVideoElement>, streamType: string) => {
    // Ensure chunks is an array before processing
    if (!Array.isArray(chunks) || chunks.length === 0 || !videoRef.current) {
      console.log(`${streamType}: No chunks or no video element`);
      return;
    }

    const video = videoRef.current;
    let currentIndex = 0;

    // Filter chunks by stream type
    const streamChunks = chunks
      .filter(c => c?.url?.includes(`/${streamType}/`))
      .sort((a, b) => a.chunkIndex - b.chunkIndex);

    if (streamChunks.length === 0) {
      console.log(`No ${streamType} chunks available in storage - will wait for live WebSocket chunks`);
      
      // Check if we have WebSocket chunks queued
      const chunkQueue = streamType === 'webcam' ? webcamChunkQueue : screenshareChunkQueue;
      const mediaSourceRef = streamType === 'webcam' ? webcamMediaSourceRef : screenshareMediaSourceRef;
      
      if (chunkQueue.current.length > 0) {
        console.log(`${streamType}: ${chunkQueue.current.length} WebSocket chunks already queued`);
        // MediaSource will be initialized when chunk 0 arrives (handled in handleVideoChunk)
      } else {
        console.log(`${streamType}: Waiting for live WebSocket stream...`);
      }
      
      return;
    }

    console.log(`Found ${streamChunks.length} stored ${streamType} chunks - will try to play, but will fall back to WebSocket if they fail`);

    // Retry counter to prevent infinite loops
    const retryCountRef = streamType === 'webcam' ? webcamRetryCount : screenshareRetryCount;
    const MAX_RETRIES = 5;

    // Helper to play next chunk
    const playNextChunk = () => {
      // Check WebSocket queue first for live chunks
      const chunkQueue = streamType === 'webcam' ? webcamChunkQueue.current : screenshareChunkQueue.current;
      
      if (chunkQueue.length > 0) {
        const blobUrl = chunkQueue.shift();
        if (blobUrl) {
          console.log(`Loading live ${streamType} chunk from queue`);
          video.src = blobUrl;
          video.play().catch(e => {
            if (e.name === 'NotAllowedError') {
              console.log(`${streamType}: Autoplay blocked for live chunk`);
            } else {
              console.error(`Play error for ${streamType}:`, e);
            }
          });
          return;
        }
      }

      // Fall back to stored chunks
      if (currentIndex >= streamChunks.length) {
        currentIndex = 0; // Loop back to start
      }

      const chunk = streamChunks[currentIndex];
      const videoUrl = chunk.url.startsWith('http') 
        ? chunk.url 
        : `${API_BASE_URL}${chunk.url}`;
        
      console.log(`Loading ${streamType} chunk ${currentIndex}: ${videoUrl}`);
      video.src = videoUrl;
      currentIndex++;
      
      // Try to play, but don't fail if autoplay is blocked
      video.play().catch(e => {
        // Autoplay is blocked - this is normal, user can click play
        if (e.name === 'NotAllowedError') {
          console.log(`${streamType}: Autoplay blocked, waiting for user interaction`);
        } else {
          console.error(`Failed to play ${streamType} chunk:`, e);
        }
      });
    };

    // When current chunk ends, play next
    const handleEnded = () => {
      console.log(`${streamType} chunk ended, playing next`);
      retryCountRef.current = 0; // Reset on successful playback
      playNextChunk();
    };

    // Handle successful data load
    const handleLoadedData = () => {
      console.log(`${streamType} chunk loaded successfully`);
      retryCountRef.current = 0; // Reset retry counter on success
    };

    video.addEventListener('ended', handleEnded);
    video.addEventListener('loadeddata', handleLoadedData);

    const handleError = (e: Event) => {
      const error = video.error;
      const errorDetails = {
        code: error?.code,
        message: error?.message,
        networkState: video.networkState,
        readyState: video.readyState,
        src: video.src,
        currentTime: video.currentTime,
        duration: video.duration,
        paused: video.paused,
        ended: video.ended
      };
      
      console.error(`${streamType} video error:`, errorDetails);
      
      // Check if this is a network error (400, 404, etc.) - stored chunks don't exist
      const isNetworkError = error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED || 
                             error?.code === MediaError.MEDIA_ERR_NETWORK ||
                             error?.message?.includes('Format error') ||
                             error?.message?.includes('load') ||
                             video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE;
      
      // Check if this is a 400/404 error (file doesn't exist in Supabase)
      const url = video.src;
      const isStoredChunk = url && url.includes('supabase.co/storage');
      
      if (isNetworkError && isStoredChunk) {
        console.warn(`${streamType}: Stored chunk not accessible (${url}) - file may not exist in Supabase`);
        console.log(`${streamType}: Will wait for live WebSocket chunks instead of retrying stored chunks`);
        
        // Stop trying stored chunks - wait for WebSocket chunks via MediaSource
        video.removeEventListener('error', handleError);
        video.removeEventListener('ended', handleEnded);
        video.removeEventListener('loadeddata', handleLoadedData);
        video.src = ''; // Clear the failed source
        
        // Check if we have WebSocket chunks queued or MediaSource active
        const mediaSourceRef = streamType === 'webcam' ? webcamMediaSourceRef : screenshareMediaSourceRef;
        const chunkQueue = streamType === 'webcam' ? webcamChunkQueue : screenshareChunkQueue;
        
        if (mediaSourceRef.current && mediaSourceRef.current.readyState === 'open') {
          console.log(`${streamType}: MediaSource is active, will use live WebSocket chunks`);
        } else if (chunkQueue.current.length > 0) {
          console.log(`${streamType}: ${chunkQueue.current.length} WebSocket chunks queued, waiting for MediaSource initialization...`);
        } else {
          console.log(`${streamType}: No stored chunks accessible and no WebSocket chunks yet - waiting for live stream...`);
        }
        
        return; // Don't retry stored chunks
      }
      
      // Don't retry if src is empty (we cleared it intentionally)
      if (!video.src || video.src === '') {
        console.log(`${streamType}: Source is empty, stopping error handling`);
        return;
      }
      
      // Don't retry if MediaSource is being used (for live streaming)
      const mediaSourceRef = streamType === 'webcam' ? webcamMediaSourceRef : screenshareMediaSourceRef;
      if (mediaSourceRef.current && mediaSourceRef.current.readyState === 'open') {
        console.log(`${streamType}: MediaSource is active, not retrying stored chunks`);
        // Remove error handler for stored chunks since we're using MediaSource
        video.removeEventListener('error', handleError);
        video.removeEventListener('ended', handleEnded);
        video.removeEventListener('loadeddata', handleLoadedData);
        return;
      }
      
      retryCountRef.current++;
      
      if (retryCountRef.current > MAX_RETRIES) {
        console.error(`${streamType}: Max retries (${MAX_RETRIES}) reached, stopping stored chunk playback`);
        console.error(`${streamType}: Last attempted URL: ${video.src}`);
        console.log(`${streamType}: Will wait for live WebSocket chunks instead`);
        // Remove error handler to prevent infinite loop
        video.removeEventListener('error', handleError);
        video.removeEventListener('ended', handleEnded);
        video.removeEventListener('loadeddata', handleLoadedData);
        video.src = '';
        return;
      }
      
      // Wait a bit before trying next chunk
      console.log(`${streamType}: Retry ${retryCountRef.current}/${MAX_RETRIES}, trying next chunk...`);
      setTimeout(() => {
        playNextChunk();
      }, 1000); // 1 second delay between retries
    };

    video.addEventListener('error', handleError);

    // Start playing first chunk
    playNextChunk();
  };

  // Initialize webcam video player when video element is ready and chunks are available
  useEffect(() => {
    // Only initialize if we have stored chunks (not for live streaming via WebSocket)
    // Live streaming uses MediaSource API which is initialized when chunks arrive via WebSocket
    if (!Array.isArray(videoChunks) || videoChunks.length === 0 || webcamInitializedRef.current) return;
    if (!webcamVideoRef.current) return;
    
    // Check if MediaSource is already being used (for live streaming)
    if (webcamMediaSourceRef.current) {
      console.log('Webcam: Using MediaSource for live streaming, skipping stored chunks player');
      return;
    }
    
    webcamInitializedRef.current = true;
    initializeVideoPlayer(videoChunks, webcamVideoRef, 'webcam');
  }, [videoChunks, webcamVideoRef.current]);

  // Initialize screenshare video player when video element is ready and chunks are available
  useEffect(() => {
    // Only initialize if we have stored chunks (not for live streaming via WebSocket)
    // Live streaming uses MediaSource API which is initialized when chunks arrive via WebSocket
    if (!Array.isArray(videoChunks) || videoChunks.length === 0 || screenshareInitializedRef.current) return;
    if (!screenshareVideoRef.current) return;
    
    // Check if MediaSource is already being used (for live streaming)
    if (screenshareMediaSourceRef.current) {
      console.log('Screenshare: Using MediaSource for live streaming, skipping stored chunks player');
      return;
    }
    
    screenshareInitializedRef.current = true;
    initializeVideoPlayer(videoChunks, screenshareVideoRef, 'screenshare');
  }, [videoChunks, screenshareVideoRef.current]);

  if (loading && !liveData) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-[#0B0B0F] to-[#07070A] text-zinc-100 font-sans overflow-hidden relative">
        <div className="h-full w-full bg-zinc-950/60 backdrop-blur-xl flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
            <div className="text-xl sm:text-2xl mb-2 text-white">Starting Live Monitoring...</div>
            <div className="text-sm text-zinc-400">Initializing all 3 agents</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-[#0B0B0F] to-[#07070A] text-zinc-100 font-sans overflow-hidden relative">
        <div className="h-full w-full bg-zinc-950/60 backdrop-blur-xl flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
              <div className="border border-red-500/30 bg-red-500/10 rounded-xl p-6 mb-4">
                <div className="text-red-400 font-medium mb-2">Error</div>
                <div className="text-zinc-300">{error}</div>
              </div>
              <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 hover:bg-zinc-700 transition-colors text-sm">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!liveData) return null;

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#0B0B0F] to-[#07070A] text-zinc-100 font-sans overflow-hidden relative">
      {/* Corner Squares */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-zinc-600 z-50"></div>
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-zinc-600 z-50"></div>
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-zinc-600 z-50"></div>
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-zinc-600 z-50"></div>

      <div className="h-full w-full bg-zinc-950/60 backdrop-blur-xl flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <div className="h-12 bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-800 flex items-center justify-between px-4 sm:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
              <h1 className="text-lg sm:text-xl font-bold text-white">Live Monitoring</h1>
            </div>
            <span className="hidden sm:inline text-xs text-zinc-400 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded">
              Session: {params?.id}
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-4">

            {/* Live Video Streams */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Webcam Feed - Always render video element for MediaSource API */}
              <div className="border border-zinc-800 bg-zinc-950/70 backdrop-blur-xl rounded-xl overflow-hidden">
                <video
                  ref={webcamVideoRef}
                  controls
                  className="w-full aspect-video bg-black"
                  playsInline
                  loop={false}
                  muted={true}
                  crossOrigin="anonymous"
                  preload="auto"
                />
                <div className="p-3 border-t border-zinc-800 bg-zinc-900/50">
                  <div className="text-xs text-emerald-400 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Video className="h-3.5 w-3.5" />
                      <span>
                        WEBCAM • {
                          Array.isArray(videoChunks) && videoChunks.filter(c => c.url?.includes('/webcam/')).length > 0
                            ? `${videoChunks.filter(c => c.url?.includes('/webcam/')).length} segments`
                            : webcamChunkQueue.current.length > 0
                            ? 'Live streaming...'
                            : 'Waiting for candidate...'
                        }
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className={`h-1.5 w-1.5 rounded-full ${
                        webcamChunkQueue.current.length > 0 || (Array.isArray(videoChunks) && videoChunks.filter(c => c.url?.includes('/webcam/')).length > 0)
                          ? 'bg-red-500 animate-pulse'
                          : 'bg-zinc-600'
                      }`}></div>
                      <span className="text-zinc-500">
                        {webcamChunkQueue.current.length > 0 || (Array.isArray(videoChunks) && videoChunks.filter(c => c.url?.includes('/webcam/')).length > 0)
                          ? 'LIVE'
                          : 'OFFLINE'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Screen Share Feed - Always render video element for MediaSource API */}
              <div className="border border-zinc-800 bg-zinc-950/70 backdrop-blur-xl rounded-xl overflow-hidden">
                <video
                  ref={screenshareVideoRef}
                  controls
                  className="w-full aspect-video bg-black"
                  playsInline
                  loop={false}
                  muted={true}
                  crossOrigin="anonymous"
                  preload="auto"
                />
                <div className="p-3 border-t border-zinc-800 bg-zinc-900/50">
                  <div className="text-xs text-emerald-400 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-3.5 w-3.5" />
                      <span>
                        SCREEN • {
                          Array.isArray(videoChunks) && videoChunks.filter(c => c.url?.includes('/screenshare/')).length > 0
                            ? `${videoChunks.filter(c => c.url?.includes('/screenshare/')).length} segments`
                            : screenshareChunkQueue.current.length > 0
                            ? 'Live streaming...'
                            : 'Waiting for candidate...'
                        }
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className={`h-1.5 w-1.5 rounded-full ${
                        screenshareChunkQueue.current.length > 0 || (Array.isArray(videoChunks) && videoChunks.filter(c => c.url?.includes('/screenshare/')).length > 0)
                          ? 'bg-red-500 animate-pulse'
                          : 'bg-zinc-600'
                      }`}></div>
                      <span className="text-zinc-500">
                        {screenshareChunkQueue.current.length > 0 || (Array.isArray(videoChunks) && videoChunks.filter(c => c.url?.includes('/screenshare/')).length > 0)
                          ? 'LIVE'
                          : 'OFFLINE'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Analysis - All 3 Agents */}
            <div className="border border-zinc-800 bg-zinc-950/70 backdrop-blur-xl rounded-xl p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
                <h2 className="text-lg sm:text-xl font-bold text-white">Live Analysis - All 3 Agents</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Watcher Agent */}
                <div className="border border-zinc-800 bg-zinc-900/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Eye className="h-4 w-4 text-emerald-400" />
                    <div className="text-sm font-bold text-zinc-300">WATCHER</div>
                  </div>
                  
                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="text-zinc-400 mb-1">Activity:</div>
                      <div className="text-zinc-100">{liveData.watcher.latestActivity}</div>
                    </div>
                    <div>
                      <div className="text-zinc-400 mb-1">AI Dependency:</div>
                      <div className="text-zinc-100">{liveData.metrics.aiTimePercent}%</div>
                    </div>
                    <div>
                      <div className="text-zinc-400 mb-1">Violations:</div>
                      <div className={`font-bold ${liveData.watcher.violations.length > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {liveData.watcher.violations.length} {liveData.watcher.violations.length > 0 && '🚩'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Extractor Agent */}
                <div className="border border-zinc-800 bg-zinc-900/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Search className="h-4 w-4 text-emerald-400" />
                    <div className="text-sm font-bold text-zinc-300">EXTRACTOR</div>
                  </div>
                  
                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="text-zinc-400 mb-1">Overall Score:</div>
                      <div className="text-zinc-100 font-bold text-lg">{liveData.extractor.overallScore}/100</div>
                    </div>
                    <div>
                      <div className="text-zinc-400 mb-1">Prompt Quality:</div>
                      <div className="text-zinc-100">{liveData.extractor.promptQuality}/100</div>
                    </div>
                    <div>
                      <div className="text-zinc-400 mb-1">Self-Reliance:</div>
                      <div className="text-zinc-100">{liveData.extractor.selfReliance}/100</div>
                    </div>
                  </div>
                </div>

                {/* Sanity Flag Agent */}
                <div className="border border-zinc-800 bg-zinc-900/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-emerald-400" />
                    <div className="text-sm font-bold text-zinc-300">SANITY FLAG</div>
                  </div>
                  
                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="text-zinc-400 mb-1">Risk Level:</div>
                      <div className={`font-bold ${
                        liveData.sanity.overallRisk === 'high' ? 'text-red-400' : 
                        liveData.sanity.overallRisk === 'medium' ? 'text-amber-400' : 
                        'text-emerald-400'
                      }`}>
                        {liveData.sanity.overallRisk.toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-400 mb-1">Violations:</div>
                      <div className="text-zinc-100">{liveData.sanity.violations.length} total</div>
                    </div>
                    <div>
                      <div className="text-zinc-400 mb-1">Red Flags:</div>
                      <div className="text-zinc-100">{liveData.sanity.redFlags.length} detected</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Alerts */}
            {liveData.alerts.length > 0 && (
              <div className="border border-red-500/30 bg-red-500/10 rounded-xl p-4">
                <div className="text-red-400 font-bold mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  LIVE ALERTS
                </div>
                <div className="space-y-2">
                  {liveData.alerts.slice(0, 5).map((alert: any, idx: number) => (
                    <div key={idx} className="text-xs sm:text-sm text-zinc-300">
                      <span className="text-zinc-500">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                      {' '}
                      <span className={`font-medium ${
                        alert.severity === 'high' ? 'text-red-400' : 'text-amber-400'
                      }`}>
                        {alert.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Latest Activity Timeline */}
            <div className="border border-zinc-800 bg-zinc-950/70 backdrop-blur-xl rounded-xl p-4 sm:p-6">
              <div className="text-white font-bold mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Latest Activity
              </div>
              <div className="space-y-2">
                {liveData.latestActivity.map((event: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-3 text-xs text-zinc-300">
                    <div className="text-lg">{event.emoji}</div>
                    <div className="text-zinc-500">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </div>
                    <div className="flex-1">{event.description}</div>
                    {event.severity === 'high' && <span className="text-red-400">🚩</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Live Metrics */}
            <div className="border border-zinc-800 bg-zinc-950/70 backdrop-blur-xl rounded-xl p-4 sm:p-6">
              <div className="text-white font-bold mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Live Metrics
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                <div>
                  <div className="text-zinc-400 mb-1">Time Elapsed</div>
                  <div className="text-white font-bold">{liveData.metrics.timeElapsed}</div>
                </div>
                <div>
                  <div className="text-zinc-400 mb-1">Total Prompts</div>
                  <div className="text-white">{liveData.metrics.totalPrompts}</div>
                </div>
                <div>
                  <div className="text-zinc-400 mb-1">Code Copies</div>
                  <div className="text-white">{liveData.metrics.totalCopies}</div>
                </div>
                <div>
                  <div className="text-zinc-400 mb-1">Submissions</div>
                  <div className="text-white">{liveData.metrics.totalSubmissions}</div>
                </div>
              </div>
              
              {/* AI Dependency Meter */}
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-400">AI Time</span>
                  <span className="text-white">{liveData.metrics.aiTimePercent}%</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      liveData.metrics.aiTimePercent > 60 ? 'bg-red-500' : 
                      liveData.metrics.aiTimePercent > 40 ? 'bg-amber-500' : 
                      'bg-emerald-500'
                    }`}
                    style={{ width: `${liveData.metrics.aiTimePercent}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Live Recommendation */}
            <div className={`border rounded-xl p-4 sm:p-6 ${
              liveData.sanity.overallRisk === 'high' ? 'bg-red-500/10 border-red-500/30' :
              liveData.sanity.overallRisk === 'medium' ? 'bg-amber-500/10 border-amber-500/30' :
              'bg-emerald-500/10 border-emerald-500/30'
            }`}>
              <div className="text-white font-bold mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                LIVE RECOMMENDATION
              </div>
              <div className="text-xs sm:text-sm text-zinc-300 mb-2">
                Current Status: <span className="font-bold">{liveData.sanity.overallRisk.toUpperCase()}</span>
              </div>
              <div className="text-xs sm:text-sm text-zinc-400">
                {liveData.sanity.recommendation}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LiveMonitoringPage() {
  return (
    <ProtectedRoute requiredRole="recruiter">
      <LiveMonitoringPageContent />
    </ProtectedRoute>
  );
}

