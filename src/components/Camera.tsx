import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { getTranslations } from '@/utils/translations';
import { Download, RotateCcw, RefreshCw, Camera as CameraIcon, ZoomIn, ZoomOut, Mic } from 'lucide-react';
import { getCurrentOrientation, addOrientationChangeListener, adjustVideoStyle, adjustContainerStyle, Orientation, CameraFacing, toggleCameraFacing, getCameraConstraints, setZoomLevel } from '@/utils/orientationUtils';

interface CameraProps {
  webhookUrl: string;
  language: 'fi' | 'et' | 'en';
}

// Declare SpeechRecognition types globally for broader compatibility
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export const Camera: React.FC<CameraProps> = ({ webhookUrl, language }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [photoTaken, setPhotoTaken] = useState<string | null>(null); // Data URL for display
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null); // Blob for upload/save
  const [isUploading, setIsUploading] = useState(false);
  const [orientation, setOrientation] = useState<Orientation>(getCurrentOrientation());
  const [cameraFacing, setCameraFacing] = useState<CameraFacing>('environment');
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [zoomLevel, setZoomLevelState] = useState<number>(1.0);
  const [isZoomSupported, setIsZoomSupported] = useState<boolean>(false);
  const streamRef = useRef<MediaStream | null>(null);
  const t = getTranslations(language);

  // State for file naming by voice
  const [isNamingFile, setIsNamingFile] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [isDictatingName, setIsDictatingName] = useState(false);
  const [dictatedNameText, setDictatedNameText] = useState<string | null>(null);
  const [nameProcessingError, setNameProcessingError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const generateDefaultFileName = () => `tyokalu_${new Date().toISOString().replace(/:/g, '-')}.jpg`;

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      console.error('Speech Recognition API not supported.');
      // Optionally, inform user via toast if this is critical for naming
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language === 'fi' ? 'fi-FI' : language === 'et' ? 'et-EE' : 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setDictatedNameText(transcript);
      processTranscriptToFileName(transcript);
      setIsDictatingName(false);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setNameProcessingError(event.error === 'no-speech' ? t.noSpeechDetected : t.recognitionError);
      setIsDictatingName(false);
    };

    recognition.onstart = () => {
      setIsDictatingName(true);
      setNameProcessingError(null);
      setDictatedNameText(null);
    };

    recognition.onend = () => {
      setIsDictatingName(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [language]);

  const processTranscriptToFileName = useCallback((text: string) => {
    let generatedName = text.toLowerCase();
    generatedName = generatedName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    generatedName = generatedName.replace(/\s+/g, '_').replace(/[^a-z0-9_.-]/g, '');
    generatedName = generatedName.substring(0, 50); // Max length
    if (!generatedName.endsWith('.jpg') && !generatedName.endsWith('.jpeg')) {
        generatedName = generatedName ? `${generatedName}.jpg` : generateDefaultFileName();
    }    
    setFileName(generatedName || generateDefaultFileName());
  }, []);

  const toggleFileNameDictation = useCallback(() => {
    if (!recognitionRef.current) {
      toast({ title: t.voiceNamingNotAvailable, variant: "destructive" });
      return;
    }
    if (isDictatingName) {
      recognitionRef.current.stop();
    } else {
      setDictatedNameText(null);
      // setFileName(''); // Keep previous name or default until new one is confirmed
      setNameProcessingError(null);
      recognitionRef.current.start();
    }
  }, [isDictatingName]);
  
  const startCamera = useCallback(async (facing?: CameraFacing) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      const newFacing = facing || cameraFacing;
      setCameraFacing(newFacing);
      if (facing) setIsSwitchingCamera(true);

      const currentOrientation = getCurrentOrientation();
      setOrientation(currentOrientation);
      const constraints = getCameraConstraints(currentOrientation, newFacing, zoomLevel);
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities();
        const isZoomAvailable = !!capabilities?.zoom;
        setIsZoomSupported(isZoomAvailable);
        if (isZoomAvailable && capabilities?.zoom && zoomLevel >= capabilities.zoom.min && zoomLevel <= capabilities.zoom.max) {
           try {
            await videoTrack.applyConstraints({ advanced: [{ zoom: zoomLevel }] });
           } catch (e) { console.warn('Zoom applyConstraints failed:', e); }
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        adjustVideoStyle(videoRef.current, currentOrientation);
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) adjustVideoStyle(videoRef.current, currentOrientation);
          if (containerRef.current) adjustContainerStyle(containerRef.current, currentOrientation);
          setIsSwitchingCamera(false);
        };
        setIsCameraOn(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      toast({ title: t.cameraError, description: t.cameraPermissionDenied, variant: "destructive" });
      setIsSwitchingCamera(false);
    }
  }, [t.cameraError, t.cameraPermissionDenied, cameraFacing, zoomLevel]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraOn(false);
  }, []);

  const takePhoto = useCallback(async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        setPhotoTaken(dataUrl);
        
        // Convert to Blob immediately for upload/save
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        setPhotoBlob(blob);

        stopCamera();
        setIsNamingFile(true);
        setFileName(generateDefaultFileName()); // Set a default name
        setDictatedNameText(null);
        setNameProcessingError(null);
      }
    }
  }, [stopCamera, orientation]);

  const handleRetakePhoto = useCallback(() => {
    setPhotoTaken(null);
    setPhotoBlob(null);
    setIsNamingFile(false);
    setFileName('');
    setDictatedNameText(null);
    setNameProcessingError(null);
    setIsDictatingName(false);
    if (recognitionRef.current && isDictatingName) {
      recognitionRef.current.abort();
    }
    // Optionally restart camera automatically, or let user click start
    // startCamera(cameraFacing); // Uncomment to auto-restart camera
  }, [isDictatingName, cameraFacing]);
  
  const savePhotoToGallery = useCallback(async (currentFileName: string) => {
    if (!photoTaken) return;
    const nameForFile = currentFileName || generateDefaultFileName();
    try {
      const link = document.createElement('a');
      link.download = nameForFile;
      link.href = photoTaken; // Data URL is fine for download link
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: t.photoSaved, description: t.photoSavedSuccess });
    } catch (error) {
      console.error('Error saving photo:', error);
      toast({ title: t.saveError, description: (error instanceof Error ? error.message : t.unknownError), variant: "destructive" });
    }
  }, [photoTaken, t]);

  const handleUploadPhoto = useCallback(async () => {
    if (!photoBlob || !fileName) {
        toast({ title: t.uploadError, description: t.noPhotoOrFilenameError, variant: "destructive" });
        return;
    }
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', photoBlob, fileName);
      
      const uploadResponse = await fetch(webhookUrl, { method: 'POST', body: formData });
      
      if (uploadResponse.ok) {
        toast({ title: t.photoSent, description: t.photoSentSuccess });
        handleRetakePhoto(); // Reset state after successful upload
      } else {
        const errorData = await uploadResponse.text();
        toast({ title: t.uploadError, description: `Server: ${uploadResponse.status} ${errorData || t.unknownError}`, variant: "destructive" });
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({ title: t.uploadError, description: (error instanceof Error ? error.message : t.unknownError), variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  }, [photoBlob, fileName, webhookUrl, t, handleRetakePhoto]);

  useEffect(() => {
    const handleOrientationChange = (newOrientation: Orientation) => {
      setOrientation(newOrientation);
      if (videoRef.current) adjustVideoStyle(videoRef.current, newOrientation);
      if (containerRef.current) adjustContainerStyle(containerRef.current, newOrientation);
    };
    const removeListener = addOrientationChangeListener(handleOrientationChange);
    return () => removeListener();
  }, []);

  const handleToggleCameraFacing = useCallback(() => {
    if (isSwitchingCamera) return;
    startCamera(cameraFacing === 'user' ? 'environment' : 'user');
  }, [cameraFacing, startCamera, isSwitchingCamera]);

  const handleZoomChange = useCallback(async (newZoom: number) => {
    if (!isZoomSupported || !streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (videoTrack) {
        try {
            await videoTrack.applyConstraints({ advanced: [{ zoom: newZoom }] });
            setZoomLevelState(newZoom);
        } catch (error) {
            console.warn('Failed to set zoom via applyConstraints:', error);
            toast({ title: t.zoomErrorTitle, description: t.zoomErrorDescription, variant: "destructive"});
        }
    }
  }, [isZoomSupported, t.zoomErrorTitle, t.zoomErrorDescription]);

  useEffect(() => {
    const updateOrientation = () => {
      const newOrientation = getCurrentOrientation();
      setOrientation(newOrientation);
      if (videoRef.current) adjustVideoStyle(videoRef.current, newOrientation);
      if (containerRef.current) adjustContainerStyle(containerRef.current, newOrientation);
    };
    addOrientationChangeListener(updateOrientation);
    updateOrientation(); // Initial call
    return () => {
      // Remove listener if needed, assuming addOrientationChangeListener returns a remover
    };
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // UI Rendering
  return (
    <div className="flex flex-col items-center p-2 space-y-3 w-full max-w-lg mx-auto">
      {isSwitchingCamera && (
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-50">
          <RefreshCw className="h-12 w-12 text-white animate-spin mb-4" />
          <p className="text-white text-lg">{t.switchingCameraText}</p>
        </div>
      )}

      <div 
        ref={containerRef} 
        className="w-full aspect-[3/4] bg-gray-200 rounded-lg flex items-center justify-center relative overflow-hidden border border-gray-300 shadow-inner"
        style={{ maxHeight: 'calc(100svh - 250px)' }} // Adjust 200px based on other elements' height
      >
        {isCameraOn && !photoTaken && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }} // Default for user-facing, adjust if needed
          />
        )}
        {!isCameraOn && !photoTaken && (
          <div className="text-center text-gray-500 p-4">
            <CameraIcon size={48} className="mx-auto mb-2" />
            <p>{t.cameraPlaceholder}</p>
          </div>
        )}
        {photoTaken && !isNamingFile && (
           <div className="relative w-full h-full">
            <img 
              src={photoTaken} 
              alt={t.capturedPhotoAlt || "Captured photo"} 
              className="w-full h-full object-contain" 
            />
          </div>
        )}
        {isCameraOn && !photoTaken && isZoomSupported && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-2 p-1 bg-black/30 rounded-full">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => handleZoomChange(Math.max(streamRef.current?.getVideoTracks()[0]?.getCapabilities()?.zoom?.min || 1, zoomLevel - 0.5))}
              className="text-white hover:bg-white/20 rounded-full"
              aria-label={t.zoomOutLabel || "Zoom Out"}
              disabled={zoomLevel <= (streamRef.current?.getVideoTracks()[0]?.getCapabilities()?.zoom?.min || 1)}
            >
              <ZoomOut size={20} />
            </Button>
            <input
              type="range"
              min={streamRef.current?.getVideoTracks()[0]?.getCapabilities()?.zoom?.min || 1}
              max={streamRef.current?.getVideoTracks()[0]?.getCapabilities()?.zoom?.max || 5}
              step={streamRef.current?.getVideoTracks()[0]?.getCapabilities()?.zoom?.step || 0.1}
              value={zoomLevel}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              className="w-24 h-2 accent-sky-500 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              aria-label={t.zoomSlider || "Zoom control"}
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={() => handleZoomChange(Math.min(streamRef.current?.getVideoTracks()[0]?.getCapabilities()?.zoom?.max || 5, zoomLevel + 0.5))}
              className="text-white hover:bg-white/20 rounded-full"
              aria-label={t.zoomInLabel || "Zoom In"}
              disabled={zoomLevel >= (streamRef.current?.getVideoTracks()[0]?.getCapabilities()?.zoom?.max || 5)}
            >
              <ZoomIn size={20} />
            </Button>
          </div>
        )}
      </div>

      {photoTaken && isNamingFile && (
        <div className="w-full p-4 bg-gray-100 rounded-lg shadow space-y-3">
          <h3 className="text-lg font-semibold text-center">{t.nameYourPhoto || "Name Your Photo"}</h3>
          <div className="relative">
            <input 
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder={t.enterFileNamePlaceholder || "Enter filename or use voice"}
              className="w-full p-2 border rounded-md pr-10"
            />
            <Button 
              size="icon" 
              variant="ghost"
              onClick={toggleFileNameDictation} 
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
              aria-label={isDictatingName ? (t.stopDictation || "Stop dictation") : (t.startDictation || "Start dictation")}
            >
              <Mic size={20} className={isDictatingName ? "text-red-500 animate-pulse" : "text-gray-600"} />
            </Button>
          </div>
          {isDictatingName && <p className="text-sm text-blue-600 text-center">{t.dictatingNow || "Dictating..."}</p>}
          {dictatedNameText && <p className="text-sm text-gray-700">{t.recognizedText || "Recognized:"} <span className="font-medium">{dictatedNameText}</span></p>}
          {nameProcessingError && <p className="text-sm text-red-500">{nameProcessingError}</p>}
          
          <div className="flex gap-2 justify-center">
            <Button onClick={handleConfirmFileName} className="bg-green-500 hover:bg-green-600" type="button">
              {t.confirmName || "Confirm Name"}
            </Button>
            <Button onClick={handleRetakePhoto} variant="outline" type="button">
              {t.retakePhoto || "Retake"}
            </Button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full">
        {!isCameraOn && !photoTaken && (
          <Button onClick={() => startCamera()} className="bg-blue-500 hover:bg-blue-600 col-span-full" type="button">
            {t.startCamera || "Start Camera"}
          </Button>
        )}
        
        {isCameraOn && !photoTaken && (
          <>
            <Button onClick={handleToggleCameraFacing} variant="outline" className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" /> 
              {cameraFacing === 'user' ? t.switchToBackCamera : t.switchToFrontCamera}
            </Button>
            <Button onClick={() => takePhoto()} className="bg-red-500 hover:bg-red-600 w-full" type="button">
              <CameraIcon className="mr-2 h-4 w-4" />{t.takePhoto || "Take Photo"}
            </Button>
            <Button onClick={stopCamera} variant="destructive" className="w-full col-span-full sm:col-span-1">
              {t.stopCamera || "Stop Camera"}
            </Button>
          </>
        )}
        
        {photoTaken && !isNamingFile && (
          <>
            <Button 
              onClick={handleUploadPhoto} 
              disabled={isUploading}
              className="bg-green-500 hover:bg-green-600 w-full"
              type="button"
            >
              {isUploading ? 
                (t.uploading || "Uploading...") : 
                (t.sendPhoto || "Send Photo")
              }
            </Button>
            <Button 
              onClick={handleSavePhotoToGallery} 
              variant="secondary" 
              disabled={isUploading} 
              type="button"
              className="flex items-center gap-1 w-full"
            >
              <Download size={16} className="mr-1" />
              {t.saveToGallery || "Save to Gallery"}
            </Button>
            <Button 
              onClick={handleRetakePhoto} 
              variant="outline" 
              disabled={isUploading} 
              type="button"
              className="w-full col-span-full sm:col-span-1"
            >
              {t.retakePhoto || "Retake"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
