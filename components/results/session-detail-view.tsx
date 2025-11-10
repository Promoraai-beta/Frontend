"use client"

import { useState, useEffect, useRef, useMemo } from 'react'
import { FileText, AlertTriangle, Video, Monitor, Code, User, CheckCircle, MessageSquare, Bot, UserCircle } from 'lucide-react'
import { API_BASE_URL } from '@/lib/config'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { logger } from '@/lib/logger'

interface SessionDetailViewProps {
  session: any
  submissions: any[]
  aiInteractions: any[]
  videoChunks?: any[] | null
  violations: any[]
  riskScore: number | null
  agentInsights?: {
    watcher: any;
    extractor: any;
    sanity: any;
  } | null
  isCandidateView?: boolean // If true, hide recruiter-specific information
}

export function SessionDetailView({
  session,
  submissions,
  aiInteractions,
  videoChunks,
  violations,
  riskScore,
  agentInsights,
  isCandidateView = false
}: SessionDetailViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'submissions' | 'chat-history' | 'agent-insights' | 'recordings' | 'my-insights'>('overview')
  
  // Normalize videoChunks to always be an array
  const normalizedVideoChunks = Array.isArray(videoChunks) ? videoChunks : []
  
  // Filter test results for candidates - only show visible test cases
  const filterTestResultsForCandidate = (testResults: any): any => {
    if (!testResults) return null
    
    // If testResults is an array
    if (Array.isArray(testResults)) {
      // Filter out hidden test cases
      return testResults.filter((test: any) => {
        // Show test if it's not marked as hidden
        return test.hidden !== true && test.isHidden !== true
      })
    }
    
    // If testResults is an object
    if (typeof testResults === 'object') {
      // If it has a 'tests' or 'testCases' array
      if (testResults.tests && Array.isArray(testResults.tests)) {
        return {
          ...testResults,
          tests: testResults.tests.filter((test: any) => 
            test.hidden !== true && test.isHidden !== true
          )
        }
      }
      if (testResults.testCases && Array.isArray(testResults.testCases)) {
        return {
          ...testResults,
          testCases: testResults.testCases.filter((test: any) => 
            test.hidden !== true && test.isHidden !== true
          )
        }
      }
      
      // If it has 'visible' property, use that
      if (testResults.visible) {
        return { visible: testResults.visible }
      }
      
      // If it has separate visible and hidden arrays
      if (testResults.visibleTests || testResults.publicTests) {
        return {
          visible: testResults.visibleTests || testResults.publicTests || [],
          // Don't include hidden tests
        }
      }
      
      // For candidates, only return visible/public test information
      // Remove any hidden test data
      const filtered: any = {}
      for (const [key, value] of Object.entries(testResults)) {
        // Skip hidden test cases
        if (key.toLowerCase().includes('hidden')) continue
        if (typeof value === 'object' && value !== null && Array.isArray(value)) {
          // Filter array items that are marked as hidden
          filtered[key] = (value as any[]).filter((item: any) => 
            item.hidden !== true && item.isHidden !== true
          )
        } else {
          filtered[key] = value
        }
      }
      return filtered
    }
    
    // Return as-is if we can't determine structure (fallback)
    return testResults
  }
  
  // Determine if this is a coding challenge (not IDE challenge)
  // IDE challenges have templateFiles, coding challenges don't
  const isCodingChallenge = useMemo(() => {
    const assessment = session?.assessment;
    if (!assessment) return false;
    
    // Check if session or assessment has templateFiles
    // IDE challenges have templateFiles, coding challenges don't
    const sessionTemplateFiles = session?.templateFiles || session?.container?.templateFiles;
    const assessmentTemplateFiles = assessment.templateFiles;
    
    const hasTemplateFiles = (sessionTemplateFiles && 
      typeof sessionTemplateFiles === 'object' && 
      Object.keys(sessionTemplateFiles).length > 0) ||
      (assessmentTemplateFiles && 
      typeof assessmentTemplateFiles === 'object' && 
      Object.keys(assessmentTemplateFiles).length > 0);
    
    return !hasTemplateFiles;
  }, [session])
  const webcamVideoRef = useRef<HTMLVideoElement>(null)
  const screenshareVideoRef = useRef<HTMLVideoElement>(null)

  // Filter submissions for recruiter view: only show coding assessments
  // A coding assessment submission must have:
  // - code (actual code submission), OR
  // - (problemId AND language), OR
  // - testResults (test results from code execution)
  const filteredSubmissions = useMemo(() => {
    if (isCandidateView) {
      // Candidate view: show all submissions
      return submissions
    }
    
    // Recruiter view: filter to only show submissions with coding assessment data
    return submissions.filter((submission: any) => {
      // Check if submission has coding assessment indicators
      const hasCode = submission.code && typeof submission.code === 'string' && submission.code.trim().length > 0
      const hasLanguage = submission.language && typeof submission.language === 'string' && submission.language.trim().length > 0
      const hasProblemId = (submission.problemId && submission.problemId.toString().trim().length > 0) || 
                          (submission.problem_id && submission.problem_id.toString().trim().length > 0)
      const hasTestResults = submission.testResults && (
        (Array.isArray(submission.testResults) && submission.testResults.length > 0) ||
        (typeof submission.testResults === 'object' && Object.keys(submission.testResults).length > 0)
      )
      
      // Include submission if it's a coding assessment:
      // 1. Has actual code submitted
      // 2. Has both problemId and language (indicating a coding problem)
      // 3. Has test results (indicating code was executed)
      return hasCode || (hasProblemId && hasLanguage) || hasTestResults
    })
  }, [submissions, isCandidateView])

  // Calculate overall score based on filtered submissions
  const totalScore = filteredSubmissions.reduce((sum, s) => sum + (s.score || 0), 0)
  const maxScore = filteredSubmissions.length * 100
  const percentageScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0
  const passed = percentageScore >= 70 // 70% passing threshold

  // Initialize video players when recordings tab is active using MediaSource API
  useEffect(() => {
    if (activeTab !== 'recordings' || normalizedVideoChunks.length === 0) return

    let webcamMediaSource: MediaSource | null = null
    let screenshareMediaSource: MediaSource | null = null
    let isCleaningUp = false

    // Sequential playback fallback - plays chunks one after another
    const initializeSequentialPlayback = (chunks: any[], videoElement: HTMLVideoElement, streamType: string) => {
      console.log(`🎬 ${streamType}: Initializing sequential playback with ${chunks.length} chunks`)
      
      let currentIndex = 0
      let isPlaying = false
      
      const playNextChunk = () => {
        if (currentIndex >= chunks.length || isCleaningUp) {
          console.log(`✅ ${streamType}: Finished playing all ${chunks.length} chunks`)
          return
        }
        
        const chunk = chunks[currentIndex]
        const chunkUrl = chunk.url?.startsWith('http') 
          ? chunk.url
          : `${API_BASE_URL}${chunk.url}`
        
        console.log(`▶️ ${streamType}: Playing chunk ${currentIndex + 1}/${chunks.length} (index ${chunk.chunkIndex || currentIndex})`)
        
        videoElement.src = chunkUrl
        videoElement.load()
        
        const playPromise = videoElement.play()
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              isPlaying = true
            })
            .catch((e) => {
              if (e.name !== 'NotAllowedError') {
                console.warn(`${streamType}: Failed to play chunk ${currentIndex}:`, e)
              }
              // Try next chunk even if play fails
              currentIndex++
              playNextChunk()
            })
        }
      }
      
      // When a chunk ends, play the next one
      const handleEnded = () => {
        console.log(`⏭️ ${streamType}: Chunk ${currentIndex + 1} ended, playing next...`)
        isPlaying = false
        currentIndex++
        playNextChunk()
      }
      
      // Handle errors - skip to next chunk
      const handleError = (e: Event) => {
        const error = videoElement.error
        if (error) {
          console.warn(`⚠️ ${streamType}: Error playing chunk ${currentIndex + 1}:`, {
            code: error.code,
            message: error.message
          })
        }
        // Skip to next chunk on error
        currentIndex++
        playNextChunk()
      }
      
      videoElement.addEventListener('ended', handleEnded)
      videoElement.addEventListener('error', handleError)
      
      // Start playing first chunk
      playNextChunk()
      
      // Return cleanup function
      return () => {
        videoElement.removeEventListener('ended', handleEnded)
        videoElement.removeEventListener('error', handleError)
        isPlaying = false
      }
    }

    const initializeVideoPlayer = async (chunks: any[], videoRef: React.RefObject<HTMLVideoElement | null>, streamType: string) => {
      // Wait for video element to be available
      await new Promise(resolve => setTimeout(resolve, 100))
      
      if (!videoRef.current || isCleaningUp) {
        console.log(`${streamType}: Video element not found or cleaning up`)
        return
      }

      const video = videoRef.current
      const streamChunks = chunks
        .filter(c => {
          // Prioritize streamType field - it's the most reliable
          if (c.streamType) {
            const matches = c.streamType === streamType
            // If streamType matches but URL doesn't, log a warning
            if (matches && c.url && !c.url.includes(`/${streamType}/`)) {
              console.warn(`⚠️ ${streamType} chunk has streamType="${c.streamType}" but URL doesn't contain "/${streamType}/": ${c.url?.substring(Math.max(0, c.url.length - 60))}`)
          }
            return matches
          }
          // Fallback to URL-based detection
          const urlMatches = c.url?.includes(`/${streamType}/`)
          if (urlMatches) {
            console.warn(`⚠️ ${streamType} chunk missing streamType field, using URL-based detection: ${c.url?.substring(Math.max(0, c.url.length - 60))}`)
          }
          return urlMatches
        })
        .sort((a, b) => (a.chunkIndex || 0) - (b.chunkIndex || 0))
      
      // Log filtered chunks for debugging
      if (streamChunks.length > 0) {
        logger.log(`✅ Filtered ${streamChunks.length} ${streamType} chunks`)
        const firstUrl = streamChunks[0].url
        if (firstUrl) {
          // Show full URL or last 100 chars if very long
          const urlDisplay = firstUrl.length > 100 
            ? `...${firstUrl.substring(firstUrl.length - 100)}` 
            : firstUrl
          logger.log(`   First chunk URL: ${urlDisplay}`)
        }
        logger.log(`   First chunk streamType: ${streamChunks[0].streamType || 'missing'}`)
        logger.log(`   First chunk index: ${streamChunks[0].chunkIndex ?? 'unknown'}`)
      }

      if (streamChunks.length === 0) {
        logger.log(`${streamType}: No chunks found`)
        return
      }

      logger.log(`Initializing ${streamType} player with ${streamChunks.length} chunks using MediaSource API`)

      try {
        // Check if MediaSource is supported
        if (!('MediaSource' in window)) {
          console.warn(`${streamType}: MediaSource API not supported, using sequential playback`)
          initializeSequentialPlayback(streamChunks, video, streamType)
          return
        }

        // Create MediaSource
        const mediaSource = new MediaSource()
        
        // Store reference for cleanup
        if (streamType === 'webcam') {
          webcamMediaSource = mediaSource
        } else {
          screenshareMediaSource = mediaSource
        }
        
        const url = URL.createObjectURL(mediaSource)
        video.src = url

        // Add error handlers to video element
        const handleVideoError = (e: Event) => {
          const error = video.error
          if (error) {
            console.error(`❌ ${streamType}: Video element error:`, {
              code: error.code,
              message: error.message,
              networkState: video.networkState,
              readyState: video.readyState,
              mediaSourceState: mediaSource.readyState
            })
            
            // Don't close MediaSource on video errors - let it continue loading
            // Some errors are recoverable (like network issues)
          }
        }

        const handleVideoLoadStart = () => {
          console.log(`📹 ${streamType}: Video load started`)
        }

        const handleVideoLoadedData = () => {
          console.log(`✅ ${streamType}: Video data loaded`)
        }

        const handleVideoCanPlay = () => {
          console.log(`▶️ ${streamType}: Video can play`)
        }

        video.addEventListener('error', handleVideoError)
        video.addEventListener('loadstart', handleVideoLoadStart)
        video.addEventListener('loadeddata', handleVideoLoadedData)
        video.addEventListener('canplay', handleVideoCanPlay)

        mediaSource.addEventListener('sourceopen', async () => {
          // Check if we're still supposed to be initializing
          if (isCleaningUp || mediaSource.readyState !== 'open') {
            return
          }

          try {
            console.log(`${streamType}: MediaSource opened, creating SourceBuffer...`)

            // Try different codecs
            // For screenshare, try video-only codecs FIRST (screenshare typically has NO audio)
            // Error message "misses expected opus track" confirms screenshare doesn't have audio
            // For webcam, try codecs with audio first (webcam usually has audio)
            const codecs = streamType === 'screenshare'
              ? [
                  'video/webm;codecs="vp9"',      // Video-only first (screenshare typically has no audio)
                  'video/webm;codecs="vp8"',      // Video-only VP8
                  'video/webm;codecs="vp9,opus"', // With audio fallback (in case screenshare has audio)
                  'video/webm;codecs="vp8,opus"', // With audio VP8 fallback
                  'video/webm'                    // Generic fallback
                ]
              : [
                  'video/webm;codecs="vp9,opus"', // With audio first for webcam
                  'video/webm;codecs="vp8,opus"',  // With audio VP8
                  'video/webm;codecs="vp9"',       // Video-only fallback
                  'video/webm;codecs="vp8"',       // Video-only VP8
                  'video/webm'                      // Generic fallback
                ]

            let sourceBuffer: SourceBuffer | null = null
            let selectedCodec: string | null = null

            for (const codec of codecs) {
              if (MediaSource.isTypeSupported(codec)) {
                try {
                  if (mediaSource.readyState !== 'open') {
                    console.error(`${streamType}: MediaSource is no longer open`)
                    return
                  }
                  sourceBuffer = mediaSource.addSourceBuffer(codec)
                  selectedCodec = codec
                  console.log(`✅ Created SourceBuffer for ${streamType} with codec: ${codec}`)
                  break
                } catch (e) {
                  console.warn(`${streamType}: Failed to create SourceBuffer with ${codec}:`, e)
                  continue
                }
              }
            }

            if (!sourceBuffer) {
              console.error(`❌ ${streamType}: No supported codec found`)
              if (mediaSource.readyState === 'open') {
                try {
                  mediaSource.endOfStream()
                } catch (e) {
                  console.warn(`${streamType}: Error ending stream:`, e)
                }
              }
              return
            }

            // Store selected codec for error reporting
            const finalSelectedCodec = selectedCodec

            // Add SourceBuffer error handler
            sourceBuffer.addEventListener('error', (e) => {
              const error = sourceBuffer.error
              const errorDetails = {
                error: error,
                errorCode: error?.code,
                errorMessage: error?.message,
                mediaSourceState: mediaSource.readyState,
                sourceBufferUpdating: sourceBuffer.updating,
                sourceBufferBuffered: sourceBuffer.buffered.length > 0 ? {
                  start: sourceBuffer.buffered.start(0),
                  end: sourceBuffer.buffered.end(sourceBuffer.buffered.length - 1),
                  length: sourceBuffer.buffered.length
                } : 'empty',
                selectedCodec: finalSelectedCodec,
                availableCodecs: codecs,
                event: e
              }
              
              console.error(`❌ ${streamType}: SourceBuffer error:`, errorDetails)
              
              // If MediaSource ended, this usually means codec mismatch
              if (mediaSource.readyState === 'ended') {
                console.error(`❌ ${streamType}: MediaSource ended unexpectedly - likely codec mismatch!`)
                console.error(`   Selected codec: ${finalSelectedCodec}`)
                console.error(`   Selected codec may not match the actual codec in the video chunks`)
                console.error(`   Available codecs tried: ${codecs.join(', ')}`)
                console.error(`   This usually happens when:`)
                console.error(`   - Screenshare was recorded with audio but codec doesn't include audio`)
                console.error(`   - Screenshare was recorded without audio but codec includes audio`)
                console.error(`   - Video was recorded with a different codec (VP8 vs VP9)`)
                console.error(`   - Video format is not WebM`)
                
                // Don't try to recover - MediaSource cannot be reopened once ended
                // The user will need to refresh or we'll need to reinitialize
              } else if (error) {
                // Log error code meanings
                if (error.code === 4) {
                  console.error(`   Error code 4 (MEDIA_ERR_SRC_NOT_SUPPORTED): Codec not supported or mismatch`)
                } else if (error.code === 22) {
                  console.error(`   Error code 22 (QUOTA_EXCEEDED_ERR): Buffer quota exceeded`)
                }
              }
            })

            sourceBuffer.addEventListener('abort', (e) => {
              console.warn(`⚠️ ${streamType}: SourceBuffer aborted:`, e)
            })

            // Helper function to wait for SourceBuffer to be ready
            const waitForSourceBuffer = async (): Promise<boolean> => {
              try {
                // First check if MediaSource is still open before waiting
                if (mediaSource.readyState !== 'open') {
                  console.warn(`${streamType}: MediaSource is not open (state: ${mediaSource.readyState})`)
                  return false
                }

                // Check if SourceBuffer is still attached
                if (!sourceBuffer || !mediaSource.sourceBuffers.length || mediaSource.sourceBuffers[0] !== sourceBuffer) {
                  console.warn(`${streamType}: SourceBuffer is no longer attached`)
                  return false
                }

                // Wait for any pending update to complete
                while (sourceBuffer.updating) {
                  // Check state before waiting
                  if (mediaSource.readyState !== 'open') {
                    console.warn(`${streamType}: MediaSource closed while waiting for update`)
                    return false
                  }
                  
                  try {
                    await new Promise<void>((resolve, reject) => {
                      const timeout = setTimeout(() => {
                        sourceBuffer!.removeEventListener('updateend', onUpdateEnd)
                        sourceBuffer!.removeEventListener('error', onError)
                        console.warn(`${streamType}: Timeout waiting for SourceBuffer update`)
                        reject(new Error('Timeout'))
                      }, 10000) // 10 second timeout

                      const onUpdateEnd = () => {
                        clearTimeout(timeout)
                        sourceBuffer!.removeEventListener('error', onError)
                        resolve()
                      }

                      const onError = (e: Event) => {
                        clearTimeout(timeout)
                        sourceBuffer!.removeEventListener('updateend', onUpdateEnd)
                        const error = sourceBuffer!.error
                        const errorDetails = {
                          error: error,
                          errorCode: error?.code,
                          errorMessage: error?.message,
                          mediaSourceState: mediaSource.readyState,
                          sourceBufferUpdating: sourceBuffer!.updating
                        }
                        console.error(`${streamType}: SourceBuffer error during wait:`, errorDetails)
                        
                        // Check if MediaSource ended (codec mismatch)
                        if (mediaSource.readyState === 'ended') {
                          reject(new Error(`MediaSource ended - codec mismatch (error code: ${error?.code})`))
                        } else {
                          reject(new Error(`SourceBuffer error (code: ${error?.code})`))
                        }
                      }

                      sourceBuffer!.addEventListener('updateend', onUpdateEnd, { once: true })
                      sourceBuffer!.addEventListener('error', onError, { once: true })
                    })
                  } catch (waitError) {
                    console.warn(`${streamType}: Error waiting for SourceBuffer:`, waitError)
                    return false
                  }

                  // Re-check state after waiting
                  if (mediaSource.readyState !== 'open') {
                    console.warn(`${streamType}: MediaSource closed after update wait`)
                    return false
                  }
                }

                // Final state check after waiting
                if (mediaSource.readyState !== 'open') {
                  console.warn(`${streamType}: MediaSource closed after update (state: ${mediaSource.readyState})`)
                  return false
                }

                if (!sourceBuffer || !mediaSource.sourceBuffers.length || mediaSource.sourceBuffers[0] !== sourceBuffer) {
                  console.warn(`${streamType}: SourceBuffer detached after update`)
                  return false
                }

                return true
              } catch (error) {
                console.error(`${streamType}: Unexpected error in waitForSourceBuffer:`, error)
                return false
              }
            }

            // Fetch and append all chunks sequentially
            let successCount = 0
            let skippedCount = 0
            let errorCount = 0
            
            console.log(`🚀 Starting to load ${streamChunks.length} ${streamType} chunks...`)
            console.log(`   Chunk indices: ${streamChunks.map(c => c.chunkIndex || '?').join(', ')}`)
            
            for (let i = 0; i < streamChunks.length; i++) {
              // Check if we should stop
              if (isCleaningUp) {
                console.log(`${streamType}: Stopping chunk loading (cleanup requested)`)
                break
              }
              
              if (mediaSource.readyState !== 'open') {
                console.warn(`${streamType}: MediaSource is ${mediaSource.readyState} (expected 'open') - stopping chunk loading`)
                console.warn(`   Successfully loaded: ${successCount}/${streamChunks.length} chunks`)
                console.warn(`   Skipped: ${skippedCount} chunks`)
                console.warn(`   Errors: ${errorCount} chunks`)
                break
              }

              const chunk = streamChunks[i]
              const chunkUrl = chunk.url?.startsWith('http') 
                ? chunk.url
                : `${API_BASE_URL}${chunk.url}`

              const urlDisplay = chunkUrl.length > 80 
                ? `...${chunkUrl.substring(chunkUrl.length - 80)}` 
                : chunkUrl
              console.log(`📦 [${i + 1}/${streamChunks.length}] Loading ${streamType} chunk ${chunk.chunkIndex ?? i} from ${urlDisplay}`)

              try {
                // Fetch chunk data
                const response = await fetch(chunkUrl)
                if (!response.ok) {
                  if (response.status === 400 || response.status === 404) {
                    console.error(`${streamType}: ❌ Chunk ${chunk.chunkIndex || i} not found (${response.status}) - file may not exist at corrected URL`)
                    console.error(`   URL: ${urlDisplay}`)
                    console.error(`   This may indicate a data inconsistency - the backend corrected the URL path but the file doesn't exist`)
                    console.error(`   The actual file may have a different timestamp in the filename`)
                  } else {
                  console.error(`${streamType}: ❌ Failed to fetch chunk ${chunk.chunkIndex || i}: ${response.status}`)
                  }
                  errorCount++
                  // Continue with next chunk - don't stop entirely
                  continue
                }

                const arrayBuffer = await response.arrayBuffer()
                if (arrayBuffer.byteLength === 0) {
                  console.warn(`${streamType}: ⚠️ Chunk ${chunk.chunkIndex || i} is empty, skipping`)
                  skippedCount++
                  continue
                }

                console.log(`✅ Loaded ${streamType} chunk ${chunk.chunkIndex || i}: ${arrayBuffer.byteLength} bytes`)

                // Wait for SourceBuffer to be ready
                const isReady = await waitForSourceBuffer()
                if (!isReady) {
                  console.error(`${streamType}: ❌ SourceBuffer not ready after loading chunk ${chunk.chunkIndex || i}`)
                  console.error(`   MediaSource state: ${mediaSource.readyState}`)
                  console.error(`   Successfully appended so far: ${successCount} chunks`)
                  // Don't break - try to continue with next chunk
                  errorCount++
                  continue
                }

                // Check video element for errors (but don't stop - some errors are recoverable)
                if (video.error) {
                  const error = video.error
                  console.warn(`⚠️ ${streamType}: Video element has error (chunk ${chunk.chunkIndex || i}):`, {
                    code: error.code,
                    message: error.message
                  })
                  
                  // MediaError codes:
                  // 1 = MEDIA_ERR_ABORTED
                  // 2 = MEDIA_ERR_NETWORK
                  // 3 = MEDIA_ERR_DECODE
                  // 4 = MEDIA_ERR_SRC_NOT_SUPPORTED
                  // Only stop if it's a fatal source error (code 4)
                  // Other errors might be recoverable
                  if (error.code === 4) {
                    console.error(`${streamType}: Fatal video error (source not supported) - stopping`)
                    break
                  }
                  // Continue loading for other errors - they might resolve
                  console.log(`${streamType}: Video error (code ${error.code}) - continuing`)
                }

                // Append chunk
                try {
                  // Double-check MediaSource is still open before appending
                  if (mediaSource.readyState !== 'open') {
                    console.warn(`${streamType}: MediaSource closed before appending chunk ${chunk.chunkIndex || i} (state: ${mediaSource.readyState})`)
                    if (mediaSource.readyState === 'ended') {
                      console.error(`${streamType}: MediaSource ended - codec mismatch detected. Stopping chunk loading.`)
                      console.error(`   This usually means the selected codec doesn't match the video format.`)
                      console.error(`   Successfully loaded: ${successCount}/${streamChunks.length} chunks before error`)
                    }
                    break
                  }

                  // Check SourceBuffer error before appending
                  if (sourceBuffer.error) {
                    const error = sourceBuffer.error
                    console.error(`${streamType}: SourceBuffer has error before appending chunk ${chunk.chunkIndex || i}:`, {
                      code: error.code,
                      message: error.message
                    })
                    // MEDIA_ERR_SRC_NOT_SUPPORTED (4) means codec mismatch
                    if (error.code === 4) {
                      console.error(`${streamType}: Codec mismatch detected - stopping chunk loading`)
                      break
                    }
                  }

                  sourceBuffer.appendBuffer(arrayBuffer)
                  successCount++
                  
                  // After first chunk, check for immediate errors (codec mismatch)
                  if (i === 0) {
                    // Wait a bit for error to surface if codec mismatch
                    await new Promise(resolve => setTimeout(resolve, 100))
                    if (sourceBuffer.error || mediaSource.readyState === 'ended') {
                      const error = sourceBuffer.error
                      console.error(`${streamType}: Error detected after first chunk append:`, {
                        sourceBufferError: error ? { code: error.code, message: error.message } : null,
                        mediaSourceState: mediaSource.readyState
                      })
                      if (mediaSource.readyState === 'ended' || (error && error.code === 4)) {
                        console.error(`${streamType}: Codec mismatch detected on first chunk - selected codec doesn't match video format`)
                        break
                      }
                    }
                  }
                  
                  // Wait for append to complete
                  const appendSuccess = await waitForSourceBuffer()
                  if (!appendSuccess) {
                    console.warn(`${streamType}: ⚠️ Failed to wait for SourceBuffer after appending chunk ${chunk.chunkIndex || i}`)
                    console.warn(`   MediaSource state: ${mediaSource.readyState}`)
                    errorCount++
                    // Don't break - continue with next chunk if MediaSource is still open
                    if (mediaSource.readyState === 'open') {
                      continue
                    } else {
                      break
                    }
                  }
                  console.log(`✅ Appended ${streamType} chunk ${chunk.chunkIndex || i} (${successCount}/${streamChunks.length})`)
                } catch (appendError: any) {
                  console.error(`❌ Error appending ${streamType} chunk ${chunk.chunkIndex || i}:`, appendError)
                  errorCount++
                  
                  // If it's a QuotaExceededError, try to remove some old data
                  if (appendError.name === 'QuotaExceededError' && sourceBuffer.buffered.length > 0) {
                    try {
                      const endTime = sourceBuffer.buffered.end(sourceBuffer.buffered.length - 1)
                      sourceBuffer.remove(0, Math.max(0, endTime - 10)) // Keep last 10 seconds
                      console.log(`${streamType}: Removed old data due to quota exceeded`)
                      // Retry append after removal completes
                      const retryReady = await waitForSourceBuffer()
                      if (retryReady && mediaSource.readyState === 'open') {
                        sourceBuffer.appendBuffer(arrayBuffer)
                        await waitForSourceBuffer()
                        successCount++
                        errorCount-- // Decrement since we recovered
                        console.log(`✅ Appended ${streamType} chunk ${chunk.chunkIndex || i} after quota fix`)
                      } else {
                        console.warn(`${streamType}: Cannot retry append - MediaSource not ready`)
                        break
                      }
                    } catch (removeError) {
                      console.error(`${streamType}: Error removing old data:`, removeError)
                      // Continue instead of break - try next chunk
                      continue
                    }
                  } else {
                    // For other errors, skip this chunk but continue if MediaSource is still open
                    if (mediaSource.readyState === 'open') {
                      continue
                    } else {
                      console.warn(`${streamType}: MediaSource closed due to append error - stopping`)
                      break
                    }
                  }
                }
              } catch (error) {
                console.error(`❌ Error loading ${streamType} chunk ${chunk.chunkIndex || i}:`, error)
                errorCount++
                // Continue with next chunk
              }
            }
            
            // Log final summary
            console.log(`\n📊 ${streamType} loading complete:`)
            console.log(`   Total chunks: ${streamChunks.length}`)
            console.log(`   Successfully appended: ${successCount}`)
            console.log(`   Skipped: ${skippedCount}`)
            console.log(`   Errors: ${errorCount}`)
            console.log(`   MediaSource state: ${mediaSource.readyState}`)

            // Determine if we should use sequential playback fallback
            // Use sequential playback if:
            // 1. MediaSource failed to load most chunks (< 50% success rate)
            // 2. MediaSource closed prematurely
            // 3. Less than 3 chunks were successfully loaded
            const shouldUseSequentialPlayback = 
              mediaSource.readyState !== 'open' || 
              successCount < Math.min(3, streamChunks.length) ||
              (successCount / streamChunks.length) < 0.5

            // Check if we have enough chunks to play
            if (successCount === 0) {
              console.error(`❌ ${streamType}: No chunks were successfully loaded. Cannot play video.`)
              console.error(`   This may be due to:`)
              console.error(`   - Files not existing at the corrected URLs (database inconsistency)`)
              console.error(`   - Network errors`)
              console.error(`   - Codec issues`)
              console.error(`   - Missing files in storage`)
              console.error(`   - Files may have different timestamps than what's stored in database`)
              
              // Clean up MediaSource
              try {
                if (mediaSource.readyState === 'open') {
                  mediaSource.endOfStream()
                }
                URL.revokeObjectURL(video.src)
              } catch (e) {
                // Ignore cleanup errors
              }
              return
            }
            
            if (shouldUseSequentialPlayback && successCount < streamChunks.length) {
              console.warn(`⚠️ ${streamType}: MediaSource only loaded ${successCount}/${streamChunks.length} chunks`)
              
              if (successCount > 0) {
                console.warn(`   Will attempt to play with ${successCount} available chunks`)
                console.warn(`   Video may be incomplete or have gaps`)
                // Continue to end stream and play what we have
              } else {
                // No chunks loaded - can't play
                console.error(`❌ ${streamType}: No chunks loaded. Video cannot be played.`)
              return
              }
            }

            // Close the stream only if we successfully appended at least one chunk
            if (successCount > 0 && !isCleaningUp) {
              const isReady = await waitForSourceBuffer()
              if (isReady && mediaSource.readyState === 'open') {
                try {
                  mediaSource.endOfStream()
                  console.log(`✅ ${streamType}: Stream ended successfully`)
                  console.log(`   Appended ${successCount}/${streamChunks.length} chunks`)
                  
                  if (successCount < streamChunks.length) {
                    console.warn(`⚠️ ${streamType}: Only ${successCount} of ${streamChunks.length} chunks were appended!`)
                    console.warn(`   This may result in shorter playback duration.`)
                  }

                  // Check video duration
                  if (sourceBuffer && sourceBuffer.buffered.length > 0) {
                    const start = sourceBuffer.buffered.start(0)
                    const end = sourceBuffer.buffered.end(sourceBuffer.buffered.length - 1)
                    const duration = end - start
                    console.log(`📹 ${streamType}: Buffered duration: ${duration.toFixed(2)} seconds`)
                  }

                  // Try to play
                  video.play().catch((e) => {
                    if (e.name !== 'NotAllowedError') {
                      console.warn(`${streamType}: Failed to auto-play:`, e)
                    }
                  })
                } catch (endError) {
                  console.warn(`${streamType}: Error ending stream:`, endError)
                  console.warn(`   Video may not play correctly`)
                }
              } else {
                console.warn(`${streamType}: Cannot end stream - MediaSource state: ${mediaSource.readyState}`)
                console.warn(`   Only ${successCount}/${streamChunks.length} chunks were appended before MediaSource closed`)
                if (successCount === 0) {
                  console.error(`❌ ${streamType}: No chunks loaded. Video cannot be played.`)
                }
              }
            } else {
              console.warn(`${streamType}: No chunks were successfully appended (success: ${successCount}, errors: ${errorCount}, skipped: ${skippedCount})`)
              console.error(`❌ ${streamType}: Video cannot be played without any loaded chunks`)
            }
          } catch (error) {
            console.error(`❌ Error initializing ${streamType} player:`, error)
            if (mediaSource.readyState === 'open') {
              try {
                mediaSource.endOfStream()
              } catch (e) {
                // Ignore errors when ending stream after error
              }
            }
            // MediaSource initialization failed - cannot play video
            console.error(`❌ ${streamType}: MediaSource initialization failed. Video cannot be played.`)
            console.error(`   MediaSource fragments cannot be played as standalone videos`)
            console.error(`   They must be loaded into a MediaSource buffer`)
            try {
              URL.revokeObjectURL(video.src)
            } catch (e) {
              // Ignore
            }
          }
        })

        mediaSource.addEventListener('error', (e) => {
          console.error(`❌ ${streamType}: MediaSource error:`, e)
          console.error(`   ReadyState: ${mediaSource.readyState}`)
          console.error(`   SourceBuffers: ${mediaSource.sourceBuffers.length}`)
          if (video.error) {
            console.error(`   Video error:`, {
              code: video.error.code,
              message: video.error.message
            })
          }
        })

        mediaSource.addEventListener('sourceended', () => {
          console.log(`✅ ${streamType}: MediaSource ended (normal closure)`)
        })

        mediaSource.addEventListener('sourceclose', () => {
          console.warn(`⚠️ ${streamType}: MediaSource closed unexpectedly`)
          console.warn(`   ReadyState before close: ${mediaSource.readyState}`)
          console.warn(`   SourceBuffers count: ${mediaSource.sourceBuffers.length}`)
          if (video.error) {
            console.warn(`   Video error:`, {
              code: video.error.code,
              message: video.error.message
            })
          }
        })
      } catch (error) {
        console.error(`❌ Error creating MediaSource for ${streamType}:`, error)
        console.error(`   MediaSource is required for playing video chunks`)
        console.error(`   Video cannot be played without MediaSource support`)
      }
    }

    // Initialize both players
    initializeVideoPlayer(normalizedVideoChunks, webcamVideoRef, 'webcam')
    initializeVideoPlayer(normalizedVideoChunks, screenshareVideoRef, 'screenshare')

    // Cleanup function
    return () => {
      isCleaningUp = true
      
      // End MediaSources if they're still open
      if (webcamMediaSource && webcamMediaSource.readyState === 'open') {
        try {
          webcamMediaSource.endOfStream()
        } catch (e) {
          // Ignore errors
        }
      }
      if (screenshareMediaSource && screenshareMediaSource.readyState === 'open') {
        try {
          screenshareMediaSource.endOfStream()
        } catch (e) {
          // Ignore errors
        }
      }
      
      // Clean up blob URLs
      if (webcamVideoRef.current?.src && webcamVideoRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(webcamVideoRef.current.src)
        webcamVideoRef.current.src = ''
      }
      if (screenshareVideoRef.current?.src && screenshareVideoRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(screenshareVideoRef.current.src)
        screenshareVideoRef.current.src = ''
      }
    }
  }, [activeTab, normalizedVideoChunks])

  const handleDownloadReport = () => {
    // TODO: Generate and download PDF report
    console.log("Downloading report...")
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-zinc-800">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? 'text-white border-b-2 border-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Overview
          </button>
          {/* Submissions Tab - Only show for coding challenges */}
          {isCodingChallenge && (
            <button
              onClick={() => setActiveTab('submissions')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'submissions'
                  ? 'text-white border-b-2 border-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Submissions ({filteredSubmissions.length})
            </button>
          )}
          {/* Chat History Tab - Show full conversation */}
          <button
            onClick={() => setActiveTab('chat-history')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'chat-history'
                ? 'text-white border-b-2 border-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Chat History {aiInteractions.length > 0 && `(${aiInteractions.length})`}
          </button>
          {/* Agent Insights Tab - Only for recruiters, shows detailed agent analysis */}
          {!isCandidateView && agentInsights && (
            <button
              onClick={() => setActiveTab('agent-insights')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'agent-insights'
                  ? 'text-white border-b-2 border-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Agent Insights
            </button>
          )}
          {/* My Insights Tab - Only for candidates, shows simplified feedback */}
          {isCandidateView && agentInsights && (
            <button
              onClick={() => setActiveTab('my-insights')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'my-insights'
                  ? 'text-white border-b-2 border-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              My Insights
            </button>
          )}
          {/* Recordings Tab - Only for recruiter assessments */}
          {!isCandidateView && (
          <button
            onClick={() => setActiveTab('recordings')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'recordings'
                ? 'text-white border-b-2 border-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Recordings {normalizedVideoChunks.length > 0 && `(${normalizedVideoChunks.length})`}
          </button>
          )}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Score Overview */}
          <Card className="border-zinc-800 bg-zinc-950">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl text-white">Assessment Score</CardTitle>
                <Button onClick={handleDownloadReport} className="gap-2 bg-white text-black hover:bg-zinc-200">
                  <Download className="h-4 w-4" />
                  Download Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-5xl font-bold text-white">{percentageScore}%</p>
                  <p className="mt-2 text-zinc-400">
                    {totalScore} out of {maxScore} points
                  </p>
                </div>
                <div>
                  {passed ? (
                    <Badge className="bg-green-500/10 px-4 py-2 text-lg text-green-500">
                      <CheckCircle className="mr-2 h-5 w-5" />
                      Passed
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500/10 px-4 py-2 text-lg text-red-500">
                      <AlertTriangle className="mr-2 h-5 w-5" />
                      Failed
                    </Badge>
                  )}
                </div>
              </div>
              <Progress value={percentageScore} className="h-3" />
            </CardContent>
          </Card>

          {/* Session Info */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border-zinc-800 bg-zinc-950">
              <CardContent className="p-4">
                <div className="text-zinc-400 text-xs mb-1 flex items-center gap-2">
                  <Code className="h-3.5 w-3.5" />
                  Session Code
                </div>
                <div className="text-emerald-400 font-mono text-sm">{session.sessionCode || session.session_code || 'N/A'}</div>
              </CardContent>
            </Card>
            <Card className="border-zinc-800 bg-zinc-950">
              <CardContent className="p-4">
                <div className="text-zinc-400 text-xs mb-1 flex items-center gap-2">
                  <User className="h-3.5 w-3.5" />
                  Candidate
                </div>
                <div className="text-white text-sm">{session.candidateName || session.candidate_name || 'N/A'}</div>
              </CardContent>
            </Card>
            <Card className="border-zinc-800 bg-zinc-950">
              <CardContent className="p-4">
                <div className="text-zinc-400 text-xs mb-1 flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Status
                </div>
                <div className="text-white text-sm capitalize">{session.status}</div>
              </CardContent>
            </Card>
          </div>

          {/* Agent Analysis Summary - Consolidated view with scores and metrics */}
          {!isCandidateView && agentInsights && (
            <Card className="border-zinc-800 bg-zinc-950">
              <CardHeader>
                <CardTitle className="text-white text-lg">Agent Analysis Summary</CardTitle>
              </CardHeader>
              <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
                  {/* Agent 6: Watcher - Combined view */}
                  {agentInsights.watcher && (
                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                      <div className="flex items-center gap-2 mb-3">
                        <Monitor className="h-4 w-4 text-blue-400" />
                        <span className="text-sm font-semibold text-white">Agent 6: Watcher</span>
                    </div>
                      {riskScore !== null && (
                        <div className="mb-3">
                          <div className="flex items-baseline gap-2 mb-1">
                    <span className={`text-2xl font-bold ${
                      riskScore >= 70 ? 'text-red-400' :
                      riskScore >= 40 ? 'text-amber-400' :
                      'text-emerald-400'
                    }`}>
                      {riskScore}/100
                    </span>
                            <span className="text-xs text-zinc-500">Risk Score</span>
                    </div>
                          <Progress value={riskScore} className="h-2" />
                    </div>
                      )}
                      <div className="space-y-1 text-xs text-zinc-400 border-t border-zinc-800 pt-2">
                        {agentInsights.watcher.alerts && (
                          <p>Alerts: {agentInsights.watcher.alerts.length}</p>
                        )}
                        {agentInsights.watcher.violations && (
                          <p>Violations: {agentInsights.watcher.violations.length}</p>
                        )}
                        {agentInsights.watcher.timeline && (
                          <p>Timeline Events: {agentInsights.watcher.timeline.length}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Agent 7: Analyzer - Combined view */}
                  {agentInsights.extractor && (
                    <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                      <div className="flex items-center gap-2 mb-3">
                        <Code className="h-4 w-4 text-purple-400" />
                        <span className="text-sm font-semibold text-white">Agent 7: Analyzer</span>
                      </div>
                      {agentInsights.extractor.behaviorScore !== undefined && (
                        <div className="mb-3">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className={`text-2xl font-bold ${
                              agentInsights.extractor.behaviorScore >= 70 ? 'text-emerald-400' :
                              agentInsights.extractor.behaviorScore >= 40 ? 'text-amber-400' :
                              'text-red-400'
                            }`}>
                              {agentInsights.extractor.behaviorScore}/100
                            </span>
                            <span className="text-xs text-zinc-500">Behavior Score</span>
                          </div>
                          <Progress value={agentInsights.extractor.behaviorScore} className="h-2" />
                        </div>
                      )}
                      <div className="space-y-1 text-xs text-zinc-400 border-t border-zinc-800 pt-2">
                        {agentInsights.extractor.codeQuality && (
                          <p>Lines: {agentInsights.extractor.codeQuality.totalLines || 'N/A'}</p>
                        )}
                        {agentInsights.extractor.codeIntegration && (
                          <p>Modifications: {agentInsights.extractor.codeIntegration.modifications || 0}</p>
                        )}
                        {agentInsights.extractor.patterns && (
                          <p>Patterns Detected: {
                            (agentInsights.extractor.patterns.copyPastePatterns?.length || 0) +
                            (agentInsights.extractor.patterns.timingPatterns ? 1 : 0) +
                            (agentInsights.extractor.patterns.promptPatterns ? 1 : 0)
                          }</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Agent 8: Risk Assessor - Combined view */}
                  {agentInsights.sanity && (
                    <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                        <span className="text-sm font-semibold text-white">Agent 8: Risk Assessor</span>
                      </div>
                      <div className="mb-3">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className={`text-2xl font-bold ${
                            (agentInsights.sanity.redFlags?.length || 0) > 5 ? 'text-red-400' :
                            (agentInsights.sanity.redFlags?.length || 0) > 2 ? 'text-amber-400' :
                            'text-emerald-400'
                          }`}>
                            {agentInsights.sanity.redFlags?.length || 0}
                          </span>
                          <span className="text-xs text-zinc-500">Red Flags</span>
                        </div>
                        {agentInsights.sanity.riskScore !== undefined && (
                          <p className="text-xs text-zinc-500">
                            Risk: {agentInsights.sanity.riskScore}/100
                          </p>
                        )}
                      </div>
                      <div className="space-y-1 text-xs text-zinc-400 border-t border-zinc-800 pt-2">
                        {agentInsights.sanity.anomalies && (
                          <p>Anomalies: {agentInsights.sanity.anomalies.length}</p>
                        )}
                        {agentInsights.sanity.sanityChecks && (
                          <p>Checks: {Object.keys(agentInsights.sanity.sanityChecks).length}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => setActiveTab('agent-insights')}
                  className="mt-4 w-full bg-zinc-800 text-white hover:bg-zinc-700"
                >
                  View Detailed Agent Insights
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Legacy Risk Score - Fallback if no agent insights */}
          {riskScore !== null && !isCandidateView && !agentInsights && (
            <Card className={`border ${
              riskScore >= 70 ? 'border-red-500/30 bg-red-500/10' :
              riskScore >= 40 ? 'border-amber-500/30 bg-amber-500/10' :
              'border-emerald-500/30 bg-emerald-500/10'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`h-4 w-4 ${
                    riskScore >= 70 ? 'text-red-400' :
                    riskScore >= 40 ? 'text-amber-400' :
                    'text-emerald-400'
                  }`} />
                  <span className="text-sm font-semibold text-white">Risk Score:</span>
                  <span className={`text-lg font-bold ${
                    riskScore >= 70 ? 'text-red-400' :
                    riskScore >= 40 ? 'text-amber-400' :
                    'text-emerald-400'
                  }`}>
                    {riskScore}/100
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Submissions Tab - Only for coding challenges */}
      {activeTab === 'submissions' && isCodingChallenge && (
        <div className="space-y-6">
          {filteredSubmissions.length === 0 ? (
            <Card className="border-zinc-800 bg-zinc-950">
              <CardContent className="p-6 text-zinc-400 text-center">
                {!isCandidateView && submissions.length > 0 
                  ? 'No coding assessment submissions found.' 
                  : 'No submissions yet.'}
              </CardContent>
            </Card>
          ) : (
            filteredSubmissions.map((submission, index) => (
              <Card key={index} className="border-zinc-800 bg-zinc-950">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Submission #{index + 1}
                    </CardTitle>
                    <div className="flex items-center gap-4">
                      <Badge className="bg-emerald-500/20 text-emerald-400">
                        {submission.language || 'N/A'}
                      </Badge>
                      <Badge className={
                        (submission.score || 0) >= 70 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : (submission.score || 0) >= 40
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-red-500/20 text-red-400'
                      }>
                        Score: {submission.score || 0}%
                      </Badge>
                    </div>
                  </div>
                  <div className="text-sm text-zinc-400 mt-2">
                    <span>Problem ID: {submission.problemId ?? submission.problem_id ?? 'N/A'}</span>
                    <span className="mx-2">•</span>
                    <span>
                      Submitted: {submission.submittedAt || submission.submitted_at 
                        ? new Date(submission.submittedAt || submission.submitted_at).toLocaleString()
                        : 'N/A'}
                    </span>
                    {submission.testResults && (
                      <>
                        <span className="mx-2">•</span>
                        <span>
                          {isCandidateView ? (
                            (() => {
                              const filteredResults = filterTestResultsForCandidate(submission.testResults)
                              const visibleTests = Array.isArray(filteredResults) 
                                ? filteredResults 
                                : filteredResults?.tests || filteredResults?.testCases || filteredResults?.visible || []
                              const visiblePassed = Array.isArray(visibleTests) 
                                ? visibleTests.filter((test: any) => test.status === 'passed' || test.passed === true).length
                                : 0
                              const visibleTotal = Array.isArray(visibleTests) ? visibleTests.length : 0
                              return `Visible Tests: ${visiblePassed}/${visibleTotal} passed`
                            })()
                          ) : (
                            `Tests: ${submission.passedTests || 0}/${submission.totalTests || 0} passed`
                          )}
                        </span>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Submitted Code */}
                  <div className="mt-4">
                    <h3 className="text-white font-semibold mb-2">Submitted Code</h3>
                    <div className="relative">
                      <pre className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                        <code className="text-sm text-zinc-300 font-mono whitespace-pre">
                          {submission.code || 'No code submitted'}
                        </code>
                      </pre>
                    </div>
                  </div>
                  
                  {/* Test Results - Filtered for candidates */}
                  {submission.testResults && (
                    <div className="mt-4">
                      <h3 className="text-white font-semibold mb-2">Test Results</h3>
                      {isCandidateView ? (
                        // Candidate view: Only show visible test cases
                        (() => {
                          const filteredResults = filterTestResultsForCandidate(submission.testResults)
                          const visibleTestCount = Array.isArray(filteredResults) 
                            ? filteredResults.length 
                            : filteredResults?.tests?.length || filteredResults?.testCases?.length || filteredResults?.visible?.length || 0
                          
                          return (
                            <div className="space-y-3">
                              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                                {filteredResults && (Array.isArray(filteredResults) || filteredResults.tests || filteredResults.testCases || filteredResults.visible) ? (
                                  <div className="space-y-2">
                                    {Array.isArray(filteredResults) ? (
                                      filteredResults.map((test: any, idx: number) => (
                                        <div key={idx} className="p-3 rounded bg-zinc-800/50 border border-zinc-700">
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-semibold text-white">
                                              Test Case {idx + 1}
                                            </span>
                                            <Badge className={
                                              test.status === 'passed' || test.passed === true
                                                ? 'bg-emerald-500/20 text-emerald-400'
                                                : 'bg-red-500/20 text-red-400'
                                            }>
                                              {test.status === 'passed' || test.passed === true ? 'Passed' : 'Failed'}
                                            </Badge>
                                          </div>
                                          {test.input && (
                                            <div className="mt-2">
                                              <span className="text-xs text-zinc-400">Input: </span>
                                              <code className="text-xs text-zinc-300 bg-zinc-900 px-2 py-1 rounded">
                                                {typeof test.input === 'object' ? JSON.stringify(test.input) : test.input}
                                              </code>
                                            </div>
                                          )}
                                          {test.expected && (
                                            <div className="mt-2">
                                              <span className="text-xs text-zinc-400">Expected: </span>
                                              <code className="text-xs text-zinc-300 bg-zinc-900 px-2 py-1 rounded">
                                                {typeof test.expected === 'object' ? JSON.stringify(test.expected) : test.expected}
                                              </code>
                                            </div>
                                          )}
                                          {test.output && (
                                            <div className="mt-2">
                                              <span className="text-xs text-zinc-400">Your Output: </span>
                                              <code className="text-xs text-zinc-300 bg-zinc-900 px-2 py-1 rounded">
                                                {typeof test.output === 'object' ? JSON.stringify(test.output) : test.output}
                                              </code>
                                            </div>
                                          )}
                                          {test.message && (
                                            <p className="text-xs text-zinc-400 mt-2">{test.message}</p>
                                          )}
                                        </div>
                                      ))
                                    ) : (
                                      <pre className="text-sm text-zinc-300 whitespace-pre-wrap">
                                        {JSON.stringify(filteredResults, null, 2)}
                                      </pre>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-zinc-400 text-sm">
                                    No visible test results available
                                  </div>
                                )}
                              </div>
                              <p className="text-xs text-zinc-500">
                                Showing {visibleTestCount} visible test case{visibleTestCount !== 1 ? 's' : ''}. 
                                Hidden test cases are not shown.
                              </p>
                            </div>
                          )
                        })()
                      ) : (
                        // Recruiter view: Show all test results
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                          <pre className="text-sm text-zinc-300 whitespace-pre-wrap">
                            {JSON.stringify(submission.testResults, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Chat History Tab - Full conversation view */}
      {activeTab === 'chat-history' && (
        <Card className="border-zinc-800 bg-zinc-950">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat History
              {aiInteractions.length > 0 && (
                <Badge className="ml-2 bg-zinc-800 text-zinc-400">
                  {aiInteractions.length} messages
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {aiInteractions.length === 0 ? (
              <div className="p-6 text-zinc-400 text-center">
                No chat history available for this session.
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {/* Group interactions by conversation flow - sorted by timestamp */}
                {aiInteractions
                  .filter(interaction => 
                    interaction.eventType === 'prompt_sent' || 
                    interaction.eventType === 'response_received' ||
                    interaction.promptText || 
                    interaction.responseText
                  )
                  .sort((a, b) => {
                    const timeA = new Date(a.timestamp || a.createdAt || 0).getTime();
                    const timeB = new Date(b.timestamp || b.createdAt || 0).getTime();
                    return timeA - timeB;
                  })
                  .map((interaction, index) => {
                    const isPrompt = interaction.eventType === 'prompt_sent' || !!interaction.promptText;
                    const isResponse = interaction.eventType === 'response_received' || !!interaction.responseText;
                    const timestamp = new Date(interaction.timestamp || interaction.createdAt || Date.now());
                    
                    return (
                      <div key={index} className="flex flex-col gap-2">
                        {/* Candidate Message (Prompt) */}
                        {isPrompt && interaction.promptText && (
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                              <UserCircle className="h-4 w-4 text-emerald-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="bg-zinc-800 rounded-lg rounded-tl-none p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-emerald-400 text-sm font-semibold">Candidate</span>
                                  <span className="text-zinc-500 text-xs">
                                    {timestamp.toLocaleTimeString()}
                                  </span>
                                </div>
                                <p className="text-white text-sm whitespace-pre-wrap">
                                  {interaction.promptText}
                                </p>
                                {interaction.model && (
                                  <div className="text-zinc-400 text-xs mt-2">
                                    Using: {interaction.model}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* AI Response */}
                        {isResponse && interaction.responseText && (
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                              <Bot className="h-4 w-4 text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="bg-zinc-900 border border-zinc-800 rounded-lg rounded-tl-none p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-blue-400 text-sm font-semibold flex items-center gap-2">
                                    AI Assistant
                                    {interaction.model && (
                                      <Badge className="bg-blue-500/20 text-blue-400 text-xs">
                                        {interaction.model}
                                      </Badge>
                                    )}
                                  </span>
                                  <span className="text-zinc-500 text-xs">
                                    {timestamp.toLocaleTimeString()}
                                  </span>
                                </div>
                                <p className="text-zinc-300 text-sm whitespace-pre-wrap">
                                  {interaction.responseText}
                                </p>
                                {interaction.tokensUsed && (
                                  <div className="text-zinc-500 text-xs mt-2">
                                    Tokens used: {interaction.tokensUsed}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Code Snippet if present */}
                        {interaction.codeSnippet && (
                          <div className="ml-11 bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                            <div className="text-zinc-400 text-xs mb-2">Code Snippet</div>
                            <pre className="text-xs text-zinc-300 font-mono whitespace-pre-wrap overflow-x-auto">
                              {interaction.codeSnippet}
                            </pre>
                            {interaction.codeLineNumber && (
                              <div className="text-zinc-500 text-xs mt-1">
                                Line: {interaction.codeLineNumber}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                
                {/* Fallback: Show all interactions if no prompt/response structure */}
                {aiInteractions.filter(i => 
                  i.eventType === 'prompt_sent' || 
                  i.eventType === 'response_received' ||
                  i.promptText || 
                  i.responseText
                ).length === 0 && (
                  <div className="space-y-3">
                    {aiInteractions.map((interaction, index) => (
                      <div key={index} className="border border-zinc-800 bg-zinc-900/50 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-emerald-400 font-semibold text-sm">
                            {interaction.eventType || 'Interaction'}
                          </span>
                          <span className="text-zinc-500 text-xs">
                            {new Date(interaction.timestamp || interaction.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {interaction.model && (
                          <div className="text-zinc-400 text-xs mb-2">Model: {interaction.model}</div>
                        )}
                        {interaction.promptText && (
                          <div className="text-zinc-300 text-sm mb-2">
                            <span className="text-zinc-500">Prompt: </span>
                            {interaction.promptText}
                          </div>
                        )}
                        {interaction.responseText && (
                          <div className="text-zinc-300 text-sm">
                            <span className="text-zinc-500">Response: </span>
                            {interaction.responseText}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Agent Insights Tab - Only for recruiters */}
      {activeTab === 'agent-insights' && !isCandidateView && agentInsights && (
        <div className="space-y-6">
          {/* Agent 6: Watcher - Real-time Monitoring */}
          {agentInsights.watcher && (
            <Card className="border-zinc-800 bg-zinc-950">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-blue-400" />
                  Agent 6: Watcher
                  <Badge className="ml-2 bg-blue-500/20 text-blue-400">Monitoring Agent</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Risk Score */}
                {agentInsights.watcher.riskScore !== undefined && (
                  <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-zinc-400 text-sm">Risk Score</span>
                      <span className={`text-2xl font-bold ${
                        agentInsights.watcher.riskScore >= 70 ? 'text-red-400' :
                        agentInsights.watcher.riskScore >= 40 ? 'text-amber-400' :
                        'text-emerald-400'
                      }`}>
                        {agentInsights.watcher.riskScore}/100
                      </span>
                    </div>
                    <Progress 
                      value={agentInsights.watcher.riskScore} 
                      className={`h-2 ${
                        agentInsights.watcher.riskScore >= 70 ? 'bg-red-500/20' :
                        agentInsights.watcher.riskScore >= 40 ? 'bg-amber-500/20' :
                        'bg-emerald-500/20'
                      }`}
                    />
                  </div>
                )}

                {/* Alerts */}
                {agentInsights.watcher.alerts && agentInsights.watcher.alerts.length > 0 && (
                  <div>
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      Alerts ({agentInsights.watcher.alerts.length})
                    </h3>
                    <div className="space-y-2">
                      {agentInsights.watcher.alerts.map((alert: any, i: number) => (
                        <div key={i} className={`p-3 rounded-lg border ${
                          alert.severity === 'high' ? 'bg-red-500/10 border-red-500/30' :
                          alert.severity === 'medium' ? 'bg-amber-500/10 border-amber-500/30' :
                          'bg-blue-500/10 border-blue-500/30'
                        }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <span className={`text-sm font-semibold ${
                                alert.severity === 'high' ? 'text-red-400' :
                                alert.severity === 'medium' ? 'text-amber-400' :
                                'text-blue-400'
                              }`}>
                                {alert.type?.replace(/_/g, ' ').toUpperCase() || 'Alert'}
                              </span>
                              <p className="text-zinc-300 text-sm mt-1">{alert.message}</p>
                            </div>
                            <Badge className={
                              alert.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                              alert.severity === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-blue-500/20 text-blue-400'
                            }>
                              {alert.severity}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timeline */}
                {agentInsights.watcher.timeline && agentInsights.watcher.timeline.length > 0 && (
                  <div>
                    <h3 className="text-white font-semibold mb-3">Activity Timeline</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {agentInsights.watcher.timeline.map((event: any, i: number) => (
                        <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-zinc-900/50">
                          <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-zinc-300 text-sm">{event.description || event.type}</p>
                            {event.timestamp && (
                              <p className="text-zinc-500 text-xs mt-1">
                                {new Date(event.timestamp).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metrics */}
                {agentInsights.watcher.metrics && (
                  <div>
                    <h3 className="text-white font-semibold mb-3">Metrics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(agentInsights.watcher.metrics).map(([key, value]: [string, any]) => (
                        <div key={key} className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                          <div className="text-zinc-400 text-xs mb-1">{key.replace(/_/g, ' ')}</div>
                          <div className="text-white text-lg font-semibold">{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Evidence */}
                {agentInsights.watcher.evidence && agentInsights.watcher.evidence.length > 0 && (
                  <div>
                    <h3 className="text-white font-semibold mb-3">Evidence</h3>
                    <div className="space-y-2">
                      {agentInsights.watcher.evidence.map((evidence: string, i: number) => (
                        <div key={i} className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                          <p className="text-zinc-300 text-sm">{evidence}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Explanation */}
                {agentInsights.watcher.explanation && (
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <h3 className="text-blue-400 font-semibold mb-2">Analysis Explanation</h3>
                    <p className="text-zinc-300 text-sm">{agentInsights.watcher.explanation}</p>
                  </div>
                )}

                {/* Confidence */}
                {agentInsights.watcher.confidence !== undefined && (
                  <div className="text-zinc-400 text-xs">
                    Confidence: {Math.round(agentInsights.watcher.confidence * 100)}%
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Agent 7: Extractor - Code Analysis */}
          {agentInsights.extractor && (
            <Card className="border-zinc-800 bg-zinc-950">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Code className="h-5 w-5 text-purple-400" />
                  Agent 7: Analyzer
                  <Badge className="ml-2 bg-purple-500/20 text-purple-400">Analysis Agent</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Behavior Score */}
                {agentInsights.extractor.behaviorScore !== undefined && (
                  <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-zinc-400 text-sm">Behavior Score</span>
                      <span className={`text-2xl font-bold ${
                        agentInsights.extractor.behaviorScore >= 70 ? 'text-emerald-400' :
                        agentInsights.extractor.behaviorScore >= 40 ? 'text-amber-400' :
                        'text-red-400'
                      }`}>
                        {agentInsights.extractor.behaviorScore}/100
                      </span>
                    </div>
                    <Progress 
                      value={agentInsights.extractor.behaviorScore} 
                      className="h-2"
                    />
                    <p className="text-zinc-500 text-xs mt-2">
                      Higher score indicates better coding behavior and integration quality
                    </p>
                  </div>
                )}

                {/* Code Quality */}
                {agentInsights.extractor.codeQuality && (
                  <div>
                    <h3 className="text-white font-semibold mb-3">Code Quality Metrics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {agentInsights.extractor.codeQuality.totalLines !== undefined && (
                        <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                          <div className="text-zinc-400 text-xs mb-1">Total Lines</div>
                          <div className="text-white text-lg font-semibold">
                            {agentInsights.extractor.codeQuality.totalLines}
                          </div>
                        </div>
                      )}
                      {agentInsights.extractor.codeQuality.nonEmptyLines !== undefined && (
                        <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                          <div className="text-zinc-400 text-xs mb-1">Non-empty Lines</div>
                          <div className="text-white text-lg font-semibold">
                            {agentInsights.extractor.codeQuality.nonEmptyLines}
                          </div>
                        </div>
                      )}
                      {agentInsights.extractor.codeQuality.comments !== undefined && (
                        <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                          <div className="text-zinc-400 text-xs mb-1">Comments</div>
                          <div className="text-white text-lg font-semibold">
                            {agentInsights.extractor.codeQuality.comments}
                          </div>
                        </div>
                      )}
                      {agentInsights.extractor.codeQuality.commentRatio !== undefined && (
                        <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                          <div className="text-zinc-400 text-xs mb-1">Comment Ratio</div>
                          <div className="text-white text-lg font-semibold">
                            {Math.round(agentInsights.extractor.codeQuality.commentRatio * 100)}%
                          </div>
                        </div>
                      )}
                      {agentInsights.extractor.codeQuality.complexity && (
                        <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                          <div className="text-zinc-400 text-xs mb-1">Complexity</div>
                          <div className="text-white text-lg font-semibold">
                            {agentInsights.extractor.codeQuality.complexity}
                          </div>
                        </div>
                      )}
                      {agentInsights.extractor.codeQuality.maxIndentation !== undefined && (
                        <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                          <div className="text-zinc-400 text-xs mb-1">Max Indentation</div>
                          <div className="text-white text-lg font-semibold">
                            {agentInsights.extractor.codeQuality.maxIndentation}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Code Integration */}
                {agentInsights.extractor.codeIntegration && (
                  <div>
                    <h3 className="text-white font-semibold mb-3">Code Integration Analysis</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {agentInsights.extractor.codeIntegration.modifications !== undefined && (
                        <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                          <div className="text-zinc-400 text-xs mb-1">Modifications</div>
                          <div className="text-white text-lg font-semibold">
                            {agentInsights.extractor.codeIntegration.modifications}
                          </div>
                        </div>
                      )}
                      {agentInsights.extractor.codeIntegration.copies !== undefined && (
                        <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                          <div className="text-zinc-400 text-xs mb-1">Copies</div>
                          <div className="text-white text-lg font-semibold">
                            {agentInsights.extractor.codeIntegration.copies}
                          </div>
                        </div>
                      )}
                      {agentInsights.extractor.codeIntegration.modificationRatio !== undefined && (
                        <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                          <div className="text-zinc-400 text-xs mb-1">Modification Ratio</div>
                          <div className="text-white text-lg font-semibold">
                            {Math.round(agentInsights.extractor.codeIntegration.modificationRatio * 100)}%
                          </div>
                        </div>
                      )}
                      {agentInsights.extractor.codeIntegration.integrationQuality && (
                        <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                          <div className="text-zinc-400 text-xs mb-1">Integration Quality</div>
                          <div className={`text-lg font-semibold ${
                            agentInsights.extractor.codeIntegration.integrationQuality === 'good' ? 'text-emerald-400' :
                            agentInsights.extractor.codeIntegration.integrationQuality === 'fair' ? 'text-amber-400' :
                            'text-red-400'
                          }`}>
                            {agentInsights.extractor.codeIntegration.integrationQuality.toUpperCase()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Patterns */}
                {agentInsights.extractor.patterns && (
                  <div>
                    <h3 className="text-white font-semibold mb-3">Detected Patterns</h3>
                    <div className="space-y-3">
                      {agentInsights.extractor.patterns.copyPastePatterns && agentInsights.extractor.patterns.copyPastePatterns.length > 0 && (
                        <div>
                          <h4 className="text-zinc-400 text-sm mb-2 flex items-center gap-2">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                            Copy-Paste Patterns ({agentInsights.extractor.patterns.copyPastePatterns.length})
                          </h4>
                          <div className="space-y-2">
                            {agentInsights.extractor.patterns.copyPastePatterns.map((pattern: any, i: number) => (
                              <div key={i} className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                                <div className="text-zinc-300 text-sm space-y-1">
                                  {pattern.type && (
                                    <p><span className="text-zinc-400">Type:</span> {pattern.type}</p>
                                  )}
                                  {pattern.description && (
                                    <p><span className="text-zinc-400">Description:</span> {pattern.description}</p>
                                  )}
                                  {pattern.confidence !== undefined && (
                                    <p><span className="text-zinc-400">Confidence:</span> {Math.round(pattern.confidence * 100)}%</p>
                                  )}
                                  {pattern.location && (
                                    <p><span className="text-zinc-400">Location:</span> {pattern.location}</p>
                                  )}
                                  {!pattern.type && !pattern.description && (
                                    <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(pattern, null, 2)}</pre>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {agentInsights.extractor.patterns.timingPatterns && (
                        <div>
                          <h4 className="text-zinc-400 text-sm mb-2">Timing Patterns</h4>
                          <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                            <div className="text-zinc-300 text-sm space-y-2">
                              {typeof agentInsights.extractor.patterns.timingPatterns === 'object' ? (
                                Object.entries(agentInsights.extractor.patterns.timingPatterns).map(([key, value]: [string, any]) => (
                                  <div key={key}>
                                    <span className="text-zinc-400">{key.replace(/_/g, ' ')}:</span>{' '}
                                    <span className="text-white">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                                  </div>
                                ))
                              ) : (
                                <p>{String(agentInsights.extractor.patterns.timingPatterns)}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      {agentInsights.extractor.patterns.promptPatterns && (
                        <div>
                          <h4 className="text-zinc-400 text-sm mb-2">Prompt Patterns</h4>
                          <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                            <div className="text-zinc-300 text-sm space-y-2">
                              {typeof agentInsights.extractor.patterns.promptPatterns === 'object' ? (
                                Object.entries(agentInsights.extractor.patterns.promptPatterns).map(([key, value]: [string, any]) => (
                                  <div key={key}>
                                    <span className="text-zinc-400">{key.replace(/_/g, ' ')}:</span>{' '}
                                    <span className="text-white">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                                  </div>
                                ))
                              ) : (
                                <p>{String(agentInsights.extractor.patterns.promptPatterns)}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Skills */}
                {agentInsights.extractor.skills && (
                  <div>
                    <h3 className="text-white font-semibold mb-3">Detected Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(agentInsights.extractor.skills).map(([skill, level]: [string, any]) => (
                        <Badge key={skill} className="bg-purple-500/20 text-purple-400">
                          {skill}: {level}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Explanation */}
                {agentInsights.extractor.explanation && (
                  <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                    <h3 className="text-purple-400 font-semibold mb-2">Analysis Explanation</h3>
                    <p className="text-zinc-300 text-sm">{agentInsights.extractor.explanation}</p>
                  </div>
                )}

                {/* Confidence */}
                {agentInsights.extractor.confidence !== undefined && (
                  <div className="text-zinc-400 text-xs">
                    Confidence: {Math.round(agentInsights.extractor.confidence * 100)}%
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Agent 8: Sanity - Risk Assessment */}
          {agentInsights.sanity && (
            <Card className="border-zinc-800 bg-zinc-950">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  Agent 8: Risk Assessor
                  <Badge className="ml-2 bg-red-500/20 text-red-400">Risk Agent</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Risk Score */}
                {agentInsights.sanity.riskScore !== undefined && (
                  <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-zinc-400 text-sm">Risk Score</span>
                      <span className={`text-2xl font-bold ${
                        agentInsights.sanity.riskScore >= 70 ? 'text-red-400' :
                        agentInsights.sanity.riskScore >= 40 ? 'text-amber-400' :
                        'text-emerald-400'
                      }`}>
                        {agentInsights.sanity.riskScore}/100
                      </span>
                    </div>
                    <Progress 
                      value={agentInsights.sanity.riskScore} 
                      className={`h-2 ${
                        agentInsights.sanity.riskScore >= 70 ? 'bg-red-500/20' :
                        agentInsights.sanity.riskScore >= 40 ? 'bg-amber-500/20' :
                        'bg-emerald-500/20'
                      }`}
                    />
                    <p className="text-zinc-500 text-xs mt-2">
                      Higher score indicates higher risk of suspicious behavior
                    </p>
                  </div>
                )}

                {/* Red Flags */}
                {agentInsights.sanity.redFlags && agentInsights.sanity.redFlags.length > 0 && (
                  <div>
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                      Red Flags ({agentInsights.sanity.redFlags.length})
                    </h3>
                    <div className="space-y-2">
                      {agentInsights.sanity.redFlags.map((flag: any, i: number) => (
                        <div key={i} className={`p-4 rounded-lg border ${
                          flag.severity === 'high' ? 'bg-red-500/10 border-red-500/30' :
                          flag.severity === 'medium' ? 'bg-amber-500/10 border-amber-500/30' :
                          'bg-blue-500/10 border-blue-500/30'
                        }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <span className={`text-sm font-semibold ${
                                flag.severity === 'high' ? 'text-red-400' :
                                flag.severity === 'medium' ? 'text-amber-400' :
                                'text-blue-400'
                              }`}>
                                {flag.type?.replace(/_/g, ' ').toUpperCase() || 'Red Flag'}
                              </span>
                              <p className="text-zinc-300 text-sm mt-1">{flag.description}</p>
                            </div>
                            <Badge className={
                              flag.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                              flag.severity === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-blue-500/20 text-blue-400'
                            }>
                              {flag.severity}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Anomalies */}
                {agentInsights.sanity.anomalies && agentInsights.sanity.anomalies.length > 0 && (
                  <div>
                    <h3 className="text-white font-semibold mb-3">Anomalies Detected</h3>
                    <div className="space-y-2">
                      {agentInsights.sanity.anomalies.map((anomaly: any, i: number) => (
                        <div key={i} className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                          <p className="text-zinc-300 text-sm">{JSON.stringify(anomaly, null, 2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Plagiarism Analysis */}
                {agentInsights.sanity.plagiarismAnalysis && (
                  <div>
                    <h3 className="text-white font-semibold mb-3">Plagiarism Analysis</h3>
                    <div className={`p-4 rounded-lg border ${
                      agentInsights.sanity.plagiarismAnalysis.suspicious 
                        ? 'bg-red-500/10 border-red-500/30' 
                        : 'bg-emerald-500/10 border-emerald-500/30'
                    }`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            agentInsights.sanity.plagiarismAnalysis.suspicious 
                              ? 'bg-red-400' 
                              : 'bg-emerald-400'
                          }`} />
                          <span className={`text-lg font-semibold ${
                            agentInsights.sanity.plagiarismAnalysis.suspicious 
                              ? 'text-red-400' 
                              : 'text-emerald-400'
                          }`}>
                            {agentInsights.sanity.plagiarismAnalysis.suspicious 
                              ? 'Suspicious Activity Detected' 
                              : 'No Plagiarism Detected'}
                          </span>
                        </div>
                        {agentInsights.sanity.plagiarismAnalysis.confidence !== undefined && (
                          <Badge className={
                            agentInsights.sanity.plagiarismAnalysis.suspicious
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }>
                            Confidence: {Math.round(agentInsights.sanity.plagiarismAnalysis.confidence * 100)}%
                          </Badge>
                        )}
                      </div>
                      
                      {/* Patterns Detected */}
                      {agentInsights.sanity.plagiarismAnalysis.patterns && 
                       Array.isArray(agentInsights.sanity.plagiarismAnalysis.patterns) && 
                       agentInsights.sanity.plagiarismAnalysis.patterns.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-white font-semibold text-sm mb-2">
                            Detected Patterns ({agentInsights.sanity.plagiarismAnalysis.patterns.length})
                          </h4>
                          <div className="space-y-2">
                            {agentInsights.sanity.plagiarismAnalysis.patterns.map((pattern: any, index: number) => (
                              <div key={index} className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                                <div className="text-zinc-300 text-sm space-y-1">
                                  {pattern.type && (
                                    <p><span className="text-zinc-400">Type:</span> {pattern.type}</p>
                                  )}
                                  {pattern.description && (
                                    <p><span className="text-zinc-400">Description:</span> {pattern.description}</p>
                                  )}
                                  {pattern.source && (
                                    <p><span className="text-zinc-400">Source:</span> {pattern.source}</p>
                                  )}
                                  {pattern.similarity !== undefined && (
                                    <p><span className="text-zinc-400">Similarity:</span> {Math.round(pattern.similarity * 100)}%</p>
                                  )}
                                  {pattern.confidence !== undefined && (
                                    <p><span className="text-zinc-400">Confidence:</span> {Math.round(pattern.confidence * 100)}%</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Show message if no patterns but analysis exists */}
                      {(!agentInsights.sanity.plagiarismAnalysis.patterns || 
                        (Array.isArray(agentInsights.sanity.plagiarismAnalysis.patterns) && 
                         agentInsights.sanity.plagiarismAnalysis.patterns.length === 0)) && (
                        <div className="mt-2 text-zinc-400 text-sm">
                          {agentInsights.sanity.plagiarismAnalysis.suspicious 
                            ? 'No specific patterns identified, but suspicious activity was detected.' 
                            : 'No suspicious patterns or plagiarism indicators found in the code.'}
                        </div>
                      )}
                      
                      {/* Additional metadata if present */}
                      {agentInsights.sanity.plagiarismAnalysis.metadata && (
                        <div className="mt-4 pt-4 border-t border-zinc-800">
                          <h4 className="text-zinc-400 text-xs mb-2">Additional Information</h4>
                          <div className="text-zinc-500 text-xs space-y-1">
                            {Object.entries(agentInsights.sanity.plagiarismAnalysis.metadata).map(([key, value]: [string, any]) => (
                              <div key={key}>
                                <span className="text-zinc-400">{key.replace(/_/g, ' ')}:</span>{' '}
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Sanity Checks */}
                {agentInsights.sanity.sanityChecks && (
                  <div>
                    <h3 className="text-white font-semibold mb-3">Sanity Checks</h3>
                    <div className="space-y-2">
                      {Object.entries(agentInsights.sanity.sanityChecks).map(([check, result]: [string, any]) => (
                        <div key={check} className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                          <span className="text-zinc-300 text-sm">{check.replace(/_/g, ' ')}</span>
                          <Badge className={
                            result === true || result === 'pass' ? 'bg-emerald-500/20 text-emerald-400' :
                            result === false || result === 'fail' ? 'bg-red-500/20 text-red-400' :
                            'bg-amber-500/20 text-amber-400'
                          }>
                            {result === true ? 'PASS' : result === false ? 'FAIL' : String(result)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Explanation */}
                {agentInsights.sanity.explanation && (
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                    <h3 className="text-red-400 font-semibold mb-2">Risk Assessment Explanation</h3>
                    <p className="text-zinc-300 text-sm">{agentInsights.sanity.explanation}</p>
                  </div>
                )}

                {/* Confidence */}
                {agentInsights.sanity.confidence !== undefined && (
                  <div className="text-zinc-400 text-xs">
                    Confidence: {Math.round(agentInsights.sanity.confidence * 100)}%
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* No Agent Insights Available */}
          {!agentInsights.watcher && !agentInsights.extractor && !agentInsights.sanity && (
            <Card className="border-zinc-800 bg-zinc-950">
              <CardContent className="p-6 text-zinc-400 text-center">
                No agent insights available for this session. Agent analysis may still be processing.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Recordings Tab - Only for recruiters */}
      {activeTab === 'recordings' && !isCandidateView && (
        <div className="space-y-6">
          {normalizedVideoChunks.length === 0 ? (
            <Card className="border-zinc-800 bg-zinc-950">
              <CardContent className="p-6 text-zinc-400 text-center">
                No recordings available for this session.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Webcam Feed */}
              {normalizedVideoChunks.filter(c => {
                // Use streamType field first, then fall back to URL
                return c.streamType === 'webcam' || (!c.streamType && c.url?.includes('/webcam/'));
              }).length > 0 && (
                <Card className="border-zinc-800 bg-zinc-950">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Webcam Recording
                      <span className="text-xs text-zinc-400 ml-2">
                        ({normalizedVideoChunks.filter(c => c.streamType === 'webcam' || (!c.streamType && c.url?.includes('/webcam/'))).length} chunks)
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <video
                      ref={webcamVideoRef}
                      controls
                      className="w-full bg-black rounded-lg"
                      style={{ maxHeight: '600px' }}
                    />
                  </CardContent>
                </Card>
              )}
              
              {/* Screen Share Feed */}
              {normalizedVideoChunks.filter(c => {
                // Use streamType field first, then fall back to URL
                return c.streamType === 'screenshare' || (!c.streamType && c.url?.includes('/screenshare/'));
              }).length > 0 && (
                <Card className="border-zinc-800 bg-zinc-950">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      Screen Share Recording
                      <span className="text-xs text-zinc-400 ml-2">
                        ({normalizedVideoChunks.filter(c => c.streamType === 'screenshare' || (!c.streamType && c.url?.includes('/screenshare/'))).length} chunks)
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <video
                      ref={screenshareVideoRef}
                      controls
                      className="w-full bg-black rounded-lg"
                      style={{ maxHeight: '600px' }}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* My Insights Tab - Simplified candidate-friendly view */}
      {activeTab === 'my-insights' && isCandidateView && agentInsights && (
        <div className="space-y-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">My Performance Insights</h2>
            <p className="text-zinc-400 text-sm">
              Here's how you used AI assistance and some tips for improvement
            </p>
          </div>

          {/* Prompt Behavior - How candidate used AI */}
          {agentInsights.extractor && (
            <Card className="border-zinc-800 bg-zinc-950">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-400" />
                  AI Assistance Usage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* AI Interaction Summary */}
                {aiInteractions && aiInteractions.length > 0 && (
                  <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-zinc-400 text-sm">Total AI Requests</span>
                      <span className="text-2xl font-bold text-white">{aiInteractions.length}</span>
                    </div>
                    <p className="text-zinc-500 text-xs mt-2">
                      You asked for AI help {aiInteractions.length} time{aiInteractions.length !== 1 ? 's' : ''} during this assessment
                    </p>
                  </div>
                )}

                {/* Prompt Patterns - Simplified */}
                {agentInsights.extractor.patterns?.promptPatterns && (
                  <div>
                    <h3 className="text-white font-semibold mb-3 text-sm">Prompt Patterns</h3>
                    <div className="space-y-2">
                      {typeof agentInsights.extractor.patterns.promptPatterns === 'object' ? (
                        Object.entries(agentInsights.extractor.patterns.promptPatterns).slice(0, 5).map(([key, value]: [string, any]) => (
                          <div key={key} className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                            <div className="text-zinc-300 text-sm">
                              <span className="text-zinc-400 capitalize">{key.replace(/_/g, ' ')}:</span>{' '}
                              <span className="text-white">{typeof value === 'object' ? JSON.stringify(value).substring(0, 50) + '...' : String(value)}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                          <p className="text-zinc-300 text-sm">{String(agentInsights.extractor.patterns.promptPatterns).substring(0, 200)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Behavior Score - Simplified */}
                {agentInsights.extractor.behaviorScore !== undefined && (
                  <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-zinc-400 text-sm">Code Quality Score</span>
                      <span className={`text-2xl font-bold ${
                        agentInsights.extractor.behaviorScore >= 70 ? 'text-emerald-400' :
                        agentInsights.extractor.behaviorScore >= 40 ? 'text-amber-400' :
                        'text-red-400'
                      }`}>
                        {agentInsights.extractor.behaviorScore}/100
                      </span>
                    </div>
                    <Progress 
                      value={agentInsights.extractor.behaviorScore} 
                      className={`h-2 ${
                        agentInsights.extractor.behaviorScore >= 70 ? 'bg-emerald-500/20' :
                        agentInsights.extractor.behaviorScore >= 40 ? 'bg-amber-500/20' :
                        'bg-red-500/20'
                      }`}
                    />
                    <p className="text-zinc-500 text-xs mt-2">
                      {agentInsights.extractor.behaviorScore >= 70 
                        ? 'Great job! Your code quality is excellent.'
                        : agentInsights.extractor.behaviorScore >= 40
                        ? 'Good effort! Consider reviewing best practices.'
                        : 'Keep practicing! Focus on code quality and structure.'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Minor Mistakes & Improvements */}
          {agentInsights.extractor && (
            <Card className="border-zinc-800 bg-zinc-950">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  Areas for Improvement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Code Quality Issues - Simplified */}
                {agentInsights.extractor.codeQuality && (
                  <div>
                    <h3 className="text-white font-semibold mb-3 text-sm">Code Quality</h3>
                    <div className="space-y-2">
                      {agentInsights.extractor.codeQuality.totalLines !== undefined && (
                        <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-400 text-sm">Lines of Code</span>
                            <span className="text-white font-semibold">{agentInsights.extractor.codeQuality.totalLines}</span>
                          </div>
                          {agentInsights.extractor.codeQuality.commentRatio !== undefined && (
                            <p className="text-zinc-500 text-xs mt-2">
                              Comment ratio: {Math.round(agentInsights.extractor.codeQuality.commentRatio * 100)}%
                              {agentInsights.extractor.codeQuality.commentRatio < 0.1 && (
                                <span className="text-amber-400 ml-2">💡 Tip: Add more comments to explain your code</span>
                              )}
                            </p>
                          )}
                        </div>
                      )}
                      {agentInsights.extractor.codeQuality.complexity && (
                        <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-400 text-sm">Code Complexity</span>
                            <span className={`font-semibold ${
                              agentInsights.extractor.codeQuality.complexity === 'high' ? 'text-amber-400' :
                              agentInsights.extractor.codeQuality.complexity === 'medium' ? 'text-blue-400' :
                              'text-emerald-400'
                            }`}>
                              {agentInsights.extractor.codeQuality.complexity?.toUpperCase() || 'N/A'}
                            </span>
                          </div>
                          {agentInsights.extractor.codeQuality.complexity === 'high' && (
                            <p className="text-zinc-500 text-xs mt-2">
                              💡 Tip: Consider breaking down complex functions into smaller, more manageable pieces
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Code Integration Issues - Simplified */}
                {agentInsights.extractor.codeIntegration && (
                  <div>
                    <h3 className="text-white font-semibold mb-3 text-sm">Code Integration</h3>
                    <div className="space-y-2">
                      {agentInsights.extractor.codeIntegration.modifications !== undefined && (
                        <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-400 text-sm">Code Modifications</span>
                            <span className="text-white font-semibold">{agentInsights.extractor.codeIntegration.modifications}</span>
                          </div>
                          {agentInsights.extractor.codeIntegration.integrationQuality && (
                            <p className="text-zinc-500 text-xs mt-2">
                              Integration quality: <span className={`${
                                agentInsights.extractor.codeIntegration.integrationQuality === 'good' ? 'text-emerald-400' :
                                agentInsights.extractor.codeIntegration.integrationQuality === 'fair' ? 'text-amber-400' :
                                'text-red-400'
                              }`}>
                                {agentInsights.extractor.codeIntegration.integrationQuality.toUpperCase()}
                              </span>
                              {agentInsights.extractor.codeIntegration.integrationQuality === 'poor' && (
                                <span className="text-amber-400 ml-2">💡 Tip: Make sure your code integrates well with the existing codebase</span>
                              )}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Copy-Paste Patterns - Educational */}
                {agentInsights.extractor.patterns?.copyPastePatterns && 
                 agentInsights.extractor.patterns.copyPastePatterns.length > 0 && (
                  <div>
                    <h3 className="text-white font-semibold mb-3 text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      Code Patterns Detected
                    </h3>
                    <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      <p className="text-amber-400 text-sm font-semibold mb-2">
                        {agentInsights.extractor.patterns.copyPastePatterns.length} pattern{agentInsights.extractor.patterns.copyPastePatterns.length !== 1 ? 's' : ''} detected
                      </p>
                      <p className="text-zinc-300 text-sm">
                        💡 Tip: While copying code can be helpful for learning, try to understand and modify it to fit your specific needs. 
                        Writing code from scratch helps build deeper understanding.
                      </p>
                    </div>
                  </div>
                )}

                {/* General Feedback */}
                {agentInsights.extractor.explanation && (
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <h3 className="text-blue-400 font-semibold mb-2 text-sm">Feedback</h3>
                    <p className="text-zinc-300 text-sm">{agentInsights.extractor.explanation}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Skills Detected - Positive reinforcement */}
          {agentInsights.extractor?.skills && Object.keys(agentInsights.extractor.skills).length > 0 && (
            <Card className="border-zinc-800 bg-zinc-950">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                  Skills Demonstrated
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(agentInsights.extractor.skills).slice(0, 10).map(([skill, level]: [string, any]) => (
                    <Badge key={skill} className="bg-emerald-500/20 text-emerald-400">
                      {skill}: {level}
                    </Badge>
                  ))}
                </div>
                <p className="text-zinc-500 text-xs mt-3">
                  Great job demonstrating these skills! Keep practicing to improve further.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
