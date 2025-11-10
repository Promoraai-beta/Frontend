export class RecordingManager {
  private mediaRecorder: MediaRecorder | null = null;
  private screenStream: MediaStream | null = null;
  private webcamStream: MediaStream | null = null;

  async requestPermissions(): Promise<{
    screenStream: MediaStream;
    webcamStream: MediaStream;
  }> {
    // Request screen sharing permission (entire screen)
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: 'monitor',
        frameRate: 10
      },
      audio: true
    });

    // Ensure only one video track (prevent multiple monitors)
    const videoTracks = screenStream.getVideoTracks();
    if (videoTracks.length > 1) {
      // Stop extra tracks if multiple monitors selected
      for (let i = 1; i < videoTracks.length; i++) {
        videoTracks[i].stop();
      }
    }

    // Request webcam permission
    const webcamStream = await navigator.mediaDevices.getUserMedia({
      video: { 
        width: 640, 
        height: 480,
        frameRate: 10
      },
      audio: true
    });

    this.screenStream = screenStream;
    this.webcamStream = webcamStream;

    return { screenStream, webcamStream };
  }

  startRecording(screenStream: MediaStream, webcamStream: MediaStream, onDataAvailable: (data: Blob) => void): void {
    // Combine both streams into one
    const combinedStream = new MediaStream();
    
    // Add screen video track (primary video)
    screenStream.getVideoTracks().forEach(track => {
      combinedStream.addTrack(track);
    });
    
    // Add audio tracks from both streams
    screenStream.getAudioTracks().forEach(track => {
      combinedStream.addTrack(track);
    });
    
    webcamStream.getAudioTracks().forEach(track => {
      combinedStream.addTrack(track);
    });
    
    const mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType: 'video/webm;codecs=vp8',
      videoBitsPerSecond: 2000000
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        onDataAvailable(event.data);
      }
    };

    this.mediaRecorder = mediaRecorder;
    
    // Record in 10-second chunks
    mediaRecorder.start(10000);
  }

  stopRecording(): void {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }

    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }

    if (this.webcamStream) {
      this.webcamStream.getTracks().forEach(track => track.stop());
      this.webcamStream = null;
    }
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }
}

