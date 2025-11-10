'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, AlertTriangle, Video, Monitor, Code, Clock, User, CheckCircle } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [subs, setSubs] = useState<any[]>([]);
  const [aiInteractions, setAiInteractions] = useState<any[]>([]);
  const [violations, setViolations] = useState<any[]>([]);
  const [riskScore, setRiskScore] = useState<number | null>(null);
  const [videoChunks, setVideoChunks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'submissions' | 'ai-behavior' | 'recordings'>('submissions');
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const screenshareVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const id = params?.id as string;
    if (!id) return;

    async function load() {
      try {
        const s = await fetch(`${API_BASE_URL}/api/sessions/${id}`).then(r => r.json());
        if (!s.success) throw new Error(s.error || 'Failed to load session');
        setSession(s.data);

        const sub = await fetch(`${API_BASE_URL}/api/submissions?session_id=${id}`).then(r => r.json()).catch(() => ({ success: false }));
        if (sub.success) setSubs(sub.data || []);

        const ai = await fetch(`${API_BASE_URL}/api/ai-interactions?session_id=${id}`).then(r => r.json()).catch(() => ({ success: false }));
        if (ai.success) setAiInteractions(ai.data || []);

        // Get agent analysis
        const watcherData = await fetch(`${API_BASE_URL}/api/agents/watcher/${id}`).then(r => r.json()).catch(() => ({ success: false }));
        if (watcherData.success) {
          setViolations(watcherData.violations || []);
          setRiskScore(watcherData.riskScore || 0);
        }

        // Get video chunks (now returns grouped data: { webcam: [...], screenshare: [...] })
        const videoData = await fetch(`${API_BASE_URL}/api/video/${id}`).then(r => r.json()).catch(() => ({ success: false }));
        if (videoData.success && videoData.data) {
          // Combine webcam and screenshare chunks into a single array for backwards compatibility
          const allChunks = [
            ...(videoData.data.webcam || []),
            ...(videoData.data.screenshare || [])
          ];
          console.log(`✅ Got ${videoData.data.webcam?.length || 0} webcam chunks, ${videoData.data.screenshare?.length || 0} screenshare chunks`);
          
          // Verify URLs are correct
          if (videoData.data.webcam && videoData.data.webcam.length > 0) {
            const firstWebcam = videoData.data.webcam[0];
            if (!firstWebcam.url.includes('/webcam/')) {
              console.error('❌ WEBCAM CHUNK HAS WRONG PATH!', firstWebcam.url);
            }
          }
          if (videoData.data.screenshare && videoData.data.screenshare.length > 0) {
            const firstScreenshare = videoData.data.screenshare[0];
            if (!firstScreenshare.url.includes('/screenshare/')) {
              console.error('❌ SCREENSHARE CHUNK HAS WRONG PATH!', firstScreenshare.url);
            }
          }
          
          setVideoChunks(allChunks);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params]);

  // Initialize video players when recordings tab is active using MediaSource API
  useEffect(() => {
    if (activeTab !== 'recordings' || videoChunks.length === 0) return;

    const initializeVideoPlayer = async (chunks: any[], videoRef: React.RefObject<HTMLVideoElement>, streamType: string) => {
      // Wait for video element to be available
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!videoRef.current) {
        console.log(`${streamType}: Video element not found`);
        return;
      }

      const video = videoRef.current;
      
      // ✅ Filter chunks by streamType field first (more reliable than URL)
      const streamChunks = chunks
        .filter(c => {
          // CRITICAL: Check streamType field first
          if (c.streamType) {
            const matches = c.streamType === streamType;
            if (!matches) {
              console.log(`${streamType}: Chunk ${c.chunkIndex} has streamType=${c.streamType}, skipping`);
            } else {
              // Verify URL matches streamType
              const urlMatches = c.url?.includes(`/${streamType}/`);
              if (!urlMatches) {
                console.warn(`⚠️ ${streamType}: Chunk ${c.chunkIndex} has correct streamType but WRONG URL: ${c.url?.substring(0, 100)}`);
              }
            }
            return matches;
          }
          
          // Fallback: Check URL for stream type (for older chunks without streamType)
          const urlMatches = c.url?.includes(`/${streamType}/`);
          if (!urlMatches) {
            console.log(`${streamType}: Chunk ${c.chunkIndex} URL doesn't contain /${streamType}/, URL: ${c.url?.substring(0, 100)}`);
          }
          return urlMatches;
        })
        .sort((a, b) => (a.chunkIndex || 0) - (b.chunkIndex || 0));

      console.log(`${streamType}: Filtered ${streamChunks.length} chunks from ${chunks.length} total chunks`);
      
      if (streamChunks.length > 0) {
        console.log(`${streamType}: Chunk details (first 3):`, streamChunks.slice(0, 3).map(c => ({
          chunkIndex: c.chunkIndex,
          streamType: c.streamType,
          url: c.url?.substring(Math.max(0, (c.url?.length || 0) - 60))
        })));
      }

      if (streamChunks.length === 0) {
        console.log(`${streamType}: No chunks found after filtering`);
        return;
      }

      console.log(`Initializing ${streamType} player with ${streamChunks.length} chunks using MediaSource API`);

      try {
        // Check if MediaSource is supported
        if (!('MediaSource' in window)) {
          console.error(`${streamType}: MediaSource API not supported`);
          // Fallback: try to play chunk 0 only
          const chunk0 = streamChunks.find(c => (c.chunkIndex || 0) === 0);
          if (chunk0) {
            const videoUrl = chunk0.url?.startsWith('http') 
              ? chunk0.url
              : `${API_BASE_URL}${chunk0.url}`;
            video.src = videoUrl;
            console.log(`${streamType}: Playing chunk 0 only (MediaSource not supported)`);
          }
          return;
        }

        // Clean up existing MediaSource if any
        if (video.src && video.src.startsWith('blob:')) {
          URL.revokeObjectURL(video.src);
          video.src = '';
        }

        // Create MediaSource
        const mediaSource = new MediaSource();
        const url = URL.createObjectURL(mediaSource);
        video.src = url;

        mediaSource.addEventListener('sourceopen', async () => {
          try {
            console.log(`${streamType}: MediaSource opened, creating SourceBuffer...`);

            // Try different codecs (VP9 first, then VP8)
            const codecs = [
              'video/webm;codecs="vp9,opus"',
              'video/webm;codecs="vp9"',
              'video/webm;codecs="vp8,opus"',
              'video/webm;codecs="vp8"',
              'video/webm'
            ];

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
              }
            }

            if (!sourceBuffer) {
              console.error(`❌ ${streamType}: No supported codec found`);
              mediaSource.endOfStream();
              return;
            }

            // Fetch and append all chunks sequentially
            for (let i = 0; i < streamChunks.length; i++) {
              const chunk = streamChunks[i];
              const chunkUrl = chunk.url?.startsWith('http') 
                ? chunk.url
                : `${API_BASE_URL}${chunk.url}`;

              console.log(`📦 Loading ${streamType} chunk ${chunk.chunkIndex || i} from ${chunkUrl}...`);

              try {
                // Fetch chunk data
                const response = await fetch(chunkUrl);
                if (!response.ok) {
                  console.error(`${streamType}: Failed to fetch chunk ${chunk.chunkIndex || i}: ${response.status}`);
                  continue;
                }

                const arrayBuffer = await response.arrayBuffer();
                console.log(`✅ Loaded ${streamType} chunk ${chunk.chunkIndex || i}: ${arrayBuffer.byteLength} bytes`);

                // Wait for previous append to complete
                if (sourceBuffer.updating) {
                  await new Promise<void>((resolve) => {
                    sourceBuffer!.addEventListener('updateend', () => resolve(), { once: true });
                  });
                }

                // Append chunk
                sourceBuffer.appendBuffer(arrayBuffer);

                // Wait for this append to complete
                await new Promise<void>((resolve) => {
                  sourceBuffer!.addEventListener('updateend', () => resolve(), { once: true });
                });

                console.log(`✅ Appended ${streamType} chunk ${chunk.chunkIndex || i}`);
              } catch (error) {
                console.error(`❌ Error loading ${streamType} chunk ${chunk.chunkIndex || i}:`, error);
                // Continue with next chunk
              }
            }

            // Close the stream
            if (sourceBuffer.updating) {
              await new Promise<void>((resolve) => {
                sourceBuffer!.addEventListener('updateend', () => resolve(), { once: true });
              });
            }
            mediaSource.endOfStream();
            console.log(`✅ All ${streamType} chunks loaded, video ready to play!`);

            // Try to play
            video.play().catch((e) => {
              if (e.name !== 'NotAllowedError') {
                console.warn(`${streamType}: Failed to auto-play:`, e);
              }
            });
          } catch (error) {
            console.error(`❌ Error initializing ${streamType} player:`, error);
            mediaSource.endOfStream();
          }
        });

        mediaSource.addEventListener('error', (e) => {
          console.error(`❌ ${streamType}: MediaSource error:`, e);
        });

        mediaSource.addEventListener('sourceended', () => {
          console.log(`${streamType}: MediaSource ended`);
        });
      } catch (error) {
        console.error(`❌ Error creating MediaSource for ${streamType}:`, error);
      }
    };

    // Initialize both players
    initializeVideoPlayer(videoChunks, webcamVideoRef, 'webcam');
    initializeVideoPlayer(videoChunks, screenshareVideoRef, 'screenshare');

    // Cleanup function
    return () => {
      // Clean up blob URLs
      if (webcamVideoRef.current?.src && webcamVideoRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(webcamVideoRef.current.src);
        webcamVideoRef.current.src = '';
      }
      if (screenshareVideoRef.current?.src && screenshareVideoRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(screenshareVideoRef.current.src);
        screenshareVideoRef.current.src = '';
      }
    };
  }, [activeTab, videoChunks]);

  if (loading) return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#0B0B0F] to-[#07070A] text-zinc-100 font-sans overflow-hidden relative">
      <div className="h-full w-full bg-zinc-950/60 backdrop-blur-xl flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <div className="text-zinc-300">Loading...</div>
        </div>
      </div>
    </div>
  );
  if (error) return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#0B0B0F] to-[#07070A] text-zinc-100 font-sans overflow-hidden relative">
      <div className="h-full w-full bg-zinc-950/60 backdrop-blur-xl flex items-center justify-center">
        <div className="border border-red-500/30 bg-red-500/10 rounded-xl p-6">
          <div className="text-red-400">{error}</div>
        </div>
      </div>
    </div>
  );

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
            <h1 className="text-lg sm:text-xl font-bold text-white">Session Details</h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 border-b border-zinc-800">
              <button
                onClick={() => setActiveTab('submissions')}
                className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'submissions'
                    ? 'text-emerald-400 border-b-2 border-emerald-400'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <FileText className="h-4 w-4" />
                Submissions
              </button>
              <button
                onClick={() => setActiveTab('ai-behavior')}
                className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'ai-behavior'
                    ? 'text-emerald-400 border-b-2 border-emerald-400'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <AlertTriangle className="h-4 w-4" />
                AI Behavior {violations.length > 0 && `(${violations.length})`}
              </button>
              <button
                onClick={() => setActiveTab('recordings')}
                className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'recordings'
                    ? 'text-emerald-400 border-b-2 border-emerald-400'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Video className="h-4 w-4" />
                Recordings {videoChunks.length > 0 && `(${videoChunks.length})`}
              </button>
            </div>

            {activeTab === 'submissions' && (
              <>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="border border-zinc-800 bg-zinc-950/70 backdrop-blur-xl rounded-xl p-4">
                    <div className="text-zinc-400 text-xs mb-1 flex items-center gap-2">
                      <Code className="h-3.5 w-3.5" />
                      Session Code
                    </div>
                    <div className="text-emerald-400 font-mono text-sm">{session.sessionCode || session.session_code || 'N/A'}</div>
                  </div>
                  <div className="border border-zinc-800 bg-zinc-950/70 backdrop-blur-xl rounded-xl p-4">
                    <div className="text-zinc-400 text-xs mb-1 flex items-center gap-2">
                      <User className="h-3.5 w-3.5" />
                      Candidate
                    </div>
                    <div className="text-white text-sm">{session.candidateName || session.candidate_name || 'N/A'}</div>
                  </div>
                  <div className="border border-zinc-800 bg-zinc-950/70 backdrop-blur-xl rounded-xl p-4">
                    <div className="text-zinc-400 text-xs mb-1 flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Status
                    </div>
                    <div className="text-white text-sm capitalize">{session.status}</div>
                  </div>
                </div>

                <div className="border border-zinc-800 bg-zinc-950/70 backdrop-blur-xl rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                    <h2 className="text-white font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Submissions ({subs.length})
                    </h2>
                  </div>
                  {subs.length === 0 ? (
                    <div className="p-6 text-zinc-400 text-center">No submissions yet.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-zinc-900/50 text-zinc-300">
                          <tr>
                            <th className="px-4 py-2 text-left">Submitted</th>
                            <th className="px-4 py-2 text-left">Problem</th>
                            <th className="px-4 py-2 text-left">Language</th>
                            <th className="px-4 py-2 text-left">Score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800 text-zinc-300">
                          {subs.map((s, i) => (
                            <tr key={i} className="hover:bg-zinc-900/30 transition-colors">
                              <td className="px-4 py-2">{new Date(s.submittedAt || s.submitted_at).toLocaleString()}</td>
                              <td className="px-4 py-2">{s.problemId ?? s.problem_id ?? '—'}</td>
                              <td className="px-4 py-2">{s.language}</td>
                              <td className="px-4 py-2">{s.score}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'ai-behavior' && (
              <>
                {/* Risk Score - Always show */}
                <div className={`p-4 sm:p-6 rounded-xl border ${
                  riskScore === null ? 'bg-zinc-900/50 border-zinc-800' :
                  riskScore >= 70 ? 'bg-red-500/10 border-red-500/30' :
                  riskScore >= 40 ? 'bg-amber-500/10 border-amber-500/30' :
                  'bg-emerald-500/10 border-emerald-500/30'
                }`}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`h-4 w-4 ${
                      riskScore === null ? 'text-zinc-400' :
                      riskScore >= 70 ? 'text-red-400' :
                      riskScore >= 40 ? 'text-amber-400' :
                      'text-emerald-400'
                    }`} />
                    <span className="text-sm font-semibold text-white">Risk Score:</span>
                    <span className={`text-lg font-bold ${
                      riskScore === null ? 'text-zinc-400' :
                      riskScore >= 70 ? 'text-red-400' :
                      riskScore >= 40 ? 'text-amber-400' :
                      'text-emerald-400'
                    }`}>
                      {riskScore === null ? 'Loading...' : `${riskScore}/100`}
                    </span>
                  </div>
                </div>

                {/* Violations */}
                {violations.length > 0 && (
                  <div className="border border-zinc-800 bg-zinc-950/70 backdrop-blur-xl rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
                      <h2 className="text-white font-semibold flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                        Violations ({violations.length})
                      </h2>
                    </div>
                    <div className="p-4 space-y-3">
                      {violations.map((v, i) => (
                        <div key={i} className={`p-3 sm:p-4 rounded-lg border ${
                          v.severity === 'high' ? 'bg-red-500/10 border-red-500/30' :
                          v.severity === 'medium' ? 'bg-amber-500/10 border-amber-500/30' :
                          'bg-blue-500/10 border-blue-500/30'
                        }`}>
                          <div className="flex items-start justify-between">
                            <div>
                              <span className={`text-xs sm:text-sm font-semibold ${
                                v.severity === 'high' ? 'text-red-400' :
                                v.severity === 'medium' ? 'text-amber-400' :
                                'text-blue-400'
                              }`}>
                                {v.type.replace(/_/g, ' ').toUpperCase()}
                              </span>
                              <p className="text-zinc-300 text-xs sm:text-sm mt-1">{v.description}</p>
                              <span className="text-xs text-zinc-500 mt-1 block">
                                {new Date(v.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${
                              v.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                              v.severity === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                              {v.severity}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Interactions Section */}
                <div className="border border-zinc-800 bg-zinc-950/70 backdrop-blur-xl rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                    <h2 className="text-white font-semibold flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      AI Interactions ({aiInteractions.length})
                    </h2>
                  </div>
                  {aiInteractions.length === 0 ? (
                    <div className="p-6 text-zinc-400 text-center">No AI interactions yet.</div>
                  ) : (
                    <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                      {aiInteractions.map((event, i) => (
                        <div key={i} className="border border-zinc-800 bg-zinc-900/50 rounded-lg p-3 text-xs sm:text-sm">
                          <div className="flex items-start justify-between mb-1">
                            <span className="text-emerald-400 font-semibold">{event.eventType}</span>
                            <span className="text-zinc-500 text-xs">
                              {new Date(event.timestamp || event.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                          {event.model && (
                            <div className="text-zinc-400 text-xs mb-1">Model: {event.model}</div>
                          )}
                          {event.promptText && (
                            <div className="text-zinc-300 mt-2">
                              <span className="text-zinc-500">Prompt:</span> {event.promptText.substring(0, 100)}
                              {event.promptText.length > 100 && '...'}
                            </div>
                          )}
                          {event.responseText && (
                            <div className="text-zinc-300 mt-2">
                              <span className="text-zinc-500">Response:</span> {event.responseText.substring(0, 100)}
                              {event.responseText.length > 100 && '...'}
                            </div>
                          )}
                          {event.codeSnippet && (
                            <div className="text-zinc-300 mt-2">
                              <span className="text-zinc-500">Code:</span> 
                              <pre className="text-xs border border-zinc-800 bg-zinc-950 p-2 rounded mt-1 overflow-x-auto">
                                {event.codeSnippet.substring(0, 200)}
                                {event.codeSnippet.length > 200 && '...'}
                              </pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'recordings' && (
              <>
                {videoChunks.length === 0 ? (
                  <div className="border border-zinc-800 bg-zinc-950/70 backdrop-blur-xl rounded-xl p-6 text-zinc-400 text-center">
                    No recordings available for this session.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Webcam Feed */}
                    {videoChunks.filter(c => {
                      // Use streamType field first, then fall back to URL
                      return c.streamType === 'webcam' || (!c.streamType && c.url?.includes('/webcam/'));
                    }).length > 0 && (
                      <div className="border border-zinc-800 bg-zinc-950/70 backdrop-blur-xl rounded-xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
                          <h2 className="text-white font-semibold flex items-center gap-2">
                            <Video className="h-4 w-4" />
                            Webcam Recording
                            <span className="text-xs text-zinc-400 ml-2">
                              ({videoChunks.filter(c => c.streamType === 'webcam' || (!c.streamType && c.url?.includes('/webcam/'))).length} chunks)
                            </span>
                          </h2>
                        </div>
                        <video
                          ref={webcamVideoRef}
                          controls
                          className="w-full bg-black"
                          style={{ maxHeight: '600px' }}
                        />
                      </div>
                    )}
                    
                    {/* Screen Share Feed */}
                    {videoChunks.filter(c => {
                      // Use streamType field first, then fall back to URL
                      return c.streamType === 'screenshare' || (!c.streamType && c.url?.includes('/screenshare/'));
                    }).length > 0 && (
                      <div className="border border-zinc-800 bg-zinc-950/70 backdrop-blur-xl rounded-xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
                          <h2 className="text-white font-semibold flex items-center gap-2">
                            <Monitor className="h-4 w-4" />
                            Screen Share Recording
                            <span className="text-xs text-zinc-400 ml-2">
                              ({videoChunks.filter(c => c.streamType === 'screenshare' || (!c.streamType && c.url?.includes('/screenshare/'))).length} chunks)
                            </span>
                          </h2>
                        </div>
                        <video
                          ref={screenshareVideoRef}
                          controls
                          className="w-full bg-black"
                          style={{ maxHeight: '600px' }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


