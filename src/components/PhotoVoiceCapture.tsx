import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { getTranslations } from '@/utils/translations';
import { Camera, Mic, X, Check, AlertCircle, Download, RotateCcw, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { SessionManager } from '@/utils/sessionManager';
import { getCurrentOrientation, addOrientationChangeListener, adjustVideoStyle, adjustContainerStyle, Orientation, CameraFacing, toggleCameraFacing, getCameraConstraints, setZoomLevel } from '@/utils/orientationUtils';

// Kasutame globaalseid tüüpe SpeechRecognition jaoks
// Define more specific types for SpeechRecognition
interface PhotoVoiceCaptureProps {
  webhookUrl: string;
  language: 'fi' | 'et' | 'en';
}

export const PhotoVoiceCapture: React.FC<PhotoVoiceCaptureProps> = ({ webhookUrl, language }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [photoTaken, setPhotoTaken] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceText, setVoiceText] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [generatedFilename, setGeneratedFilename] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<Orientation>(getCurrentOrientation());
  const [cameraFacing, setCameraFacing] = useState<CameraFacing>('environment');
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [zoomLevel, setZoomLevelState] = useState<number>(1.0);
  const [isZoomSupported, setIsZoomSupported] = useState<boolean>(false);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const t = getTranslations(language);

  // Funktsioon failinime genereerimiseks häälsisendist
  const processVoiceText = useCallback((text: string) => {
    setIsProcessing(true);
    
    try {
      // Teisendame väiketähtedeks
      let filename = text.toLowerCase();
      
      // Eemaldame skandinaavia tähed
      filename = filename.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      // Asendame tühikud sidekriipsudega ja eemaldame sobimatud märgid
      filename = filename.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      // Piirame 40 tähemärgiga
      filename = filename.substring(0, 40);
      
      // Lisame .jpg laiendi
      filename = `${filename}.jpg`;
      
      console.log('Generated filename:', filename);
      setGeneratedFilename(filename);
      setShowConfirmDialog(true);
      // setIsProcessing(false) eemaldatud siit, kuna see toimub onend või onerror
    } catch (error) {
      console.error('Error processing voice text:', error);
      toast({
        title: t.unknownError || "Error",
        description: "Failed to process voice command",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false); // Tagame, et see alati käivitub
    }
  }, [t, setGeneratedFilename, setShowConfirmDialog, setIsProcessing]);

  // Kõnetehnoloogia initialiseerimine
  useEffect(() => {
    // Kontrollime, kas brauser toetab kõnetuvastust ja kas SpeechRecognition API on saadaval
    const SpeechRecognitionAPI: typeof SpeechRecognition | undefined = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      console.error('Speech Recognition API is not supported in this browser.');
      toast({
        title: t.voiceError || "Voice Error",
        description: "Speech Recognition is not supported in this browser.", // TODO: Consider a translation key
        variant: "destructive"
      });
      return; // Välju useEffect konksust, kui API pole saadaval
    }

    // Loome uue instantsi, kuid ei käivita seda veel
    const recognition: SpeechRecognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    
    // Määrame keele vastavalt rakenduse keelele
    switch (language) {
      case 'fi':
        recognition.lang = 'fi-FI';
        break;
      case 'et':
        recognition.lang = 'et-EE';
        break;
      case 'en':
      default:
        recognition.lang = 'en-US';
        break;
    }
    
    // Seadistame sündmuste töötlejad
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      console.log('Voice recognition result:', transcript);
      setVoiceText(transcript);
      processVoiceText(transcript);
    };
    
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event);
      setIsRecording(false);
      toast({
        title: t.voiceError || "Voice Error",
        description: "Speech recognition error",
        variant: "destructive"
      });
    };
    
    recognition.onstart = (event: Event) => {
      setIsRecording(true);
      console.log('Speech recognition started');
    };

    recognition.onend = (event: Event) => {
      setIsRecording(false);
      console.log('Speech recognition ended');
    };
    
    recognitionRef.current = recognition;
    
    // Puhastame, kui komponent eemaldatakse
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [language, t, processVoiceText]);

  // Funktsioon häälsalvestuse käivitamiseks ja peatamiseks
  const toggleVoiceCapture = useCallback(() => {
    if (recognitionRef.current) {
      if (isRecording) {
        recognitionRef.current.stop();
        // setIsRecording(false) will be handled by onend event
      } else {
        // Puhastame varasemad tulemused enne uue salvestuse alustamist
        setVoiceText(''); 
        setGeneratedFilename(''); 
        recognitionRef.current.start();
        // setIsRecording(true) will be handled by onstart event
      }
    } else {
      console.error("Speech recognition not initialized");
      toast({
        title: t.voiceError || "Voice Error",
        description: "Speech recognition not initialized.", // TODO: Consider a translation key
        variant: "destructive"
      });
    }
  }, [isRecording, t, setVoiceText, setGeneratedFilename]);

  // Kaamera käivitamine
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
        
        console.log('Camera zoom supported:', isZoomAvailable, isZoomAvailable ? `(min: ${capabilities.zoom?.min}, max: ${capabilities.zoom?.max})` : '');
        
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
  }, [t, cameraFacing, zoomLevel, setCameraFacing, setIsSwitchingCamera, setOrientation, setIsZoomSupported, setIsCameraOn]);

  // Kaamera peatamine
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

  // Foto tegemine
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
        
        // Teisendame andme-URL-i plokiks hilisemaks kasutamiseks
        canvas.toBlob((blob) => {
          if (blob) {
            setPhotoBlob(blob);
          }
        }, 'image/jpeg', 0.95);
        
        stopCamera();
      }
    }
  }, [stopCamera, orientation]);

  // Lähtestame foto
  const resetPhoto = useCallback(() => {
    setPhotoTaken(null);
    setPhotoBlob(null);
    setVoiceText(null);
    setGeneratedFilename(null);
    setShowConfirmDialog(false);
  }, []);

  // Häälsisestuse alustamine
  const startVoiceRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        console.log('Speech recognition started');
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        setIsRecording(false);
        toast({
          title: t.voiceError || "Voice Error",
          description: "Failed to start speech recognition",
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: t.voiceError || "Voice Error",
        description: "Speech recognition not available",
        variant: "destructive"
      });
    }
  }, [t]);

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
      // Kasutame utiliidist saadud funktsiooni zoom taseme seadistamiseks
      const zoomSuccess = setZoomLevel(streamRef.current, newZoomLevel);
      console.log('Zoom level change result:', zoomSuccess ? 'success' : 'failed');
    } catch (error) {
      console.error('Error setting zoom level:', error);
    }
  }, [isZoomSupported, setZoomLevelState]);
  
  // Funktsioon zoom suurendamiseks
  const zoomIn = useCallback(() => {
    if (!isZoomSupported) return;
    const newZoomLevel = zoomLevel + 0.5;
    changeZoomLevel(newZoomLevel);
  }, [isZoomSupported, zoomLevel, changeZoomLevel]);
  
  // Funktsioon zoom vähendamiseks
  const zoomOut = useCallback(() => {
    if (!isZoomSupported) return;
    const newZoomLevel = Math.max(1.0, zoomLevel - 0.5);
    changeZoomLevel(newZoomLevel);
  }, [isZoomSupported, zoomLevel, changeZoomLevel]);
  
  // Funktsioon peale häälsisendi tühistamist seisu lähtestamiseks
  const cancelConfirmation = useCallback(() => {
    setShowConfirmDialog(false);
    setVoiceText(null);
    setGeneratedFilename(null);
  }, []);

  // Funktsioon foto ja häälkommentaari üles laadimiseks
  const uploadPhotoWithVoice = useCallback(async () => {
    if (!photoBlob || !generatedFilename) {
      toast({
        title: t.uploadError || "Upload Error",
        description: "Missing photo or filename",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setShowConfirmDialog(false);

    try {
      // Create form data
      const formData = new FormData();

      // Add the photo with the generated filename
      formData.append('photo', photoBlob, generatedFilename);

      // Add the voice text
      if (voiceText) {
        formData.append('voiceText', voiceText);
      }

      // Add timestamp
      const timestamp = new Date().toISOString();
      formData.append('timestamp', timestamp);

      // Add worker ID from localStorage
      const workerId = localStorage.getItem('workerId') || 'unknown';
      formData.append('workerId', workerId);

      // Add session metadata
      const sessionMeta = SessionManager.getMetadata();
      formData.append('userId', sessionMeta.userId);
      formData.append('sessionId', sessionMeta.sessionId);

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
        description: t.photoSentSuccess || "Photo was uploaded successfully with voice comment",
      });

      // Reset state
      resetPhoto();

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
  }, [photoBlob, generatedFilename, voiceText, webhookUrl, resetPhoto, t]);

  // Foto salvestamine seadme galeriisse
  const savePhotoToGallery = useCallback(async () => {
    if (!photoTaken) return;

    try {
      // For mobile devices, we need to create a temporary anchor element
      const link = document.createElement('a');

      // Set download attribute with filename
      const filename = generatedFilename || `photo_${new Date().toISOString().replace(/:/g, '-')}.jpg`;
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
  }, [photoTaken, generatedFilename, t]);

  // Käivita kaamera automaatselt, kui komponent laetakse
  useEffect(() => {
    console.log('PhotoVoiceCapture component mounted - starting camera automatically');
    // Väike viivitus, et vältida probleeme komponendi esialgsel renderdamisel
    const timer = setTimeout(() => {
      startCamera();
    }, 500);
    
    return () => {
      clearTimeout(timer);
      stopCamera();
    };
  }, [startCamera, stopCamera]);
  
  // Jälgi ekraani orientatsiooni muutusi
  useEffect(() => {
    // Esialgne orientatsiooni seadistamine
    setOrientation(getCurrentOrientation());
    
    // Lisame orientatsiooni muutuse kuulaja
    const removeListener = addOrientationChangeListener((newOrientation) => {
      console.log('Orientation changed to:', newOrientation);
      setOrientation(newOrientation);
      
      // Kohandame video ja konteineri stiili vastavalt uuele orientatsioonile
      if (videoRef.current && isCameraOn) {
        adjustVideoStyle(videoRef.current, newOrientation);
      }
      
      if (containerRef.current) {
        adjustContainerStyle(containerRef.current, newOrientation);
      }
    });
    
    // Eemaldame kuulaja, kui komponent eemaldatakse
    return () => {
      removeListener();
    };
  }, [isCameraOn]);

  // HTML canvas element for taking photos
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
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800">
              <div className="w-20 h-20 bg-gray-600 rounded-lg flex items-center justify-center mb-4">
                <Camera size={40} color="#d1d5db" className={"animate-pulse"} />
              </div>
              <p className="text-white text-sm animate-pulse">Kaamera käivitamine...</p>
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
        <div 
          className={`relative w-full bg-gray-100 rounded-lg overflow-hidden transition-all duration-300 ${orientation === 'landscape' ? 'h-48 sm:h-56' : 'h-40 sm:h-48'}`}
        >
          <img 
            src={photoTaken} 
            alt="Captured" 
            className={`w-full h-full object-contain ${orientation === 'landscape' ? 'object-cover' : 'object-contain'}`} 
          />
          {voiceText && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 text-sm">
              <p className="truncate">{voiceText}</p>
            </div>
          )}
          
          {/* Orientatsiooni indikaator */}
          <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
            {orientation === 'landscape' ? 'Horisontaalne' : 'Vertikaalne'}
          </div>
        </div>
      )}
      
      {/* Hidden canvas for photo processing */}
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="flex flex-wrap gap-2 justify-center">
        {!isCameraOn && !photoTaken && (
          <Button onClick={() => startCamera()} className="bg-blue-500 hover:bg-blue-600" type="button">
            <Camera size={16} className="mr-2" />
            {t?.startCamera || "Start Camera"}
          </Button>
        )}
        
        {isCameraOn && !photoTaken && (
          <Button onClick={() => takePhoto()} className="bg-green-500 hover:bg-green-600" type="button">
            <Camera size={16} className="mr-2" />
            {t?.takePhoto || "Take Photo"}
          </Button>
        )}
        
        {photoTaken && !isRecording && !showConfirmDialog && (
          <>
            <Button
              onClick={() => toggleVoiceCapture()}
              className={`transition-colors duration-150 ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-purple-500 hover:bg-purple-600'}`}
              type="button"
              disabled={isProcessing || isSwitchingCamera}
            >
              <Mic size={16} className="mr-2" />
              {isProcessing
                ? t.processingStatus
                : isRecording
                ? t.recordingStatus 
                : t.addVoiceComment}
            </Button>
            
            <Button onClick={() => resetPhoto()} className="bg-gray-500 hover:bg-gray-600" type="button">
              <RotateCcw size={16} className="mr-2" />
              {t.resetButtonLabel}
            </Button>
            
            <Button onClick={() => savePhotoToGallery()} className="bg-blue-500 hover:bg-blue-600" type="button">
              <Download size={16} className="mr-2" />
              {t.savePhotoButtonLabel}
            </Button>
          </>
        )}
        
        {isRecording && (
          <div className="flex items-center bg-red-500 text-white px-3 py-2 rounded-md animate-pulse">
            <Mic size={16} className="mr-2" />
            {t.recordingStatus}
          </div>
        )}
      </div>
      
      {/* Confirmation dialog for voice comment */}
      <Dialog open={showConfirmDialog} onOpenChange={(open: boolean) => setShowConfirmDialog(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.confirmPhotoName}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-2">{t.voiceTextRecognized}</p>
            <p className="bg-gray-100 p-3 rounded-md font-mono break-all">{voiceText}</p>
            <p className="mt-4 mb-2">{t.generatedFilenameLabel}</p>
            <p className="bg-gray-100 p-3 rounded-md font-mono break-all">{generatedFilename}</p>
            <p className="mt-4 text-sm text-gray-500">{t.uploadConfirmQuestionPrompt}</p>
          </div>
          <DialogFooter className="flex space-x-2">
            <Button onClick={() => cancelConfirmation()} variant="outline" className="flex-1">
              <X size={16} className="mr-2" />
              {t.cancel}
            </Button>
            <Button onClick={() => uploadPhotoWithVoice()} disabled={isUploading} className="flex-1 bg-green-500 hover:bg-green-600">
              <Check size={16} className="mr-2" />
              {isUploading ? t.uploading : t.uploadButtonLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
