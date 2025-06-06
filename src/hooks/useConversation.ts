import { useCallback, useContext } from 'react';
import { useMicrophone } from './useMicrophone';
import { useAudioPlayer } from './useAudioPlayer';
import { useConversationState } from './useConversationState';
import { toast } from '@/components/ui/use-toast';
import { Message, MessageManager } from '@/utils/messages';
import { WebhookService } from '@/services/webhookService';
import { getTranslations, Translations } from '@/utils/translations';
import { AppContext } from '@/context/AppContext';

export const useConversation = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useConversation must be used within an AppProvider');
  }
  const { language, messages, setMessages, webhookUrl } = context;

  const audioPlayer = useAudioPlayer();
  const t = getTranslations(language);

  const addMessage = useCallback((message: Omit<Message, 'id' | 'timestamp'>) => {
    const messageManager = new MessageManager(messages);
    const newMessage = messageManager.addMessage(message);
    setMessages(prev => [...prev, newMessage]);

    // If the message has audio, play it automatically.
    if (message.audio && message.sender === 'ai') {
        audioPlayer.playAudio(message.audio);
    }

    return newMessage;
  }, [messages, setMessages, audioPlayer]);


  const sendAudio = useCallback(async (audioBlob: Blob) => {
    if (!webhookUrl) {
      console.error("No webhook URL provided to sendAudio.");
      toast({ title: "Configuration Error", description: "Webhook URL is not set.", variant: "destructive" });
      return;
    }

    const webhookService = new WebhookService();
    
    addMessage({ sender: 'user', text: `[${t.sendingAudio}]` });

    try {
      const response = await webhookService.sendAudioToWebhook(audioBlob, webhookUrl, language);
      
      let text = t.defaultResponse;
      let audio = '';

      try {
        const parsed = JSON.parse(response);
        text = parsed.textResponse || parsed.text || t.defaultResponse;
        
        const audioKey = ['audioResponse', 'audio', 'data'].find(k => parsed[k]);
        if (audioKey && parsed[audioKey]) {
          let rawAudio = parsed[audioKey];
          if (rawAudio.startsWith('//')) rawAudio = rawAudio.substring(2);
          audio = `data:audio/mp3;base64,${rawAudio}`;
        }
      } catch (e) {
        text = response || t.defaultResponse;
      }
      
      addMessage({ sender: 'ai', text, audio });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t.unknownError;
      console.error("Error sending audio to webhook:", errorMessage);
      addMessage({ sender: 'ai', text: `${t.errorResponse}: ${errorMessage}` });
      toast({ title: t.voiceError, description: errorMessage, variant: 'destructive'});
    }
  }, [webhookUrl, language, addMessage, t]);


  return {
    messages,
    addMessage,
    sendAudio,
    t,
  };
};
