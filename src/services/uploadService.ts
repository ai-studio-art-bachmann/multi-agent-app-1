/**
 * Service for handling file and photo uploads to n8n webhook
 */
import { SessionManager } from '@/utils/sessionManager';

interface UploadMetadata {
  // Required metadata fields
  userId: string;
  sessionId: string;
  timestamp: string;
  
  // File-specific metadata
  contentType: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadType: 'file' | 'photo';
  deviceInfo?: string;
}

/**
 * Function to upload a file to the n8n webhook
 * 
 * @param file The file to upload
 * @param webhookUrl The n8n webhook URL
 * @returns Promise resolving to boolean indicating success
 */
export const uploadFile = async (file: File, webhookUrl: string): Promise<boolean> => {
  try {
    // Create a FormData object for the file upload
    const formData = new FormData();
    
    // Add the file
    formData.append('file', file);
    
    // Get session metadata
    const sessionMeta = SessionManager.getMetadata();
    
    // Create metadata for n8n processing
    const metadata: UploadMetadata = {
      // Required metadata fields
      userId: sessionMeta.userId,
      sessionId: sessionMeta.sessionId,
      timestamp: sessionMeta.timestamp,
      
      // File-specific metadata
      contentType: file.type,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type.split('/')[0] || 'unknown',
      uploadType: 'file',
      deviceInfo: navigator.userAgent
    };
    
    // Add metadata as JSON string
    formData.append('metadata', JSON.stringify(metadata));
    
    // Add individual metadata fields for easier n8n access
    formData.append('uploadType', 'file');
    formData.append('fileName', file.name);
    formData.append('fileType', file.type);
    
    console.log('Uploading file to webhook:', file.name);
    
    // Send the file to the webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      console.error('Upload failed with status:', response.status);
      throw new Error(`Upload failed with status: ${response.status}`);
    }

    console.log('File upload successful');
    return true;
  } catch (error) {
    console.error('Error uploading file:', error);
    return false;
  }
};

/**
 * Function to upload a photo to the n8n webhook
 * 
 * @param photoDataUrl The data URL of the photo
 * @param webhookUrl The n8n webhook URL
 * @returns Promise resolving to boolean indicating success
 */
export const uploadPhoto = async (photoDataUrl: string, webhookUrl: string): Promise<boolean> => {
  try {
    // Convert data URL to blob
    const response = await fetch(photoDataUrl);
    const blob = await response.blob();
    
    // Create a file from the blob with timestamp in filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `photo_${timestamp}.jpg`;
    const file = new File([blob], filename, { type: 'image/jpeg' });
    
    // Create a FormData object for the photo upload
    const formData = new FormData();
    
    // Add the photo file
    formData.append('file', file);
    
    // Get session metadata
    const sessionMeta = SessionManager.getMetadata();
    
    // Create metadata for n8n processing
    const metadata: UploadMetadata = {
      // Required metadata fields
      userId: sessionMeta.userId,
      sessionId: sessionMeta.sessionId,
      timestamp: sessionMeta.timestamp,
      
      // Photo-specific metadata
      contentType: 'image/jpeg',
      fileName: filename,
      fileSize: blob.size,
      fileType: 'image',
      uploadType: 'photo',
      deviceInfo: navigator.userAgent
    };
    
    // Add metadata as JSON string
    formData.append('metadata', JSON.stringify(metadata));
    
    // Add individual metadata fields for easier n8n access
    formData.append('uploadType', 'photo');
    formData.append('fileName', filename);
    formData.append('fileType', 'image/jpeg');
    
    console.log('Uploading photo to webhook:', filename);
    
    // Send the photo to the webhook
    const uploadResponse = await fetch(webhookUrl, {
      method: 'POST',
      body: formData
    });

    if (!uploadResponse.ok) {
      console.error('Photo upload failed with status:', uploadResponse.status);
      throw new Error(`Upload failed with status: ${uploadResponse.status}`);
    }

    console.log('Photo upload successful');
    return true;
  } catch (error) {
    console.error('Error uploading photo:', error);
    return false;
  }
};
