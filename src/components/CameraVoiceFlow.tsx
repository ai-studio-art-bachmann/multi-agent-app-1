import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useCamera } from '@/hooks/useCamera';
import { useSpeech } from '@/hooks/useSpeech';
import { offlineService, OfflineInspection } from '@/services/offlineService';
import { supabaseService } from '@/services/supabaseService';
import { getTranslations } from '@/utils/translations';
import { Camera, Mic, Volume2, Upload, Wifi, WifiOff, PlayCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface CameraVoiceFlowProps {
  webhookUrl: string;
  language: 'fi' | 'et' | 'en';
}

type FlowState = 
  | 'idle'
  | 'opening_camera'
  | 'camera_ready'
  | 'taking_photo'
  | 'asking_filename'
  | 'processing_filename'
  | 'asking_analysis_preference'
  | 'processing_analysis'
  | 'playing_analysis'
  | 'saving_to_database'
  | 'complete'
  | 'error';

export const CameraVoiceFlow: React.FC<CameraVoiceFlowProps> = ({ webhookUrl, language }) => {
  const [flowState, setFlowState] = useState<FlowState>('idle');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [wantAudio, setWantAudio] = useState<boolean>(false);
  const [analysisText, setAnalysisText] = useState<string>('');
  const [analysisAudio, setAnalysisAudio] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [showPlayButtonForAnalysis, setShowPlayButtonForAnalysis] = useState(false);
  const [audioToPlayManually, setAudioToPlayManually] = useState<string | null>(null);

  const camera = useCamera();
  const speech = useSpeech();
  const t = getTranslations(language);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Generate filename from voice input
  const processVoiceToFileName = useCallback((voiceText: string): string => {
    if (!voiceText.trim()) {
      return `tyokalu_${new Date().toISOString().replace(/:/g, '-')}.jpg`;
    }

    let processedName = voiceText
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/[^a-z0-9_.-]/g, '') // Remove invalid characters
      .substring(0, 50); // Limit length

    if (!processedName.endsWith('.jpg') && !processedName.endsWith('.jpeg')) {
      processedName = processedName ? `${processedName}.jpg` : `tyokalu_${Date.now()}.jpg`;
    }

    return processedName;
  }, []);

  const playAudioWithFallback = useCallback(async (audioDataUri: string, isUserInitiated = false) => {
    if (!audioDataUri) return;
    
    setShowPlayButtonForAnalysis(false);
    setAudioToPlayManually(null);

    try {
      const response = await fetch(audioDataUri);
      const blob = await response.blob();
      const audioBlobUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioBlobUrl);

      audio.onended = () => URL.revokeObjectURL(audioBlobUrl);
      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        URL.revokeObjectURL(audioBlobUrl);
        toast({ title: t.audioError, description: t.audioPlayError, variant: 'destructive' });
        // If even manual play fails, reset state
        setShowPlayButtonForAnalysis(false); 
        setAudioToPlayManually(null);
      };

      if (isUserInitiated) {
        await audio.play();
      } else {
        try {
          await audio.play(); // Autoplay attempt
        } catch (autoPlayError) {
          console.warn('Autoplay failed, showing play button:', autoPlayError);
          // Autoplay failed, show play button that calls this function with isUserInitiated = true
          setAudioToPlayManually(audioDataUri); // Store the original data URI
          setShowPlayButtonForAnalysis(true);
          toast({
            title: t.playAnalysis,
            description: 'Automaattinen toisto epäonnistui. Paina toistaaksesi analyysin.',
            duration: 10000 // Give user time to click
          });
        }
      }
    } catch (error) {
      console.error('Error preparing audio for playback:', error);
      toast({ title: t.audioError, description: t.audioPlayError, variant: 'destructive' });
    }
  }, [t, toast]);

  // Main flow function
  const startCameraVoiceFlow = useCallback(async () => {
    try {
      resetFlow(); // Ensure clean state on new start
      setFlowState('opening_camera');
      setStatusMessage(t.startCamera);
      await camera.open();
      setFlowState('camera_ready');
      setStatusMessage('Kamera valmis - paina ottaaksesi kuvan');
    } catch (error) {
      console.error('Error opening camera:', error);
      setFlowState('error');
      setStatusMessage(t.cameraError);
      toast({
        title: t.cameraError,
        description: error instanceof Error ? error.message : 'Tuntematon virhe',
        variant: 'destructive'
      });
    }
  }, [camera, t, toast]);

  const takePhotoAndContinue = useCallback(async () => {
    let photoBlobForOffline: Blob | null = null;
    let fileNameForOffline: string | null = null;
    let wantAudioForOffline: boolean = false;

    try {
      setFlowState('taking_photo');
      setStatusMessage(t.takingPhoto);
      const photoBlob = await camera.capture();
      if (!photoBlob) throw new Error('Kuvan ottaminen epäonnistui');
      photoBlobForOffline = photoBlob;

      const previewUrl = URL.createObjectURL(photoBlob);
      setCapturedImage(previewUrl);

      setFlowState('asking_filename');
      setStatusMessage(t.askingForFileName);
      const voiceFileName = await speech.ask(t.askingForFileName, language);
      const processedFileName = processVoiceToFileName(voiceFileName);
      setFileName(processedFileName);
      fileNameForOffline = processedFileName;
      await speech.speak(`Tiedosto nimettiin: ${processedFileName}`, language);

      setFlowState('asking_analysis_preference');
      setStatusMessage(t.wantToHearAnalysis);
      const analysisPreference = await speech.ask(t.wantToHearAnalysis, language);
      const wantsAudio = analysisPreference.toLowerCase().includes('kyllä') || 
                        analysisPreference.toLowerCase().includes('jah') ||
                        analysisPreference.toLowerCase().includes('yes');
      setWantAudio(wantsAudio);
      wantAudioForOffline = wantsAudio;

      setFlowState('processing_analysis');
      setStatusMessage(t.processingAnalysis);

      if (!await offlineService.isOnline()) {
        await speech.speak(t.offlineSavedForLater, language);
        throw new Error('offline_mode'); // Special error to trigger offline saving
      }
      
      const formData = new FormData();
      formData.append('file', photoBlob, processedFileName);
      formData.append('fileName', processedFileName);
      formData.append('language', language);
      formData.append('wantAudio', wantsAudio.toString());

      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
      });

      // Read the response body as text ONCE.
      const responseText = await response.text();
      console.log(`[CameraVoiceFlow] Webhook response. Status: ${response.status}, OK: ${response.ok}, Body:`, responseText);

      if (!response.ok) {
        // If response is not OK, throw an error with the response text.
        console.error(`[CameraVoiceFlow] Webhook response not OK (${response.status}). Full response text logged above.`);
        throw new Error(`Webhook-virhe ${response.status} (${response.statusText}). Palvelimen vastaus: ${responseText || '(tyhjä)'}`);
      }
      
      // If response is OK, try to parse the text as JSON.
      let analysisResult;
      try {
        if (!responseText) {
          // Handle empty responseText even if response.ok was true
          console.error('[CameraVoiceFlow] Webhook response was OK, but the response body was empty.');
          throw new Error('Webhook-palvelu palautti tyhjän vastauksen.'); 
        }
        analysisResult = JSON.parse(responseText);
      } catch (jsonParseError) {
        console.error('[CameraVoiceFlow] Failed to parse webhook response as JSON. Raw response text logged above.', jsonParseError);
        throw new Error('Webhook-palvelu palautti virheellistä dataa (JSON-jäsennys epäonnistui). Analyysia ei voitu käsitellä.');
      }

      setAnalysisText(analysisResult.textResponse || analysisResult.text || 'Analyysi valmis');
      
      let rawAudioData = analysisResult.audioResponse || analysisResult.audio || '';
      const audioFormat = analysisResult.audioFormat || 'mp3'; // Default to mp3 if not provided by webhook
      let playableAudioDataUri = '';

      if (rawAudioData) {
        // Strip leading "//" if present, as seen from n8n output
        if (rawAudioData.startsWith('//')) {
          console.log('[CameraVoiceFlow] Stripping leading "//" from rawAudioData.');
          rawAudioData = rawAudioData.substring(2);
        }

        if (rawAudioData && !rawAudioData.startsWith('data:')) {
          console.log(`[CameraVoiceFlow] Received raw base64 audio (after potential stripping), converting to data URI with format: ${audioFormat}`);
          playableAudioDataUri = `data:audio/${audioFormat};base64,${rawAudioData}`;
        } else if (rawAudioData) { // It was already a data URI or became empty after stripping
          console.log('[CameraVoiceFlow] Audio is already a data URI or empty after stripping.');
          playableAudioDataUri = rawAudioData; // Use it as is (it might be empty)
        }
      }
      setAnalysisAudio(playableAudioDataUri); 

      if (wantsAudio && playableAudioDataUri) {
        setFlowState('playing_analysis');
        setStatusMessage(t.playingAnalysisAudio);
        await playAudioWithFallback(playableAudioDataUri);
      } else if (wantsAudio && !playableAudioDataUri) {
        await speech.speak('Analyysi valmis, mutta äänivastetta ei saatu.', language);
      } else {
        await speech.speak('Analyysi tallennettu ilman äänitoistoa.', language);
      }

      setFlowState('saving_to_database');
      setStatusMessage(t.savingToDatabase);
      const fileUploadResult = await supabaseService.uploadFile(photoBlob, processedFileName);
      if (!fileUploadResult.success || !fileUploadResult.url) throw new Error('Supabase tiedoston lataus epäonnistui: ' + fileUploadResult.error);
      
      const inspectionRecord = {
        fileUrl: fileUploadResult.url,
        text: analysisResult.textResponse || analysisResult.text || '',
        audioUrl: playableAudioDataUri, // Save the potentially formatted data URI
        fileName: processedFileName,
        language,
      };
      const saveResult = await supabaseService.saveInspection(inspectionRecord);
      if (!saveResult.success) throw new Error('Supabase tietokannan tallennus epäonnistui: ' + saveResult.error);

      setFlowState('complete');
      setStatusMessage(t.operationComplete);
      await speech.speak(t.operationComplete, language);

    } catch (error) {
      const isOfflineError = error instanceof Error && error.message === 'offline_mode';
      if (isOfflineError && photoBlobForOffline && fileNameForOffline) {
        await handleOfflineStorage(photoBlobForOffline, fileNameForOffline, wantAudioForOffline);
      } else {
        console.error('Error in camera voice flow:', error);
        setFlowState('error');
        const errorMessage = error instanceof Error ? error.message : 'Tuntematon virhe';
        setStatusMessage(t.operationFailed + ": " + errorMessage);
        toast({ title: t.cameraVoiceFlowError, description: errorMessage, variant: 'destructive' });
        try { await speech.speak(t.operationFailed, language); } catch (e) {}
      }
    } finally {
      camera.close();
    }
  }, [
    camera, speech, language, t, processVoiceToFileName, webhookUrl, 
    playAudioWithFallback, supabaseService, offlineService, toast // Added dependencies
  ]);

  const handleOfflineStorage = useCallback(async (photoBlob: Blob, pFileName: string, pWantAudio: boolean) => {
    try {
      setFlowState('saving_to_database'); // Keep state consistent
      setStatusMessage(t.offlineSavedForLater);
      const offlineInspection: OfflineInspection = {
        id: uuidv4(),
        blob: photoBlob,
        fileName: pFileName, // Use passed parameter
        timestamp: Date.now(),
        wantAudio: pWantAudio, // Use passed parameter
        language,
      };
      await offlineService.saveInspection(offlineInspection);
      await offlineService.registerBackgroundSync();
      setFlowState('complete');
      setStatusMessage(t.syncWhenOnline);
      await speech.speak(t.syncWhenOnline, language);
      toast({ title: t.offlineSavedForLater, description: t.syncWhenOnline, variant: 'default' });
    } catch (offlineError) {
      console.error('Offline storage error:', offlineError);
      setFlowState('error');
      const errMessage = offlineError instanceof Error ? offlineError.message : 'Offline-tallennus epäonnistui';
      setStatusMessage(t.operationFailed + ": " + errMessage);
      toast({ title: t.cameraVoiceFlowError, description: errMessage, variant: 'destructive' });
      try { await speech.speak(t.operationFailed, language); } catch (e) {}
    }
  }, [language, speech, t, offlineService, toast]); // Added offlineService and toast

  const resetFlow = useCallback(() => {
    setFlowState('idle');
    setCapturedImage(null);
    setFileName('');
    setWantAudio(false);
    setAnalysisText('');
    setAnalysisAudio('');
    setStatusMessage('');
    setShowPlayButtonForAnalysis(false);
    setAudioToPlayManually(null);
    camera.close();
    // Clean up any URL.createObjectURL for capturedImage if it was set
    if (capturedImage && capturedImage.startsWith('blob:')) {
      URL.revokeObjectURL(capturedImage);
    }
  }, [camera, capturedImage]); // Added capturedImage to dependencies for cleanup

  const getFlowStepIcon = () => {
    switch (flowState) {
      case 'idle':
        return <Camera className="w-6 h-6" />;
      case 'asking_filename':
      case 'asking_analysis_preference':
        return <Mic className="w-6 h-6 animate-pulse" />;
      case 'playing_analysis':
        return <Volume2 className="w-6 h-6 animate-pulse" />;
      case 'saving_to_database':
        return <Upload className="w-6 h-6 animate-spin" />;
      default:
        return <Camera className="w-6 h-6" />;
    }
  };

  return (
    <div className="p-4 bg-white rounded-2xl shadow-lg border border-gray-200">
      {/* Header */}
      <div className="mb-4 text-center">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Ääniohjattu kuvaustoiminto
        </h3>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
          {isOnline ? (
            <><Wifi className="w-4 h-4 text-green-500" /> Online</>
          ) : (
            <><WifiOff className="w-4 h-4 text-orange-500" /> Offline</>
          )}
        </div>
      </div>

      {/* Camera video */}
      {camera.isOpen && !capturedImage && (
        <div className="mb-4 relative bg-black rounded-lg overflow-hidden aspect-[4/3]">
          <video
            ref={camera.videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Captured image preview */}
      {capturedImage && (
        <div className="mb-4">
          <img
            src={capturedImage}
            alt="Otettu kuva"
            className="w-full aspect-[4/3] object-cover rounded-lg border"
          />
          {fileName && (
            <p className="text-sm text-gray-600 mt-2 text-center">
              Tiedostonimi: {fileName}
            </p>
          )}
        </div>
      )}

      {/* Status message */}
      {statusMessage && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            {getFlowStepIcon()}
            <span className="text-sm text-blue-800">{statusMessage}</span>
          </div>
        </div>
      )}

      {/* Manual Play Button for Analysis Audio */}
      {showPlayButtonForAnalysis && audioToPlayManually && (
        <Button
          onClick={() => playAudioWithFallback(audioToPlayManually, true)}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 rounded-full shadow-lg mb-3"
          size="lg"
        >
          <PlayCircle className="w-5 h-5 mr-2" />
          Toista analyysin ääni
        </Button>
      )}

      {/* Controls */}
      <div className="space-y-3">
        {flowState === 'idle' && (
          <Button
            onClick={startCameraVoiceFlow}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-medium py-3 rounded-full shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-70"
            size="lg"
            disabled={camera.isOpen} // Disable if camera is already trying to open or open
          >
            <Camera className="w-5 h-5 mr-2" />
            Aloita ääniohjattu kuvaus
          </Button>
        )}

        {flowState === 'camera_ready' && (
          <Button
            onClick={takePhotoAndContinue}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium py-3 rounded-full shadow-lg transition-all duration-200 hover:shadow-xl"
            size="lg"
          >
            <Camera className="w-5 h-5 mr-2" />
            Ota kuva ja jatka
          </Button>
        )}

        {(flowState === 'complete' || flowState === 'error') && (
          <Button
            onClick={resetFlow}
            variant="outline"
            className="w-full py-3 rounded-full"
            size="lg"
          >
            Aloita uudelleen
          </Button>
        )}
      </div>

      {/* Camera error display */}
      {camera.error && flowState !== 'error' && (
         // Only show specific camera error if not already in general flow error state
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">Kameran virhe: {camera.error}</p>
        </div>
      )}
    </div>
  );
}; 