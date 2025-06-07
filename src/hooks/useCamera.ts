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

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const msg = 'Kamera-API ei ole käytettävissä selaimessasi.';
      console.error(`[useCamera] ${msg}`);
      setError(msg);
      setIsOpening(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      streamRef.current = stream;
      const videoElement = videoRef.current;

      if (videoElement) {
        videoElement.srcObject = stream;
        videoElement.muted = true;
        videoElement.playsInline = true;
        
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            cleanupEvents();
            reject(new Error('Kameran käynnistys aikakatkaistiin (10s).'));
          }, 10000);

          const onPlaying = () => {
            if (videoElement.videoWidth > 0) {
              console.log('[useCamera] Video stream confirmed playing with dimensions.');
              cleanupEvents();
              resolve();
            } else {
              console.warn('[useCamera] "playing" event fired but videoWidth is 0. Waiting for dimensions...');
            }
          };

          const onVideoError = (e: Event) => {
            cleanupEvents();
            console.error('[useCamera] Video element error:', e);
            reject(new Error('Videoelementin virhe.'));
          };
          
          const onCanPlay = () => {
            videoElement.play().catch(err => {
              console.warn(`[useCamera] Play command was rejected, but this is often recoverable. Error: ${err.message}`);
              // Relying on the 'playing' event to resolve.
            });
          };

          const cleanupEvents = () => {
            videoElement.removeEventListener('playing', onPlaying);
            videoElement.removeEventListener('error', onVideoError);
            videoElement.removeEventListener('canplay', onCanPlay);
          };

          videoElement.addEventListener('playing', onPlaying);
          videoElement.addEventListener('error', onVideoError);
          videoElement.addEventListener('canplay', onCanPlay);
        });
      }
      
      setIsOpen(true);
      console.log('[useCamera] Camera opened successfully.');

    } catch (err) {
      console.error('[useCamera] Full error opening camera:', err);

      let userMessage = 'Kameran käynnistys epäonnistui.';
      
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          userMessage = 'Kameran käyttöoikeus evättiin. Salli kameran käyttö selaimen osoiteriviltä ja päivitä sivu.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          userMessage = 'Yhtään kameraa ei löytynyt. Varmista, että laitteessasi on toimiva kamera.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          userMessage = 'Kameraa ei voitu lukea. Se voi olla toisen sovelluksen käytössä tai käyttöjärjestelmän tasolla estetty.';
        } else {
            userMessage = `Kameravirhe: ${err.message} (Tyyppi: ${err.name})`;
        }
      } else if (err instanceof Error) {
        userMessage = `Yleinen kameravirhe: ${err.message}`;
      }

      setError(userMessage);
      setIsOpening(false);
      throw new Error(userMessage);
    }
  }, [isOpen, isOpening]);

  const capture = useCallback(async (): Promise<Blob | null> => {
    if (!videoRef.current || !streamRef.current?.active) {
      setError('Kamera ei ole valmis tai yhteys on katkennut.');
      console.error('[useCamera] Capture failed: Camera not ready or stream inactive.');
      return null;
    }
  
    const video = videoRef.current;
  
    // Add a retry mechanism to ensure video is ready.
    const MAX_ATTEMPTS = 5;
    const ATTEMPT_DELAY = 100; // ms
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      if (video.readyState >= video.HAVE_METADATA && video.videoWidth > 0 && video.videoHeight > 0) {
        console.log(`[useCamera] Video is ready for capture on attempt ${i + 1}.`);
        break; // Video is ready
      }
      console.warn(`[useCamera] Video not ready on attempt ${i + 1}. Waiting ${ATTEMPT_DELAY}ms...`);
      await new Promise(resolve => setTimeout(resolve, ATTEMPT_DELAY));
    }
  
    if (video.readyState < video.HAVE_METADATA || video.videoWidth === 0) {
      setError('Videokuvaa ei voitu käsitellä. Yritä uudelleen.');
      console.error(`[useCamera] Capture failed after all attempts: Video not ready (readyState: ${video.readyState}, width: ${video.videoWidth})`);
      return null;
    }
  
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Canvas 2D context not available.');
      }
      
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      return new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            setError('Kuvan luominen epäonnistui (toBlob returnoi null).');
            resolve(null); 
          }
        }, 'image/jpeg', 0.92);
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Kuvan ottamisessa tapahtui tuntematon virhe.';
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