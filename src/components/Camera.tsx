import React, { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { getTranslations } from '@/utils/translations';
import { Download } from 'lucide-react';

interface CameraProps {
  webhookUrl: string;
  language: 'fi' | 'et' | 'en';
}

export const Camera: React.FC<CameraProps> = ({ webhookUrl, language }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [photoTaken, setPhotoTaken] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const t = getTranslations(language);

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
        stopCamera();
      }
    }
  }, [stopCamera]);

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

  // Clean up on unmount
  React.useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center space-y-3">
      {!photoTaken ? (
        <div className="relative w-full h-32 sm:h-40 bg-black rounded-lg overflow-hidden">
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
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
              </div>
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
          <Button onClick={startCamera} className="bg-blue-500 hover:bg-blue-600" type="button">
            {t.startCamera || "Start Camera"}
          </Button>
        )}
        
        {isCameraOn && !photoTaken && (
          <>
            <Button onClick={takePhoto} className="bg-red-500 hover:bg-red-600" type="button">
              {t.takePhoto || "Take Photo"}
            </Button>
            <Button onClick={stopCamera} variant="outline" type="button">
              {t.stopCamera || "Stop Camera"}
            </Button>
          </>
        )}
        
        {photoTaken && (
          <>
            <Button 
              onClick={uploadPhoto} 
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
              onClick={savePhotoToGallery} 
              variant="secondary" 
              disabled={isUploading} 
              type="button"
              className="flex items-center gap-1"
            >
              <Download size={16} />
              {t.saveToGallery || "Save to Gallery"}
            </Button>
            <Button 
              onClick={resetPhoto} 
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
