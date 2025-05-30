/**
 * Utiliidid seadme orientatsiooni jälgimiseks ja kaamera vaate kohandamiseks
 */

// Orientatsiooni tüübid
export type Orientation = 'portrait' | 'landscape';

// Laiendame MediaTrackCapabilities tüüpi zoom toetuse jaoks
declare global {
  interface MediaTrackCapabilities {
    zoom?: {
      min: number;
      max: number;
      step: number;
    };
  }
}

/**
 * Funktsioon praeguse seadme orientatsiooni tuvastamiseks
 * @returns Praegune orientatsioon ('portrait' või 'landscape')
 */
export const getCurrentOrientation = (): Orientation => {
  // Kasuta window.matchMedia API-d, et tuvastada orientatsioon
  return window.matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape';
};

/**
 * Hook seadme orientatsiooni jälgimiseks
 * @param callback Funktsioon, mida kutsutakse orientatsiooni muutumisel
 * @returns Funktsioon kuulaja eemaldamiseks
 */
export const addOrientationChangeListener = (callback: (orientation: Orientation) => void): () => void => {
  const handleOrientationChange = () => {
    callback(getCurrentOrientation());
  };
  
  // Lisa kuulaja orientatsiooni muutuse jaoks
  window.addEventListener('orientationchange', handleOrientationChange);
  
  // Lisa ka resize kuulaja, kuna mõned seadmed ei käivita orientationchange sündmust
  window.addEventListener('resize', handleOrientationChange);
  
  // Tagasta funktsioon kuulajate eemaldamiseks
  return () => {
    window.removeEventListener('orientationchange', handleOrientationChange);
    window.removeEventListener('resize', handleOrientationChange);
  };
};

/**
 * Kaamera tüübid
 */
export type CameraFacing = 'environment' | 'user';

/**
 * Funktsioon optimaalsete kaamera piirangute saamiseks vastavalt orientatsioonile, kaamera tüübile ja zoom tasemele
 * @param orientation Seadme orientatsioon
 * @param facing Kaamera tüüp (environment = tagakaamera, user = esikaamera)
 * @param zoomLevel Zoom tase (1.0 = tavaline, suurem väärtus = lähemale suumitud)
 * @returns Kaamera piirangud MediaStreamConstraints objektina
 */
export const getCameraConstraints = (
  orientation: Orientation, 
  facing: CameraFacing = 'environment',
  zoomLevel: number = 1.0
): MediaStreamConstraints => {
  // Põhipiirangud
  const constraints: MediaStreamConstraints = {
    video: {
      facingMode: facing,
      width: { ideal: orientation === 'landscape' ? 1920 : 1080 },
      height: { ideal: orientation === 'landscape' ? 1080 : 1920 },
      // Lisame advanced piirangud, kui need on toetatud
      advanced: [{
        zoom: zoomLevel
      }]
    },
    audio: false
  };
  
  return constraints;
};

/**
 * Funktsioon kaamera zoom taseme seadistamiseks
 * @param stream Kaamera voog
 * @param zoomLevel Zoom tase (1.0 = tavaline, suurem väärtus = lähemale suumitud)
 * @returns Kas zoom taseme seadistamine õnnestus
 */
export const setZoomLevel = (stream: MediaStream | null, zoomLevel: number): boolean => {
  if (!stream) return false;
  
  try {
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return false;
    
    const capabilities = videoTrack.getCapabilities();
    
    // Kontrollime, kas kaamera toetab zoom funktsiooni
    if (!capabilities.zoom) return false;
    
    // Piirame zoom taseme min ja max väärtuste vahele
    const clampedZoom = Math.max(
      capabilities.zoom.min || 1.0,
      Math.min(zoomLevel, capabilities.zoom.max || 10.0)
    );
    
    // Seadistame zoom taseme
    const constraints = { advanced: [{ zoom: clampedZoom }] };
    videoTrack.applyConstraints(constraints);
    
    console.log(`Zoom level set to ${clampedZoom}`);
    return true;
  } catch (error) {
    console.error('Error setting zoom level:', error);
    return false;
  }
};

/**
 * Funktsioon kaamera tüübi vahetamiseks
 * @param currentFacing Praegune kaamera tüüp
 * @returns Uus kaamera tüüp
 */
export const toggleCameraFacing = (currentFacing: CameraFacing): CameraFacing => {
  return currentFacing === 'environment' ? 'user' : 'environment';
};

/**
 * Funktsioon video elemendi stiili kohandamiseks vastavalt orientatsioonile
 * @param videoElement Video element, mida kohandada
 * @param orientation Praegune orientatsioon
 */
export const adjustVideoStyle = (videoElement: HTMLVideoElement, orientation: Orientation): void => {
  if (!videoElement) return;
  
  if (orientation === 'landscape') {
    // Horisontaalne asend
    videoElement.style.width = '100%';
    videoElement.style.height = 'auto';
    videoElement.style.maxHeight = '100%';
    videoElement.style.objectFit = 'contain';
  } else {
    // Vertikaalne asend
    videoElement.style.width = 'auto';
    videoElement.style.height = '100%';
    videoElement.style.maxWidth = '100%';
    videoElement.style.objectFit = 'contain';
  }
};

/**
 * Funktsioon kaamera konteineri stiili kohandamiseks vastavalt orientatsioonile
 * @param containerElement Konteineri element, mida kohandada
 * @param orientation Praegune orientatsioon
 */
export const adjustContainerStyle = (containerElement: HTMLElement, orientation: Orientation): void => {
  if (!containerElement) return;
  
  if (orientation === 'landscape') {
    // Horisontaalne asend - suurem kõrgus
    containerElement.style.height = '50vh';
    containerElement.style.maxHeight = '300px';
  } else {
    // Vertikaalne asend - standardne kõrgus
    containerElement.style.height = '40vh';
    containerElement.style.maxHeight = '250px';
  }
};
