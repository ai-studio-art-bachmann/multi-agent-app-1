import { useRef, useState, useCallback, useEffect } from 'react';

export interface CameraHookReturn {
  isOpen: boolean;
  isOpening: boolean;
  error: string | null;
  open: () => Promise<void>;
  capture: () => Promise<Blob | null>;
  close: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  streamRef: React.RefObject<MediaStream | null>;
}

export const useCamera = (): CameraHookReturn => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback(async () => {
    if (isOpening || isOpen) {
      console.log('[useCamera] Open called while already opening or open.');
      return;
    }
    console.log('[useCamera] Attempting to open camera...');
    setIsOpening(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        const videoElement = videoRef.current;
        videoElement.srcObject = stream;
        console.log('[useCamera] Stream assigned to video element.');
        
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            console.error('[useCamera] videoRef became null before open promise setup');
            return reject(new Error('Videoref muutus nulliksi ennen lupauksen alustusta'));
          }

          const onLoadedMetadata = () => {
            videoElement.removeEventListener('loadedmetadata', onLoadedMetadata);
            videoElement.removeEventListener('error', onVideoError);
            
            console.log(`[useCamera] onLoadedMetadata fired. Initial check: W: ${videoElement.videoWidth}, H: ${videoElement.videoHeight}, RS: ${videoElement.readyState}`);

            const attemptPlayAndFinalCheck = async (isRetry: boolean) => {
              const logPrefix = `[useCamera ${isRetry ? 'Retry' : 'Initial'}]`;
              if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0 && videoElement.readyState >= videoElement.HAVE_METADATA) {
                console.log(`${logPrefix} Dimensions and readyState look good before play(). Attempting play...`);
                try {
                  await videoElement.play();
                  console.log(`${logPrefix} video.play() attempted.`);
                } catch (playError) {
                  console.warn(`${logPrefix} video.play() rejected. Error: ${playError instanceof Error ? playError.message : String(playError)}`);
                }

                if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0 && videoElement.readyState >= videoElement.HAVE_METADATA) {
                  console.log(`${logPrefix} Final check PASSED. W: ${videoElement.videoWidth}, H: ${videoElement.videoHeight}, RS: ${videoElement.readyState}. Resolving open().`);
                  resolve();
                  return true;
                } else {
                  console.warn(`${logPrefix} Final check FAILED after play attempt. W: ${videoElement.videoWidth}, H: ${videoElement.videoHeight}, RS: ${videoElement.readyState}`);
                  return false;
                }
              } else {
                console.warn(`${logPrefix} Pre-play check FAILED. W: ${videoElement.videoWidth}, H: ${videoElement.videoHeight}, RS: ${videoElement.readyState}`);
                return false;
              }
            };

            attemptPlayAndFinalCheck(false).then(success => {
              if (success) return;

              console.log('[useCamera] Initial attempt to ready video failed, will retry once after 150ms...');
              setTimeout(() => {
                if (!videoRef.current) {
                    console.error('[useCamera] videoRef became null before retry attempt');
                    reject(new Error('Videoref muutus nulliksi ennen uusintayritystä'));
                    return;
                }
                attemptPlayAndFinalCheck(true).then(retrySuccess => {
                  if (retrySuccess) return;
                  
                  console.error('[useCamera] All attempts to ready video failed within open(). Rejecting open().');
                  reject(new Error('Videon valmistelu epäonnistui useista yrityksistä huolimatta (open-funktiossa).'));
                });
              }, 150);
            });
          };

          const onVideoError = (e: Event) => {
            videoElement.removeEventListener('loadedmetadata', onLoadedMetadata);
            videoElement.removeEventListener('error', onVideoError);
            console.error('[useCamera] Video element error during loading:', e);
            reject(new Error('Videolaadimise viga (video element error)'));
          };

          videoElement.addEventListener('loadedmetadata', onLoadedMetadata);
          videoElement.addEventListener('error', onVideoError);
        });
      }
      setIsOpen(true);
      console.log('[useCamera] Camera opened successfully.');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Kameran avaus epäonnistui';
      console.error('[useCamera] Error opening camera:', errorMessage, err);
      setError(errorMessage);
    } finally {
      setIsOpening(false);
    }
  }, [isOpen, isOpening]);

  const capture = useCallback(async (): Promise<Blob | null> => {
    console.log('[useCamera] Attempting to capture photo...');
    if (!videoRef.current) {
      console.error('[useCamera] Capture failed: videoRef is null.');
      setError('Kamera video elementti puuttuu');
      return null;
    }
    if (!isOpen || !streamRef.current || !streamRef.current.active) {
      console.error('[useCamera] Capture failed: Camera is not open, stream is not active or null.', {isOpen, streamActive: streamRef.current?.active});
      setError('Kamera ei ole avoinna tai stream ei ole aktiivinen.');
      return null;
    }
    
    const video = videoRef.current;
    const stream = streamRef.current;

    if (video.readyState < video.HAVE_METADATA || video.videoWidth === 0 || video.videoHeight === 0) {
      console.warn('[useCamera] Capture: Video not immediately ready. Attempting to re-prime.');
      console.log(`[useCamera] Capture/Re-prime: Initial state - RS: ${video.readyState}, Dim: ${video.videoWidth}x${video.videoHeight}, Stream Active: ${stream.active}`);
      
      if (stream.active) {
        video.srcObject = stream;
        try {
          await video.play();
          console.log('[useCamera] Capture/Re-prime: video.play() attempted.');
        } catch (e) {
          console.warn('[useCamera] Capture/Re-prime: video.play() failed during re-prime:', e);
        }
        await new Promise(r => setTimeout(r, 100)); 
        console.log(`[useCamera] Capture/Re-prime: State after re-prime attempt - RS: ${video.readyState}, Dim: ${video.videoWidth}x${video.videoHeight}`);
      } else {
        console.warn('[useCamera] Capture/Re-prime: Stream is not active, cannot re-prime effectively.');
      }
    }

    const MAX_READY_ATTEMPTS = 5;
    const READY_ATTEMPT_DELAY = 200; // 200ms delay per attempt

    for (let i = 0; i < MAX_READY_ATTEMPTS; i++) {
        if (video.readyState >= video.HAVE_METADATA && video.videoWidth > 0 && video.videoHeight > 0) {
            console.log(`[useCamera] Video ready for capture on attempt ${i + 1}. State: ${video.readyState}, Dimensions: ${video.videoWidth}x${video.videoHeight}`);
            break; // Ready
        }
        console.warn(`[useCamera] Attempt ${i + 1}/${MAX_READY_ATTEMPTS}: Video not fully ready (readyState: ${video.readyState}, dimensions: ${video.videoWidth}x${video.videoHeight}). Waiting ${READY_ATTEMPT_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, READY_ATTEMPT_DELAY));
    }

    if (video.readyState < video.HAVE_METADATA) {
        console.error(`[useCamera] Capture failed: Video metadata not loaded after ${MAX_READY_ATTEMPTS} attempts. Final state: ${video.readyState}`);
        setError('Videon metadata ei latautunut useista yrityksistä huolimatta.');
        return null;
    }
    if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.error(`[useCamera] Capture failed: Video dimensions are zero after ${MAX_READY_ATTEMPTS} attempts. Final dimensions: ${video.videoWidth}x${video.videoHeight}`);
        setError('Videon mitat pysyivät nollana useista yrityksistä huolimatta.');
        return null;
    }

    console.log(`[useCamera] Proceeding with capture. Final state: ${video.readyState}, Dimensions: ${video.videoWidth}x${video.videoHeight}`);

    try {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        console.error('[useCamera] Capture failed: Canvas 2D context not available.');
        setError('Canvas-konteksti ei ole käytettävissä');
        return null;
      }

      const maxWidth = 1280;
      let width = video.videoWidth;
      let height = video.videoHeight;
      
      if (width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height = height * ratio;
        console.log(`[useCamera] Resizing image to ${width}x${height}`);
      }

      canvas.width = width;
      canvas.height = height;
      
      console.log('[useCamera] Drawing image to canvas...');
      context.drawImage(video, 0, 0, width, height);
      
      return new Promise<Blob | null>((resolve) => {
        console.log('[useCamera] Converting canvas to Blob...');
        canvas.toBlob((blob) => {
          if (blob) {
            console.log('[useCamera] Blob created successfully, size:', blob.size);
            resolve(blob);
          } else {
            console.error('[useCamera] Failed to create blob from canvas.');
            setError('Canvasista ei saatu luotua kuvatiedostoa (blob).');
            resolve(null); 
          }
        }, 'image/jpeg', 0.9);
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Kuvan ottaminen epäonnistui sisäinen virhe';
      console.error('[useCamera] Error during capture process:', errorMessage, err);
      setError(errorMessage);
      return null;
    }
  }, [isOpen]);

  const close = useCallback(() => {
    console.log('[useCamera] Closing camera...');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        console.log(`[useCamera] Stopping track: ${track.label}`);
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      console.log('[useCamera] srcObject set to null for video element.');
    }
    setIsOpen(false);
    setIsOpening(false);
    setError(null); 
    console.log('[useCamera] Camera closed.');
  }, []);

  useEffect(() => {
    return () => {
      console.log('[useCamera] Cleanup effect triggered for useCamera.');
      close();
    };
  }, [close]);

  return {
    isOpen,
    isOpening,
    error,
    open,
    capture,
    close,
    videoRef,
    streamRef 
  };
}; 