import { useCallback, useContext } from 'react';
import { useMicrophone } from './useMicrophone';
import { useAudioPlayer } from './useAudioPlayer';
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
  const { language, webhookUrl, messages, setMessages, voiceState, setVoiceState, isWaitingForClick, setIsWaitingForClick, reset } = context;

  const audioPlayer = useAudioPlayer();
  const microphone = useMicrophone();
  const t = getTranslations(language);

  const addMessage = useCallback((message: { type: 'user' | 'assistant' | 'system'; content: string; audioUrl?: string }) => {
    const messageManager = new MessageManager(messages);
    const newMessage = messageManager.addMessage(message);
    setMessages(prev => [...prev, newMessage]);
    if (message.audioUrl && message.type === 'assistant') {
      audioPlayer.playAudio(message.audioUrl);
    }
    return newMessage;
  }, [messages, setMessages, audioPlayer]);

  const handleVoiceInteraction = useCallback(async () => {
    try {
      if (isWaitingForClick) {
        setVoiceState(prev => ({ ...prev, status: 'sending', isRecording: false }));
        setIsWaitingForClick(false);
        addMessage({ type: 'system', content: t.stopRecording });
        const audioBlob = await microphone.stopRecording();
        if (audioBlob.size === 0) {
          throw new Error(t.recordingFailed);
        }
        addMessage({ type: 'user', content: t.processingAudio });
        setVoiceState(prev => ({ ...prev, status: 'waiting' }));
        addMessage({ type: 'system', content: t.sendingToServer });
        const webhookService = new WebhookService();
        const responseData = await webhookService.sendAudioToWebhook(audioBlob, webhookUrl, language);
        setVoiceState(prev => ({ ...prev, status: 'playing', isPlaying: true }));
        addMessage({ type: 'system', content: t.processingResponse });
        try {
          const parsed = JSON.parse(responseData);
          if (parsed.text && parsed.audioUrl) {
            addMessage({ type: 'assistant', content: parsed.text, audioUrl: parsed.audioUrl });
            addMessage({ type: 'system', content: t.playingAudio });
            await audioPlayer.playAudio(parsed.audioUrl);
          } else {
            addMessage({ type: 'assistant', content: parsed.text || responseData });
          }
        } catch (e) {
          if (responseData.startsWith('blob:')) {
            addMessage({ type: 'assistant', content: 'Äänivastaus', audioUrl: responseData });
            addMessage({ type: 'system', content: t.playingAudio });
            await audioPlayer.playAudio(responseData);
          } else {
            addMessage({ type: 'assistant', content: responseData });
          }
        }
        setVoiceState({ status: 'idle', isRecording: false, isPlaying: false, error: null });
        addMessage({ type: 'system', content: t.readyForNext });
      } else {
        setVoiceState(prev => ({ ...prev, status: 'recording', isRecording: true }));
        setIsWaitingForClick(true);
        addMessage({ type: 'system', content: t.startRecording });
        await microphone.startRecording();
        addMessage({ type: 'system', content: t.listeningClickWhenReady });
      }
    } catch (error) {
      microphone.cleanup();
      setVoiceState({ status: 'idle', isRecording: false, isPlaying: false, error: error instanceof Error ? error.message : t.unknownError });
      setIsWaitingForClick(false);
      toast({ title: t.voiceError, description: error instanceof Error ? error.message : t.tryAgain, variant: 'destructive' });
      addMessage({ type: 'system', content: `${t.voiceError}: ${error instanceof Error ? error.message : t.unknownError}` });
    }
  }, [isWaitingForClick, setVoiceState, setIsWaitingForClick, addMessage, t, microphone, webhookUrl, language, audioPlayer]);

  return {
    voiceState,
    handleVoiceInteraction,
    isDisabled: voiceState.status !== 'idle' && !isWaitingForClick,
    isWaitingForClick,
    messages,
    addMessage,
    reset,
    t,
  };
};
