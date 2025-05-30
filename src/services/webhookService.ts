
import { SessionManager } from '@/utils/sessionManager';

export class WebhookService {
  private abortController: AbortController | null = null;

  async sendAudioToWebhook(audioBlob: Blob, webhookUrl: string): Promise<string> {
    // Cancel any previous request
    if (this.abortController) {
      this.abortController.abort();
    }

    const controller = new AbortController();
    this.abortController = controller;

    try {
      console.log('Sending audio to webhook:', webhookUrl);
      console.log('Audio blob size:', audioBlob.size, 'bytes');

      // Get session metadata
      const metadata = SessionManager.getMetadata();
      
      // Create form data with metadata and audio
      const formData = new FormData();
      
      // Add audio data
      formData.append('audio', audioBlob, 'speech.webm');
      
      // Add metadata fields
      formData.append('userId', metadata.userId);
      formData.append('sessionId', metadata.sessionId);
      formData.append('timestamp', metadata.timestamp);
      formData.append('contentType', 'audio/webm');
      
      // Also add JSON metadata as a single field for easier parsing
      const metadataJson = JSON.stringify({
        userId: metadata.userId,
        sessionId: metadata.sessionId,
        timestamp: metadata.timestamp,
        contentType: 'audio/webm'
      });
      formData.append('metadata', metadataJson);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        mode: 'cors',
        headers: {
          'Accept': 'audio/mpeg,application/json,*/*',
          'X-N8N-Test-Hook': 'true'
        }
      });

      console.log('Webhook response status:', response.status);
      console.log('Webhook response headers:', response.headers);

      // Special handling for 404 errors from n8n missing Respond to Webhook node
      if (response.status === 404) {
        console.warn('Received 404 from webhook - this is likely due to missing Respond to Webhook node in n8n');
        // Return a fallback response since we know the request was received but n8n can't respond properly
        return JSON.stringify({
          text: 'Kiitos viestistäsi! Valitettavasti palvelin ei pystynyt käsittelemään pyyntöäsi juuri nyt.',
          success: true
        });
      } else if (!response.ok) {
        throw new Error(`Palvelin vastasi virheellä: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Received JSON response:', data);
      
      // Handle the new response structure from n8n
      if (data.success && data.textResponse && data.audioResponse) {
        // Parse the textResponse which contains JSON
        let textData;
        try {
          textData = JSON.parse(data.textResponse);
        } catch (e) {
          console.warn('Could not parse textResponse as JSON, using as string');
          textData = { answer: data.textResponse };
        }
        
        // Check if audioResponse is a base64 string or binary data
        if (data.audioResponse && typeof data.audioResponse === 'string') {
          // Convert base64 audio to blob and create URL
          try {
            // Remove data URL prefix if present
            const base64Data = data.audioResponse.replace(/^data:audio\/[^;]+;base64,/, '');
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
            const audioUrl = URL.createObjectURL(audioBlob);
            console.log('Created audio URL from base64:', audioUrl);
            
            // Return the text answer but also store audio URL for playback
            return JSON.stringify({
              text: textData.answer || textData.response || 'Vastausta ei saatu.',
              audioUrl: audioUrl
            });
          } catch (error) {
            console.error('Error converting base64 audio:', error);
            return textData.answer || textData.response || 'Vastausta ei saatu.';
          }
        } else {
          // No audio or invalid audio format
          return textData.answer || textData.response || 'Vastausta ei saatu.';
        }
      } else {
        // Fallback for old response format
        return data.answer || data.response || 'Vastausta ei saatu.';
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Pyyntö keskeytetty');
      }
      console.error('Webhook error:', error);
      
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error('Verkkoyhteydessä on ongelma. Tarkista internetyhteys.');
      }
      
      throw new Error('Palvelinyhteys epäonnistui');
    }
  }

  cleanup() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}
