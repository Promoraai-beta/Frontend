'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { API_ENDPOINTS } from '@/lib/config';

export default function RecordingPlayback() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  
  const screenshareVideoRef = useRef<HTMLVideoElement>(null);
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamType, setStreamType] = useState<'screenshare' | 'webcam'>('screenshare');
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    if (sessionId) {
      loadRecording();
    }
  }, [sessionId, streamType]);

  const loadRecording = async () => {
    try {
      setLoading(true);
      setError(null);
      setLoadingProgress({ current: 0, total: 0 });

      console.log(`📺 Loading ${streamType} recording for session ${sessionId}...`);

      // 1. Fetch all chunks from backend
      const response = await fetch(`${API_ENDPOINTS.video}/${sessionId}?streamType=${streamType}`);
      if (!response.ok) {
        throw new Error('Failed to fetch video chunks');
      }

      const data = await response.json();
      
      if (!data.success || !data.data) {
        setError(`No ${streamType} video chunks found for this session`);
        setLoading(false);
        return;
      }

      // ✅ Handle new grouped response format: { webcam: [...], screenshare: [...] }
      const chunks = (data.data[streamType] || [])
        .sort((a: any, b: any) => a.chunkIndex - b.chunkIndex);
      
      console.log(`✅ Found ${chunks.length} ${streamType} chunks`);
      
      // Verify URLs are correct
      if (chunks.length > 0) {
        const firstChunk = chunks[0];
        if (!firstChunk.url.includes(`/${streamType}/`)) {
          console.error(`❌ ${streamType.toUpperCase()} CHUNK HAS WRONG PATH!`, firstChunk.url);
        } else {
          console.log(`✅ First ${streamType} chunk URL verified: ${firstChunk.url.substring(Math.max(0, firstChunk.url.length - 60))}`);
        }
      }

      if (chunks.length === 0) {
        setError(`No ${streamType} chunks found`);
        setLoading(false);
        return;
      }

      setLoadingProgress({ current: 0, total: chunks.length });

      // 2. Set up MediaSource API
      const videoElement = streamType === 'screenshare' ? screenshareVideoRef.current : webcamVideoRef.current;
      if (!videoElement) {
        throw new Error('Video element not found');
      }

      // Clean up existing MediaSource if any
      if (videoElement.src) {
        const oldUrl = videoElement.src;
        videoElement.src = '';
        if (oldUrl.startsWith('blob:')) {
          URL.revokeObjectURL(oldUrl);
        }
      }

      const mediaSource = new MediaSource();
      videoElement.src = URL.createObjectURL(mediaSource);

      mediaSource.addEventListener('sourceopen', async () => {
        console.log('📺 MediaSource opened, creating SourceBuffer...');

        try {
          // Try different codecs (VP9 first to match recording)
          const codecs = [
            'video/webm;codecs="vp9,opus"',
            'video/webm;codecs="vp9"',
            'video/webm;codecs="vp8,opus"',
            'video/webm;codecs="vp8"',
            'video/webm'
          ];

          let sourceBuffer: SourceBuffer | null = null;
          
          for (const codec of codecs) {
            if (MediaSource.isTypeSupported(codec)) {
              try {
                sourceBuffer = mediaSource.addSourceBuffer(codec);
                console.log(`✅ Created SourceBuffer with codec: ${codec}`);
                break;
              } catch (e) {
                console.warn(`Failed to create SourceBuffer with ${codec}:`, e);
                continue;
              }
            }
          }

          if (!sourceBuffer) {
            throw new Error('No supported codec found');
          }

          // 3. Append all chunks sequentially
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            
            console.log(`📦 Loading chunk ${chunk.chunkIndex} from ${chunk.url}...`);
            
            try {
              // Fetch chunk data
              const chunkResponse = await fetch(chunk.url);
              if (!chunkResponse.ok) {
                throw new Error(`Failed to fetch chunk ${chunk.chunkIndex}: ${chunkResponse.statusText}`);
              }
              
              const chunkArrayBuffer = await chunkResponse.arrayBuffer();
              
              console.log(`✅ Chunk ${chunk.chunkIndex}: ${chunkArrayBuffer.byteLength} bytes`);

              // Wait for previous append to complete
              await new Promise<void>((resolve) => {
                if (sourceBuffer!.updating) {
                  sourceBuffer!.addEventListener('updateend', () => resolve(), { once: true });
                } else {
                  resolve();
                }
              });

              // Append chunk
              sourceBuffer!.appendBuffer(chunkArrayBuffer);
              
              // Wait for this append to complete
              await new Promise<void>((resolve) => {
                sourceBuffer!.addEventListener('updateend', () => resolve(), { once: true });
              });

              console.log(`✅ Appended chunk ${chunk.chunkIndex}`);
              setLoadingProgress({ current: i + 1, total: chunks.length });
            } catch (chunkError) {
              console.error(`❌ Error loading chunk ${chunk.chunkIndex}:`, chunkError);
              // Continue with next chunk instead of failing completely
            }
          }

          // 4. Close the stream
          await new Promise<void>((resolve) => {
            if (sourceBuffer!.updating) {
              sourceBuffer!.addEventListener('updateend', () => resolve(), { once: true });
            } else {
              resolve();
            }
          });

          mediaSource.endOfStream();
          console.log('✅ All chunks loaded, video ready to play!');
          
          setLoading(false);

          // Try to play
          videoElement.play().catch((e) => {
            if (e.name !== 'NotAllowedError') {
              console.warn('Failed to auto-play:', e);
            }
          });

        } catch (err) {
          console.error('❌ Error loading chunks:', err);
          setError(err instanceof Error ? err.message : 'Failed to load video');
          setLoading(false);
        }
      });

      mediaSource.addEventListener('error', (e) => {
        console.error('❌ MediaSource error:', e);
        setError('MediaSource error occurred');
        setLoading(false);
      });

      mediaSource.addEventListener('sourceended', () => {
        console.log('MediaSource ended');
      });

    } catch (err) {
      console.error('❌ Error loading recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to load recording');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Interview Recording</h1>
            <p className="text-gray-600 mt-1">Session: {sessionId}</p>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ← Back
          </button>
        </div>

        {/* Stream Type Selector */}
        <div className="mb-6 flex gap-3">
          <button
            onClick={() => setStreamType('screenshare')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              streamType === 'screenshare'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            Screen Share
          </button>
          <button
            onClick={() => setStreamType('webcam')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              streamType === 'webcam'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            Webcam
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading video chunks...</p>
            {loadingProgress.total > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                Loading chunk {loadingProgress.current} of {loadingProgress.total}
              </p>
            )}
            <div className="mt-4 w-full bg-gray-200 rounded-full h-2 max-w-md mx-auto">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${loadingProgress.total > 0 ? (loadingProgress.current / loadingProgress.total) * 100 : 0}%`
                }}
              ></div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-medium">Error loading recording</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Video Players */}
        <div className="grid grid-cols-1 gap-6">
          {/* Screen Share Video */}
          <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${streamType === 'screenshare' ? '' : 'hidden'}`}>
            <div className="bg-gray-800 px-4 py-2">
              <h2 className="text-white font-medium">Screen Share Recording</h2>
            </div>
            <div className="p-4">
              <video
                ref={screenshareVideoRef}
                controls
                className="w-full bg-black rounded"
                style={{ maxHeight: '70vh' }}
              >
                Your browser does not support video playback.
              </video>
            </div>
          </div>

          {/* Webcam Video */}
          <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${streamType === 'webcam' ? '' : 'hidden'}`}>
            <div className="bg-gray-800 px-4 py-2">
              <h2 className="text-white font-medium">Webcam Recording</h2>
            </div>
            <div className="p-4">
              <video
                ref={webcamVideoRef}
                controls
                className="w-full bg-black rounded"
                style={{ maxHeight: '70vh' }}
              >
                Your browser does not support video playback.
              </video>
            </div>
          </div>
        </div>

        {/* Instructions */}
        {!loading && !error && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm">
              💡 <strong>Tip:</strong> Use the buttons above to switch between screen share and webcam recordings.
              All chunks are loaded sequentially for smooth playback.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

