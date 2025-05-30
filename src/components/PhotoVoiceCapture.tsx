import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { getTranslations } from '@/utils/translations';
import { Camera, Mic, X, Check, AlertCircle, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { SessionManager } from '@/utils/sessionManager';

interface PhotoVoiceCaptureProps {
  webhookUrl: string;
  language: 'fi' | 'et' | 'en';
}

export const PhotoVoiceCapture: React.FC<PhotoVoiceCaptureProps> = ({ webhookUrl, language }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [photoTaken, setPhotoTaken] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceText, setVoiceText] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [generatedFilename, setGeneratedFilename] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const t = getTranslations(language);

  // Initialize speech recognition
  useEffect(() => {
    // Check if browser supports SpeechRecognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported in this browser');
      return;
    }
    
    // Create a new instance but don't start it yet
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    
    // Set language based on app language
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
    
    // Set up event handlers
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log('Voice recognition result:', transcript);
      setVoiceText(transcript);
      processVoiceText(transcript);
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      toast({
        title: t.voiceError || "Voice Error",
        description: event.error,
        variant: "destructive"
      });
    };
    
    recognition.onend = () => {
      setIsRecording(false);
      console.log('Speech recognition ended');
    };
    
    recognitionRef.current = recognition;
    
    // Clean up on unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [language, t]);

  // Function to generate a filename from voice text
  const processVoiceText = (text: string) => {
    setIsProcessing(true);
    
    try {
      // Convert to lowercase
      let filename = text.toLowerCase();
      
      // Remove scandinavian characters
      filename = filename.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      // Replace spaces with hyphens and remove invalid characters
      filename = filename.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      // Limit to 40 characters
      filename = filename.substring(0, 40);
      
      // Add .jpg extension
      filename = `${filename}.jpg`;
      
      console.log('Generated filename:', filename);
      setGeneratedFilename(filename);
      setShowConfirmDialog(true);
      setIsProcessing(false);
    } catch (error) {
      console.error('Error processing voice text:', error);
      setIsProcessing(false);
      toast({
        title: t.unknownError || "Error",
        description: "Failed to process voice command",
        variant: "destructive"
      });
    }
  };

  const startCamera = useCallback(async () => {
    try {
      const constraints = {
        video: { facingMode: "environment" }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraOn(true);
      }
    } catch (err) {
      console.error("Error accessing the camera:", err);
      toast({
        title: t.cameraError || "Camera Error",
        description: t.cameraPermissionDenied || "Could not access the camera. Please grant permission.",
        variant: "destructive"
      });
    }
  }, [t]);

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
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame on canvas
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Get data URL representing the image
        const dataUrl = canvas.toDataURL('image/jpeg');
        setPhotoTaken(dataUrl);
        
        // Convert data URL to blob for later use
        canvas.toBlob((blob) => {
          if (blob) {
            setPhotoBlob(blob);
          }
        }, 'image/jpeg', 0.95);
        
        stopCamera();
      }
    }
  }, [stopCamera]);

  const resetPhoto = useCallback(() => {
    setPhotoTaken(null);
    setPhotoBlob(null);
    setVoiceText(null);
    setGeneratedFilename(null);
  }, []);
  
  const startVoiceRecording = useCallback(() => {
    if (!photoTaken) {
      toast({
        title: t.cameraError || "Error",
        description: "Please take a photo first",
        variant: "destructive"
      });
      return;
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        toast({
          title: t.listening || "Listening",
          description: t.processingAudio || "Speak now to name your photo",
        });
      } catch (error) {
        console.error('Error starting speech recognition:', error);
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
  }, [photoTaken, t]);

  const cancelConfirmation = useCallback(() => {
    setShowConfirmDialog(false);
    setVoiceText(null);
    setGeneratedFilename(null);
  }, []);

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

  // Save photo to gallery with generated filename
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

  // Clean up on unmount
  React.useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center space-y-3">
      {!photoTaken ? (
        <div className="relative w-full h-40 sm:h-48 bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isCameraOn ? 'block' : 'hidden'}`}
          />
          {!isCameraOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <div className="w-20 h-20 bg-gray-600 rounded-lg flex items-center justify-center">
                <Camera size={40} color="#d1d5db" />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="relative w-full h-40 sm:h-48 bg-gray-100 rounded-lg overflow-hidden">
          <img 
            src={photoTaken} 
            alt="Captured" 
            className="w-full h-full object-contain" 
          />
          {voiceText && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 text-sm">
              <p className="truncate">{voiceText}</p>
            </div>
          )}
        </div>
      )}
      
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="flex flex-wrap gap-2 justify-center">
        {!isCameraOn && !photoTaken && (
          <Button onClick={startCamera} className="bg-blue-500 hover:bg-blue-600" type="button">
            <Camera size={16} className="mr-2" />
            {t.startCamera || "Start Camera"}
          </Button>
        )}
        
        {isCameraOn && !photoTaken && (
          <>
            <Button onClick={takePhoto} className="bg-red-500 hover:bg-red-600" type="button">
              <Camera size={16} className="mr-2" />
              {t.takePhoto || "Take Photo"}
            </Button>
            <Button onClick={stopCamera} variant="outline" type="button">
              <X size={16} className="mr-2" />
              {t.stopCamera || "Stop Camera"}
            </Button>
          </>
        )}
        
        {photoTaken && (
          <>
            <Button 
              onClick={startVoiceRecording} 
              disabled={isRecording || isProcessing || isUploading || !!voiceText}
              className="bg-green-500 hover:bg-green-600"
              type="button"
            >
              <Mic size={16} className="mr-2" />
              {isRecording ? 
                (t.listening || "Listening...") : 
                (t.addVoiceComment || "Add Voice Comment")
              }
            </Button>
            
            <Button 
              onClick={savePhotoToGallery} 
              variant="secondary" 
              disabled={isUploading} 
              type="button"
              className="flex items-center gap-1"
            >
              <Download size={16} className="mr-2" />
              {t.saveToGallery || "Save to Gallery"}
            </Button>
            
            <Button 
              onClick={resetPhoto} 
              variant="outline" 
              disabled={isUploading || isRecording} 
              type="button"
            >
              <X size={16} className="mr-2" />
              {t.retakePhoto || "Retake"}
            </Button>
          </>
        )}
      </div>
      
      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.confirmPhotoName || "Confirm Photo Name"}</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <div className="flex items-center space-x-2 mb-4">
              <AlertCircle size={20} className="text-amber-500" />
              <p className="text-sm font-medium">
                {t.photoWillBeSavedAs || "Photo will be saved as:"}
              </p>
            </div>
            
            <div className="bg-gray-100 p-3 rounded-md mb-4">
              <p className="font-mono text-sm break-all">{generatedFilename}</p>
            </div>
            
            <p className="text-sm text-gray-600">
              {t.voiceTextRecognized || "Voice text recognized:"}
            </p>
            <p className="italic text-sm mt-1">"{voiceText}"</p>
          </div>
          
          <DialogFooter className="flex space-x-2">
            <Button variant="outline" onClick={cancelConfirmation} disabled={isUploading}>
              {t.cancel || "Cancel"}
            </Button>
            <Button onClick={uploadPhotoWithVoice} disabled={isUploading}>
              {isUploading ? 
                (t.uploading || "Uploading...") : 
                (t.confirmAndSend || "Confirm & Send")
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
