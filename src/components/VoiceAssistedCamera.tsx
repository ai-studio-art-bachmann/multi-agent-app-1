import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useCamera } from '@/hooks/useCamera';
import { useSpeech } from '@/hooks/useSpeech';
import { offlineService, OfflineInspection } from '@/services/offlineService';
import { supabaseService } from '@/services/supabaseService';
import { getTranslations } from '@/utils/translations';
import { Camera, Mic, Volume2, Upload, Wifi, WifiOff, PlayCircle, RotateCcw } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface VoiceAssistedCameraProps {
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

export const VoiceAssistedCamera: React.FC<VoiceAssistedCameraProps> = ({ webhookUrl, language }) => {
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
  
  // Audio element ref for manual audio playback
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
          toast({
            title: 'Kameravirhe',
            description: errorMessage,
            variant: 'destructive'
          });
          await speech.speak('Kameran käynnistys epäonnistui', language);
        }
      };
      openAndProceed();
    }
  }, [flowState, camera, language, speech, t, toast]);

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
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, ' ').replace(/-/g, '.');
    // Remove characters that are invalid in most filesystems
    const cleanInput = voiceInput
      .trim()
      .replace(/[\\/:*?"<>|]/g, ''); // Remove invalid filename characters

    // Add timestamp for uniqueness, then the extension
    return cleanInput ? `${cleanInput} ${timestamp}.jpg` : `kuva_${timestamp}.jpg`;
  }, []);

  // Audio playback with fallback
  const playAudioWithFallback = useCallback(async (audioDataUri: string, isManual: boolean = false): Promise<void> => {
    if (!audioDataUri) {
      console.warn('[VoiceAssistedCamera] No audio data provided for playback');
      return;
    }

    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio(audioDataUri);
      audioRef.current = audio;

      await new Promise<void>((resolve, reject) => {
        audio.onended = () => resolve();
        audio.onerror = (e) => {
          console.error('[VoiceAssistedCamera] Audio playback error:', e);
          reject(new Error('Audio playback failed'));
        };
        audio.oncanplaythrough = () => {
          audio.play().catch(reject);
        };
      });

      if (isManual) {
        setShowPlayButtonForAnalysis(false);
        setAudioToPlayManually(null);
      }
    } catch (error) {
      console.warn('[VoiceAssistedCamera] Audio playback failed, using speech synthesis fallback');
      if (analysisText) {
        await speech.speak(analysisText, language);
      }
      
      if (isManual) {
        setShowPlayButtonForAnalysis(false);
        setAudioToPlayManually(null);
      }
    }
  }, [analysisText, speech, language]);

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
      
      const voiceFileName = await speech.ask('Anna kuvalle nimi', language);
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
      
      setWantAudio(wantsAudio);
      wantAudioForOffline = wantsAudio;

      // Step 4: Process analysis
      setFlowState('processing_analysis');
      setStatusMessage('Käsitellään analyysia...');
      
      // Check if online
      if (!navigator.onLine) {
        await speech.speak('Ei internetyhteyttä. Tallennetaan myöhempää synkronointia varten.', language);
        throw new Error('offline_mode');
      }
      
      // Send to n8n webhook
      const formData = new FormData();
      formData.append('file', photoBlob, processedFileName);
      formData.append('fileName', processedFileName);
      formData.append('language', language);
      formData.append('wantAudio', wantsAudio.toString());

      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
      });

      const responseText = await response.text();
      console.log(`[VoiceAssistedCamera] Webhook response:`, { status: response.status, ok: response.ok, body: responseText });

      if (!response.ok) {
        throw new Error(`Webhook-virhe ${response.status}: ${responseText}`);
      }
      
      let analysisResult;
      try {
        analysisResult = JSON.parse(responseText);
      } catch (jsonError) {
        throw new Error('Webhook palautti virheellistä dataa');
      }

      setAnalysisText(analysisResult.textResponse || analysisResult.text || 'Analyysi valmis');
      
      // Handle audio response
      let rawAudioData = analysisResult.audioResponse || analysisResult.audio || '';
      const audioFormat = analysisResult.audioFormat || 'mp3';
      let playableAudioDataUri = '';

      if (rawAudioData) {
        if (rawAudioData.startsWith('//')) {
          rawAudioData = rawAudioData.substring(2);
        }

        if (rawAudioData && !rawAudioData.startsWith('data:')) {
          playableAudioDataUri = `data:audio/${audioFormat};base64,${rawAudioData}`;
        } else if (rawAudioData) {
          playableAudioDataUri = rawAudioData;
        }
      }
      
      setAnalysisAudio(playableAudioDataUri);

      // Step 5: Play or skip analysis
      if (wantsAudio && playableAudioDataUri) {
        setFlowState('playing_analysis');
        setStatusMessage('Toistetaan analyysin ääni...');
        await playAudioWithFallback(playableAudioDataUri);
      } else if (wantsAudio && !playableAudioDataUri) {
        await speech.speak('Analyysi valmis, mutta äänivastetta ei saatu.', language);
        // Offer manual play option
        if (analysisText) {
          setAudioToPlayManually(analysisText);
          setShowPlayButtonForAnalysis(true);
        }
      } else {
        await speech.speak('Analyysi tallennettu ilman äänitoistoa.', language);
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
        text: analysisResult.textResponse || analysisResult.text || '',
        audioUrl: playableAudioDataUri,
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
      await speech.speak('Kuva analysoitu ja tallennettu onnistuneesti!', language);

      toast({
        title: 'Onnistui!',
        description: 'Kuva analysoitu ja tallennettu onnistuneesti',
        variant: 'default'
      });

    } catch (error) {
      const isOfflineError = error instanceof Error && error.message === 'offline_mode';
      
      if (isOfflineError && photoBlobForOffline && fileNameForOffline) {
        await handleOfflineStorage(photoBlobForOffline, fileNameForOffline, wantAudioForOffline);
      } else {
        console.error('Error in voice-assisted camera flow:', error);
        setFlowState('error');
        const errorMessage = error instanceof Error ? error.message : 'Tuntematon virhe';
        setStatusMessage('Toiminto epäonnistui: ' + errorMessage);
        
        toast({ 
          title: 'Virhe', 
          description: errorMessage, 
          variant: 'destructive' 
        });
        
        await speech.speak('Toiminto epäonnistui', language);
      }
    } finally {
      camera.close();
    }
  }, [
    camera, speech, language, t, processVoiceToFileName, webhookUrl, 
    playAudioWithFallback, supabaseService, analysisText
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
    setWantAudio(false);
    setAnalysisText('');
    setAnalysisAudio('');
    setStatusMessage('');
    setShowPlayButtonForAnalysis(false);
    setAudioToPlayManually(null);
    
    // Stop audio if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
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
      <div className="mb-4 text-center">
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
        <div className="mb-4">
          <img
            src={capturedImage}
            alt="Otettu kuva"
            className="w-full aspect-[4/3] object-cover rounded-lg border"
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
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            {getFlowStepIcon()}
            <span className="text-sm text-blue-800 font-medium">{statusMessage}</span>
          </div>
        </div>
      )}

      {/* Text input fallback for speech recognition */}
      {speech.showTextInput && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
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

      {/* Manual play button for analysis audio */}
      {showPlayButtonForAnalysis && audioToPlayManually && (
        <div className="mb-4">
          <Button
            onClick={() => {
              if (analysisAudio) {
                playAudioWithFallback(analysisAudio, true);
              } else {
                speech.speak(audioToPlayManually, language);
                setShowPlayButtonForAnalysis(false);
                setAudioToPlayManually(null);
              }
            }}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 rounded-full shadow-lg"
            size="lg"
          >
            <PlayCircle className="w-5 h-5 mr-2" />
            Kuuntele analyysi
          </Button>
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
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            <strong>Kameravirhe:</strong> {camera.error}
          </p>
        </div>
      )}

      {/* Workflow help text */}
      {flowState === 'idle' && (
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-xs text-gray-600 text-center leading-relaxed">
            <strong>Ääniohjattu työnkulku:</strong><br />
            1. Ota kuva → 2. Anna nimi äänellä → 3. Valitse analyysin kuuntelu → 4. Tallenna automaattisesti
          </p>
        </div>
      )}
    </div>
  );
}; 