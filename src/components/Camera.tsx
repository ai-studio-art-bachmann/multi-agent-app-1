import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { getTranslations } from '@/utils/translations';
import { Download, RotateCcw, RefreshCw, Camera as CameraIcon, ZoomIn, ZoomOut } from 'lucide-react';
import { getCurrentOrientation, addOrientationChangeListener, adjustVideoStyle, adjustContainerStyle, Orientation, CameraFacing, toggleCameraFacing, getCameraConstraints, setZoomLevel } from '@/utils/orientationUtils';

interface CameraProps {
  webhookUrl: string;
  language: 'fi' | 'et' | 'en';
}

export const Camera: React.FC<CameraProps> = ({ webhookUrl, language }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [photoTaken, setPhotoTaken] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [orientation, setOrientation] = useState<Orientation>(getCurrentOrientation());
  const [cameraFacing, setCameraFacing] = useState<CameraFacing>('environment');
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [zoomLevel, setZoomLevelState] = useState<number>(1.0);
  const [isZoomSupported, setIsZoomSupported] = useState<boolean>(false);
  const streamRef = useRef<MediaStream | null>(null);
  const t = getTranslations(language);

  const startCamera = useCallback(async (facing?: CameraFacing) => {
    try {
      // Kui kaamera on juba käivitatud, peatame selle enne uue käivitamist
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // Kui facing on määratud, kasutame seda, muidu kasutame olemasolevat väärtust
      const newFacing = facing || cameraFacing;
      setCameraFacing(newFacing);
      
      // Märgime, et kaamera vahetamine on käimas
      if (facing) {
        setIsSwitchingCamera(true);
      }
      
      // Kasuta orientatsioonipõhiseid piiranguid
      const currentOrientation = getCurrentOrientation();
      setOrientation(currentOrientation);
      
      // Loo kaamera piirangud vastavalt orientatsioonile, kaamera tüübile ja zoom tasemele
      const constraints = getCameraConstraints(currentOrientation, newFacing, zoomLevel);
      
      console.log('Starting camera with orientation:', currentOrientation, 'facing:', newFacing, 'zoom:', zoomLevel, 'constraints:', constraints);
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      // Kontrollime, kas kaamera toetab zoom funktsiooni
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities();
        const isZoomAvailable = !!capabilities.zoom;
        setIsZoomSupported(isZoomAvailable);
        
        console.log('Camera zoom supported:', isZoomAvailable, isZoomAvailable ? `(min: ${capabilities.zoom.min}, max: ${capabilities.zoom.max})` : '');
        
        // Kui zoom on toetatud, seadistame selle
        if (isZoomAvailable && zoomLevel !== 1.0) {
          try {
            const zoomSuccess = setZoomLevel(stream, zoomLevel);
            console.log('Initial zoom level set:', zoomSuccess ? 'success' : 'failed');
          } catch (e) {
            console.warn('Failed to set initial zoom level:', e);
          }
        }
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Kohandame video stiili vastavalt orientatsioonile
        adjustVideoStyle(videoRef.current, currentOrientation);
        
        // Ootame, et video laadiks
        videoRef.current.onloadedmetadata = () => {
          console.log('Video loaded, dimensions:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight);
          if (videoRef.current) {
            adjustVideoStyle(videoRef.current, currentOrientation);
          }
          
          if (containerRef.current) {
            adjustContainerStyle(containerRef.current, currentOrientation);
          }
          
          // Lõpetame kaamera vahetamise oleku
          setIsSwitchingCamera(false);
        };
        
        setIsCameraOn(true);
      }
    } catch (err) {
      console.error("Error accessing the camera:", err);
      toast({
        title: t.cameraError || "Camera Error",
        description: t.cameraPermissionDenied || "Could not access the camera. Please grant permission.",
        variant: "destructive"
      });
      setIsSwitchingCamera(false);
    }
  }, [t, cameraFacing, zoomLevel]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsCameraOn(false);
  }, []);

  const takePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Määrame lõuendi mõõtmed vastavalt video mõõtmetele
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      console.log('Taking photo with dimensions:', canvas.width, 'x', canvas.height, 'orientation:', orientation);
      
      // Joonistame video kaadri lõuendile
      const context = canvas.getContext('2d');
      if (context) {
        // Pöörame lõuendit vastavalt orientatsioonile, kui vaja
        if (orientation === 'landscape') {
          // Horisontaalne asend - joonistame otse
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
        } else {
          // Vertikaalne asend - joonistame otse
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
        
        // Saame andme-URL-i, mis esindab pilti
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95); // Kõrgem kvaliteet
        setPhotoTaken(dataUrl);
        stopCamera();
      }
    }
  }, [stopCamera, orientation]);

  const resetPhoto = useCallback(() => {
    setPhotoTaken(null);
  }, []);
  
  // Function to save photo to device gallery
  const savePhotoToGallery = useCallback(async () => {
    if (!photoTaken) return;
    
    try {
      // For mobile devices, we need to create a temporary anchor element
      const link = document.createElement('a');
      
      // Set download attribute with filename
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const filename = `tyokaveri_photo_${timestamp}.jpg`;
      link.download = filename;
      
      // Set href to the photo data URL
      link.href = photoTaken;
      
      // Append to document, click programmatically, then remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: t.photoSaved || "Photo saved",
        description: t.photoSavedSuccess || "Photo was saved to your device",
      });
    } catch (error) {
      console.error('Error saving photo:', error);
      toast({
        title: t.saveError || "Save Error",
        description: error instanceof Error ? error.message : t.unknownError || "Unknown error",
        variant: "destructive",
      });
    }
  }, [photoTaken, t]);

  const uploadPhoto = useCallback(async () => {
    if (!photoTaken) return;
    
    setIsUploading(true);
    
    try {
      // Convert data URL to blob
      const response = await fetch(photoTaken);
      const blob = await response.blob();
      
      // Create file name with current timestamp
      const filename = `photo_${new Date().toISOString().replace(/:/g, '-')}.jpg`;
      
      // Create form data
      const formData = new FormData();
      formData.append('file', blob, filename);
      formData.append('filename', filename);
      formData.append('filetype', 'image/jpeg');
      formData.append('source', 'camera');
      
      // Send to webhook
      const uploadResponse = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
        mode: 'cors',
        headers: {
          'Accept': 'application/json,*/*'
        }
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Server responded with ${uploadResponse.status}`);
      }
      
      // Handle the response
      const data = await uploadResponse.json();
      console.log('Photo upload response:', data);
      
      toast({
        title: t.photoSent || "Photo uploaded",
        description: t.photoSentSuccess || "Photo was uploaded successfully",
      });
      
      // Reset photo
      setPhotoTaken(null);
      
    } catch (error) {
      console.error('Photo upload error:', error);
      toast({
        title: t.uploadError || "Upload Error",
        description: error instanceof Error ? error.message : t.unknownError || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [photoTaken, webhookUrl, t]);

  // Jälgi ekraani orientatsiooni muutusi
  useEffect(() => {
    // Esialgne orientatsiooni seadistamine
    setOrientation(getCurrentOrientation());
    
    // Lisa kuulaja orientatsiooni muutustele
    const removeListener = addOrientationChangeListener((newOrientation) => {
      console.log('Orientation changed to:', newOrientation);
      setOrientation(newOrientation);
      
      // Kohandame video ja konteineri stiili
      if (videoRef.current && isCameraOn) {
        adjustVideoStyle(videoRef.current, newOrientation);
      }
      
      if (containerRef.current) {
        adjustContainerStyle(containerRef.current, newOrientation);
      }
    });
    
    // Puhastame kuulaja komponendi eemaldamisel
    return () => {
      removeListener();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraOn]);
  
  // Kohandame video ja konteineri stiili, kui kaamera on sisse lülitatud või orientatsioon muutub
  useEffect(() => {
    if (videoRef.current && isCameraOn) {
      adjustVideoStyle(videoRef.current, orientation);
    }
    
    if (containerRef.current) {
      adjustContainerStyle(containerRef.current, orientation);
    }
  }, [orientation, isCameraOn]);

  // Funktsioon kaamerate vahetamiseks
  const switchCamera = useCallback((e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    
    if (isCameraOn && !isSwitchingCamera) {
      const newFacing = toggleCameraFacing(cameraFacing);
      console.log('Switching camera from', cameraFacing, 'to', newFacing);
      startCamera(newFacing);
    }
  }, [cameraFacing, isCameraOn, isSwitchingCamera, startCamera]);
  
  // Funktsioon zoom taseme muutmiseks
  const changeZoomLevel = useCallback((newZoomLevel: number) => {
    if (!isZoomSupported || !streamRef.current) return;
    
    console.log('Changing zoom level to:', newZoomLevel);
    setZoomLevelState(newZoomLevel);
    
    // Rakendame zoom taseme otse kaamera voole
    try {
      const zoomSuccess = setZoomLevel(streamRef.current, newZoomLevel);
      console.log('Zoom level change result:', zoomSuccess ? 'success' : 'failed');
      if (!zoomSuccess) {
        console.warn('Failed to set zoom level, camera may not support this feature');
      }
    } catch (error) {
      console.error('Error setting zoom level:', error);
    }
  }, [isZoomSupported]);
  
  // Funktsioon zoom suurendamiseks
  const zoomIn = useCallback(() => {
    if (!isZoomSupported) return;
    changeZoomLevel(zoomLevel + 0.5);
  }, [isZoomSupported, zoomLevel, changeZoomLevel]);
  
  // Funktsioon zoom vähendamiseks
  const zoomOut = useCallback(() => {
    if (!isZoomSupported) return;
    changeZoomLevel(Math.max(1.0, zoomLevel - 0.5));
  }, [isZoomSupported, zoomLevel, changeZoomLevel]);

  return (
    <div className="flex flex-col items-center space-y-3">
      {!photoTaken ? (
        <div 
          ref={containerRef}
          className={`relative w-full bg-black rounded-lg overflow-hidden transition-all duration-300 ${orientation === 'landscape' ? 'h-48 sm:h-56' : 'h-40 sm:h-48'}`}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full ${isCameraOn ? 'block' : 'hidden'}`}
          />
          {!isCameraOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <div className="w-20 h-20 bg-gray-600 rounded-lg flex items-center justify-center">
                <CameraIcon size={40} color="#d1d5db" />
              </div>
            </div>
          )}
          
          {/* Orientatsiooni indikaator */}
          {isCameraOn && (
            <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
              {orientation === 'landscape' ? 'Horisontaalne' : 'Vertikaalne'}
            </div>
          )}
          
          {/* Kaamera vahetamise nupp */}
          {isCameraOn && (
            <button 
              onClick={(e) => switchCamera(e)}
              disabled={isSwitchingCamera}
              className="absolute bottom-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
              aria-label="Vaheta kaamerat"
            >
              <RefreshCw size={20} className={isSwitchingCamera ? 'animate-spin' : ''} />
            </button>
          )}
          
          {/* Zoom juhtnupud */}
          {isCameraOn && isZoomSupported && (
            <div className="absolute bottom-2 left-2 flex space-x-2">
              <button
                onClick={() => zoomOut()}
                className="bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                aria-label="Vähenda zoom"
                disabled={zoomLevel <= 1.0}
              >
                <ZoomOut size={20} />
              </button>
              
              <div className="bg-black/50 text-white px-2 flex items-center justify-center rounded-full">
                <span className="text-xs">{zoomLevel.toFixed(1)}x</span>
              </div>
              
              <button
                onClick={() => zoomIn()}
                className="bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                aria-label="Suurenda zoom"
              >
                <ZoomIn size={20} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="relative w-full h-32 sm:h-40 bg-gray-100 rounded-lg overflow-hidden">
          <img 
            src={photoTaken} 
            alt="Captured" 
            className="w-full h-full object-contain" 
          />
        </div>
      )}
      
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="flex flex-wrap gap-2 justify-center">
        {!isCameraOn && !photoTaken && (
          <Button onClick={() => startCamera()} className="bg-blue-500 hover:bg-blue-600" type="button">
            {t.startCamera || "Start Camera"}
          </Button>
        )}
        
        {isCameraOn && !photoTaken && (
          <>
            <Button onClick={() => takePhoto()} className="bg-red-500 hover:bg-red-600" type="button">
              {t.takePhoto || "Take Photo"}
            </Button>
            <Button onClick={() => stopCamera()} variant="outline" type="button">
              {t.stopCamera || "Stop Camera"}
            </Button>
          </>
        )}
        
        {photoTaken && (
          <>
            <Button 
              onClick={() => uploadPhoto()} 
              disabled={isUploading}
              className="bg-green-500 hover:bg-green-600"
              type="button"
            >
              {isUploading ? 
                (t.uploading || "Uploading...") : 
                (t.sendPhoto || "Send Photo")
              }
            </Button>
            <Button 
              onClick={() => savePhotoToGallery()} 
              variant="secondary" 
              disabled={isUploading} 
              type="button"
              className="flex items-center gap-1"
            >
              <Download size={16} />
              {t.saveToGallery || "Save to Gallery"}
            </Button>
            <Button 
              onClick={() => resetPhoto()} 
              variant="outline" 
              disabled={isUploading} 
              type="button"
            >
              {t.retakePhoto || "Retake"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
