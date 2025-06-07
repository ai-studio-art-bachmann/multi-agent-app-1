import React, { useState, useCallback, useEffect, useRef, useContext } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useCamera } from '@/hooks/useCamera';
import { useSpeech } from '@/hooks/useSpeech';
import { useConversation } from '@/hooks/useConversation';
import { offlineService, OfflineInspection } from '@/services/offlineService';
import { supabaseService } from '@/services/supabaseService';
import { Camera, Mic, Volume2, Upload, Wifi, WifiOff, PlayCircle, RotateCcw } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { AppContext } from '@/context/AppContext';
import { DynamicResponsePanel } from '@/components/DynamicResponsePanel';

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

export const VoiceAssistedCamera: React.FC = () => {
  const [flowState, setFlowState] = useState<FlowState>('idle');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [analysisMessages, setAnalysisMessages] = useState([]);
  
  const context = useContext(AppContext);
  if (!context) throw new Error("VoiceAssistedCamera must be used within AppProvider");
  const { language, cameraWebhookUrl, setCameraWebhookUrl } = context;

  const camera = useCamera();
  const speech = useSpeech();
  const { addMessage, t } = useConversation();
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // This effect orchestrates the camera opening sequence
  useEffect(() => {
    if (flowState === 'opening_camera') {
      const openAndProceed = async () => {
        try {
          await camera.open();
          setFlowState('camera_ready');
          setStatusMessage('Kamera valmis. Ota kuva.');
        } catch (error) {
          console.error('Error starting camera:', error);
          setFlowState('error');
          const errorMessage = error instanceof Error ? error.message : 'Kameran käynnistys epäonnistui';
          setStatusMessage(errorMessage);
          await speech.speak('Kameran käynnistys epäonnistui', language);
        }
      };
      openAndProceed();
    }
  }, [flowState, camera, language, speech, t]);

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

  // Process voice input to valid filename
  const processVoiceToFileName = useCallback((voiceInput: string): string => {
    // NOTE: This implementation uses the user's spoken filename as precisely as possible.
    // It only removes characters that are invalid in all common filesystems.
    // If the user provides the same name for multiple photos, the previous file might be overwritten.
    const cleanInput = voiceInput
      .trim()
      // Remove characters that are invalid in most filesystems.
      .replace(/[\\/:*?"<>|]/g, ''); 

    // Use a generic, timestamped name only if the input is empty after cleaning.
    return cleanInput ? `${cleanInput}.jpg` : `valokuva_${new Date().getTime()}.jpg`;
  }, []);

  // Start the voice-assisted camera workflow
  const startVoiceAssistedFlow = useCallback(async () => {
    // This just triggers the useEffect to start the camera opening process
    setFlowState('opening_camera');
    setStatusMessage('Käynnistetään kameraa...');
  }, []);

  // Complete photo capture and voice workflow
  const takePhotoAndContinueFlow = useCallback(async () => {
    let photoBlobForOffline: Blob | null = null;
    let fileNameForOffline = '';
    let wantAudioForOffline = false;

    try {
      // Step 1: Take photo
      setFlowState('taking_photo');
      setStatusMessage('Otetaan kuva...');
      
      const photoBlob = await camera.capture();
      if (!photoBlob) throw new Error('Kuvan ottaminen epäonnistui');
      
      photoBlobForOffline = photoBlob;
      const previewUrl = URL.createObjectURL(photoBlob);
      setCapturedImage(previewUrl);

      // Step 2: Ask for filename via voice
      setFlowState('asking_filename');
      setStatusMessage('Kuuntelen tiedostonimeä...');
      
      let voiceFileName = '';
      let attempts = 0;
      while (voiceFileName.trim().length === 0 && attempts < 2) {
        try {
          const prompt = attempts === 0 ? 'Anna kuvalle nimi' : 'En kuullut selvästi. Sano nimi uudelleen.';
          voiceFileName = await Promise.race([
            speech.ask(prompt, language),
            new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Speech timeout')), 15000))
          ]);
        } catch (err) {
          console.error(`[VoiceAssistedCamera] Speech recognition attempt ${attempts + 1} failed:`, err);
        }
        attempts++;
      }

      if (voiceFileName.trim().length === 0) {
        // If still no name, assign a default one
        voiceFileName = `kuva_${uuidv4()}`;
        await speech.speak(`Nimeäminen epäonnistui. Tallennetaan oletusnimellä.`, language);
      }

      const processedFileName = processVoiceToFileName(voiceFileName);
      setFileName(processedFileName);
      fileNameForOffline = processedFileName;
      
      await speech.speak(`Tiedosto nimettiin: ${processedFileName}`, language);

      // Step 3: Ask if user wants to hear analysis
      setFlowState('asking_analysis_preference');
      setStatusMessage('Kysytään analyysin kuunteluhalukkuutta...');
      
      const analysisPreference = await speech.ask('Haluatko kuulla kuvan analyysin heti?', language);
      const wantsAudio = analysisPreference.toLowerCase().includes('kyllä') || 
                        analysisPreference.toLowerCase().includes('jah') ||
                        analysisPreference.toLowerCase().includes('yes');
      wantAudioForOffline = wantsAudio;

      // Step 4: Process analysis
      setFlowState('processing_analysis');
      setStatusMessage('Käsitellään analyysia...');
      
      // Check if online
      if (!navigator.onLine) {
        await speech.speak('Ei internetyhteyttä. Tallennetaan myöhempää synkronointia varten.', language);
        throw new Error('offline_mode');
      }
      
      if (!cameraWebhookUrl) {
        throw new Error('Camera Webhook URL is not configured.');
      }

      // Send to n8n webhook
      const safeFileName = processedFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const file = new File([photoBlob], safeFileName, { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', safeFileName);
      formData.append('language', language);
      formData.append('wantAudio', wantsAudio.toString());

      // Log all FormData keys and values
      for (let pair of formData.entries()) {
        console.log(`[VoiceAssistedCamera] FormData: ${pair[0]} =`, pair[1]);
      }

      const response = await fetch(cameraWebhookUrl, {
        method: 'POST',
        body: formData,
      });

      console.log(`[VoiceAssistedCamera] Webhook response received. Status: ${response.status}, Content-Type: ${response.headers.get('Content-Type')}`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Webhook-virhe ${response.status}: ${errorText}`);
      }
      
      const contentType = response.headers.get('Content-Type');
      let textResponse = '';
      let audioBase64 = '';
      let audioFormat = 'mp3';

      if (contentType && contentType.includes('application/json')) {
        const responseText = await response.text();
        if (responseText) {
            try {
                const responseData = JSON.parse(responseText);
                console.log('[VoiceAssistedCamera] Full JSON response from n8n:', responseData);

                textResponse = responseData.textResponse || responseData.text || '';
                audioBase64 = responseData.audioResponse || '';
                audioFormat = responseData.audioFormat || 'mp3';

            } catch (e) {
                console.error('[VoiceAssistedCamera] Failed to parse JSON:', e);
                textResponse = 'Vastaus saatiin, mutta sen käsittely epäonnistui.';
            }
        } else {
            console.warn('[VoiceAssistedCamera] Received JSON content-type but empty response body.');
            textResponse = t.photoAnalyzed;
        }
      } else {
        console.warn(`[VoiceAssistedCamera] Unexpected Content-Type: ${contentType}. Treating as text.`);
        textResponse = await response.text();
      }

      console.log('[VoiceAssistedCamera] audioBase64 length:', audioBase64 ? audioBase64.length : 0);
      console.log('[VoiceAssistedCamera] audioBase64 start:', audioBase64 ? audioBase64.slice(0, 30) : 'null');
      let audioDataUri = '';
      const MAX_AUDIO_SIZE = 512000; // 500 KB limit for base64 string

      if (audioBase64 && audioBase64.replace(/^\/+/, '').replace(/\s+/g, '').length > 0) {
        const cleanAudio = audioBase64.replace(/^\/+/, '').replace(/\s+/g, '');
        if (cleanAudio.length < MAX_AUDIO_SIZE) {
          audioDataUri = `data:audio/${audioFormat};base64,${cleanAudio}`;
          console.log('[VoiceAssistedCamera] audioDataUri:', audioDataUri.slice(0, 60));
        } else {
          console.warn(`[VoiceAssistedCamera] Audio data is too large: ${cleanAudio.length} bytes. Limit is ${MAX_AUDIO_SIZE}.`);
        }
      }
      if (audioDataUri) {
        setAnalysisMessages([
          {
            id: uuidv4(),
            type: 'assistant',
            content: textResponse,
            timestamp: new Date(),
            audioUrl: audioDataUri,
          },
        ]);
        const audio = new Audio(audioDataUri);
        audio.onerror = (e) => {
          console.error('[VoiceAssistedCamera] Audio playback error:', e);
          setAnalysisMessages([
            {
              id: uuidv4(),
              type: 'assistant',
              content: textResponse + `\n\n⚠️ Äänitiedosto on vioittunut tai liian suuri. Kontrolli n8n workflow!`,
              timestamp: new Date(),
            },
          ]);
        };
        audio.play().catch((err) => {
          console.error('[VoiceAssistedCamera] Audio play() error:', err);
          setAnalysisMessages([
            {
              id: uuidv4(),
              type: 'assistant',
              content: textResponse + `\n\n⚠️ Äänitiedosto on vioittunut tai liian suuri. Kontrolli n8n workflow!`,
              timestamp: new Date(),
            },
          ]);
        });
      } else {
        setAnalysisMessages([
          {
            id: uuidv4(),
            type: 'assistant',
            content: textResponse,
            timestamp: new Date(),
          },
        ]);
      }

      // Step 6: Save to database
      setFlowState('saving_to_database');
      setStatusMessage('Tallennetaan tietokantaan...');
      
      const fileUploadResult = await supabaseService.uploadFile(photoBlob, processedFileName);
      if (!fileUploadResult.success || !fileUploadResult.url) {
        throw new Error('Tietokantaan tallennus epäonnistui: ' + fileUploadResult.error);
      }
      
      const inspectionRecord = {
        fileUrl: fileUploadResult.url,
        text: textResponse,
        audioUrl: audioBase64,
        fileName: processedFileName,
        language,
      };

      const dbSaveResult = await supabaseService.saveInspection(inspectionRecord);
      if (!dbSaveResult.success) {
        throw new Error('Tietokantaan tallennus epäonnistui: ' + dbSaveResult.error);
      }

      // Success!
      setFlowState('complete');
      setStatusMessage('Toiminto valmis!');
      toast({
        title: 'Onnistui!',
        description: 'Tiedot tallennettu onnistuneesti',
      });

    } catch (error) {
      const isOfflineError = error instanceof Error && error.message === 'offline_mode';
      
      if (isOfflineError && photoBlobForOffline && fileNameForOffline && wantAudioForOffline) {
        await handleOfflineStorage(photoBlobForOffline, fileNameForOffline, wantAudioForOffline);
      } else {
        console.error('Error in voice-assisted camera flow:', error);
        setFlowState('error');
        const errorMessage = error instanceof Error ? error.message : 'Tuntematon virhe';
        setStatusMessage('Toiminto epäonnistui: ' + errorMessage);
        
        await speech.speak('Toiminto epäonnistui', language);
      }
    }
  }, [
    camera, speech, language, t, processVoiceToFileName, cameraWebhookUrl, 
    addMessage, supabaseService
  ]);

  // Handle offline storage
  const handleOfflineStorage = useCallback(async (photoBlob: Blob, pFileName: string, pWantAudio: boolean) => {
    try {
      setFlowState('saving_to_database');
      setStatusMessage('Tallennetaan offline-tilassa...');
      
      const offlineInspection: OfflineInspection = {
        id: uuidv4(),
        blob: photoBlob,
        fileName: pFileName,
        timestamp: Date.now(),
        wantAudio: pWantAudio,
        language,
      };
      
      await offlineService.saveInspection(offlineInspection);
      await offlineService.registerBackgroundSync();
      
      setFlowState('complete');
      setStatusMessage('Tallennettu offline-tilassa. Synkronoidaan kun yhteys palaa.');
      await speech.speak('Tallennettu offline-tilassa. Synkronoidaan kun internetyhteys palaa.', language);
      
      toast({ 
        title: 'Tallennettu offline-tilassa', 
        description: 'Synkronoidaan kun yhteys palaa',
        variant: 'default' 
      });
    } catch (offlineError) {
      console.error('Offline storage error:', offlineError);
      setFlowState('error');
      const errMessage = offlineError instanceof Error ? offlineError.message : 'Offline-tallennus epäonnistui';
      setStatusMessage('Offline-tallennus epäonnistui: ' + errMessage);
      
      toast({ 
        title: 'Offline-virhe', 
        description: errMessage, 
        variant: 'destructive' 
      });
      
      await speech.speak('Offline-tallennus epäonnistui', language);
    }
  }, [language, speech, offlineService]);

  // Reset the entire flow
  const resetFlow = useCallback(() => {
    setFlowState('idle');
    setCapturedImage(null);
    setFileName('');
    setStatusMessage('');
    setAnalysisMessages([]); // Clear previous analysis messages
    
    camera.close();
    
    // Clean up blob URLs
    if (capturedImage && capturedImage.startsWith('blob:')) {
      URL.revokeObjectURL(capturedImage);
    }
  }, [camera, capturedImage]);

  // Get appropriate icon for current flow state
  const getFlowStepIcon = () => {
    switch (flowState) {
      case 'idle':
      case 'opening_camera':
      case 'camera_ready':
      case 'taking_photo':
        return <Camera className="w-6 h-6" />;
      case 'asking_filename':
      case 'asking_analysis_preference':
        return <Mic className="w-6 h-6 animate-pulse" />;
      case 'playing_analysis':
        return <Volume2 className="w-6 h-6 animate-pulse" />;
      case 'processing_analysis':
      case 'saving_to_database':
        return <Upload className="w-6 h-6 animate-spin" />;
      default:
        return <Camera className="w-6 h-6" />;
    }
  };

  return (
    <div className="p-4 bg-white rounded-2xl shadow-lg border border-gray-200">
      {/* Header */}
      <div className="mb-3 text-center">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Ääniohjattu kuvaustyökalu
        </h3>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
          {isOnline ? (
            <><Wifi className="w-4 h-4 text-green-500" /> Yhdistetty</>
          ) : (
            <><WifiOff className="w-4 h-4 text-orange-500" /> Ei yhteyttä</>
          )}
        </div>
      </div>

      {/* Camera video preview */}
      {(flowState !== 'idle' && flowState !== 'complete' && flowState !== 'error' && !capturedImage) && (
        <div className="mb-4 relative bg-black rounded-lg overflow-hidden aspect-[4/3]">
          <video
            ref={camera.videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
            {camera.isOpening ? 'Käynnistyy...' : 'Valmis'}
          </div>
        </div>
      )}

      {/* Captured image preview */}
      {capturedImage && (
        <div className="mb-3">
          <img
            src={capturedImage}
            alt="Otettu kuva"
            className="w-full aspect-[16/9] max-h-32 object-cover rounded-lg border mx-auto"
          />
          {fileName && (
            <p className="text-sm text-gray-600 mt-2 text-center font-medium">
              📁 {fileName}
            </p>
          )}
        </div>
      )}

      {/* Status message */}
      {statusMessage && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            {getFlowStepIcon()}
            <span className="text-sm text-blue-800 font-medium">{statusMessage}</span>
          </div>
        </div>
      )}

      {/* Analysis messages */}
      {analysisMessages.length > 0 && (
        <div className="mb-3 max-h-36 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-2">
          <DynamicResponsePanel messages={analysisMessages} language={language} />
        </div>
      )}

      {/* Text input fallback for speech recognition */}
      {speech.showTextInput && (
        <div className="mb-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm font-medium text-amber-800 mb-2">{speech.textInputPrompt}</p>
          <form onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.elements.namedItem('fallback-input') as HTMLInputElement;
            speech.handleTextInput(input.value);
          }}>
            <input
              name="fallback-input"
              type="text"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
              placeholder="Kirjoita tiedostonimi tähän"
            />
            <Button type="submit" className="w-full mt-2 bg-orange-500 hover:bg-orange-600">
              Vahvista nimi
            </Button>
          </form>
        </div>
      )}

      {/* Controls */}
      <div className="space-y-3">
        {flowState === 'idle' && (
          <Button
            onClick={startVoiceAssistedFlow}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium py-4 rounded-full shadow-lg transition-all duration-200 hover:shadow-xl"
            size="lg"
            disabled={camera.isOpening}
          >
            <Camera className="w-6 h-6 mr-2" />
            Aloita ääniohjattu kuvaus
          </Button>
        )}

        {flowState === 'camera_ready' && (
          <Button
            onClick={takePhotoAndContinueFlow}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium py-4 rounded-full shadow-lg transition-all duration-200 hover:shadow-xl"
            size="lg"
          >
            <Camera className="w-6 h-6 mr-2" />
            Ota kuva ja jatka ääniohjattuna
          </Button>
        )}

        {(flowState === 'complete' || flowState === 'error') && (
          <Button
            onClick={resetFlow}
            variant="outline"
            className="w-full py-4 rounded-full border-2 border-gray-300 hover:border-gray-400 transition-colors"
            size="lg"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Aloita uudelleen
          </Button>
        )}
      </div>

      {/* Error display */}
      {camera.error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            <strong>Kameravirhe:</strong> {camera.error}
          </p>
        </div>
      )}

      {/* Workflow help text */}
      {flowState === 'idle' && (
        <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-xs text-gray-600 text-center leading-relaxed">
            <strong>Ääniohjattu työnkulku:</strong><br />
            1. Ota kuva → 2. Anna nimi äänellä → 3. Valitse analyysin kuuntelu → 4. Tallenna automaattisesti
          </p>
        </div>
      )}
    </div>
  );
}; 