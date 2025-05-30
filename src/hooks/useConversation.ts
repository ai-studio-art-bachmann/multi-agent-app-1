
import { useCallback } from 'react';
import { ConversationConfig } from '@/types/voice';
import { useMicrophone } from './useMicrophone';
import { useAudioPlayer } from './useAudioPlayer';
import { useConversationState } from './useConversationState';
import { toast } from '@/hooks/use-toast';
import { MessageManager } from '@/utils/messages';
import { WebhookService } from '@/services/webhookService';
import { getTranslations } from '@/utils/translations';

export const useConversation = (config: ConversationConfig) => {
  const state = useConversationState();
  const microphone = useMicrophone();
  const audioPlayer = useAudioPlayer();
  const t = getTranslations(config.language);
  
  const messageManager = new MessageManager();
  const webhookService = new WebhookService();

  const addSystemMessage = useCallback((content: string) => {
    const message = messageManager.addSystemMessage(content);
    state.addMessage(message);
  }, [state]);

  const addUserMessage = useCallback((content: string) => {
    const message = messageManager.addMessage({
      type: 'user',
      content
    });
    state.addMessage(message);
    return message;
  }, [state]);

  const addAssistantMessage = useCallback((content: string, audioUrl?: string) => {
    const message = messageManager.addMessage({
      type: 'assistant',
      content,
      audioUrl
    });
    state.addMessage(message);
    return message;
  }, [state]);

  const stopRecordingAndSend = useCallback(async () => {
    try {
      // Stop any playing audio before processing new request
      audioPlayer.stopAudio();
      
      state.setVoiceState(prev => ({ ...prev, status: 'sending', isRecording: false }));
      state.setIsWaitingForClick(false);
      addSystemMessage(t.stopRecording);
      
      const audioBlob = await microphone.stopRecording();
      
      if (audioBlob.size === 0) {
        throw new Error(t.recordingFailed);
      }
      
      console.log('Audio recorded successfully, size:', audioBlob.size);
      
      addUserMessage(t.processingAudio);

      state.setVoiceState(prev => ({ ...prev, status: 'waiting' }));
      addSystemMessage(t.sendingToServer);

      // Get response data from webhook service (might be a fallback response if webhook returns 404)
      const responseData = await webhookService.sendAudioToWebhook(audioBlob, config.webhookUrl);
      console.log('Received response data:', responseData);

      state.setVoiceState(prev => ({ ...prev, status: 'playing', isPlaying: true }));
      addSystemMessage(t.processingResponse);

      // Check if response contains both text and audio
      try {
        const parsedResponse = JSON.parse(responseData);
        if (parsedResponse.text && parsedResponse.audioUrl) {
          // We have both text and audio
          addAssistantMessage(parsedResponse.text, parsedResponse.audioUrl);
          addSystemMessage(t.playingAudio);
          await audioPlayer.playAudio(parsedResponse.audioUrl);
        } else {
          // Only text response
          addAssistantMessage(parsedResponse.text || responseData);
        }
      } catch (e) {
        // Not JSON, treat as plain text or audio URL
        if (responseData.startsWith('blob:')) {
          addAssistantMessage('Äänivastaus', responseData);
          addSystemMessage(t.playingAudio);
          await audioPlayer.playAudio(responseData);
        } else {
          addAssistantMessage(responseData);
        }
      }

      state.setVoiceState({
        status: 'idle',
        isRecording: false,
        isPlaying: false,
        error: null
      });
      addSystemMessage(t.readyForNext);

    } catch (error) {
      console.error('Voice interaction error:', error);
      
      microphone.cleanup();
      
      state.setVoiceState({
        status: 'idle',
        isRecording: false,
        isPlaying: false,
        error: error instanceof Error ? error.message : t.unknownError
      });

      toast({
        title: t.voiceError,
        description: error instanceof Error ? error.message : t.tryAgain,
        variant: "destructive"
      });

      addSystemMessage(`${t.voiceError}: ${error instanceof Error ? error.message : t.unknownError}`);
    }
  }, [microphone, audioPlayer, config.webhookUrl, state, addSystemMessage, addUserMessage, addAssistantMessage, t]);

  const handleVoiceInteraction = useCallback(async () => {
    try {
      // Stop any playing audio before starting new interaction
      audioPlayer.stopAudio();
      
      // If waiting for click to stop recording
      if (state.isWaitingForClick) {
        await stopRecordingAndSend();
        return;
      }

      // First interaction: try to play greeting
      if (state.isFirstInteraction) {
        state.setVoiceState(prev => ({ ...prev, status: 'greeting' }));
        addSystemMessage(t.startConversationPrompt);
        
        try {
          await audioPlayer.playGreeting();
          addSystemMessage(t.greetingPlayed);
        } catch (error) {
          console.warn('Greeting audio failed, continuing without it:', error);
          addSystemMessage(t.readyToListen);
        }
        
        state.setIsFirstInteraction(false);
      }

      // Start recording
      state.setVoiceState(prev => ({ ...prev, status: 'recording', isRecording: true }));
      state.setIsWaitingForClick(true);
      addSystemMessage(t.startRecording);
      
      await microphone.startRecording();
      addSystemMessage(t.listeningClickWhenReady);

      // No automatic timeout - user controls when to send

    } catch (error) {
      console.error('Voice interaction error:', error);
      
      microphone.cleanup();
      
      state.setVoiceState({
        status: 'idle',
        isRecording: false,
        isPlaying: false,
        error: error instanceof Error ? error.message : t.unknownError
      });
      state.setIsWaitingForClick(false);

      toast({
        title: t.voiceError,
        description: error instanceof Error ? error.message : t.tryAgain,
        variant: "destructive"
      });

      addSystemMessage(`${t.voiceError}: ${error instanceof Error ? error.message : t.unknownError}`);
    }
  }, [state, microphone, audioPlayer, stopRecordingAndSend, addSystemMessage, t]);

  const reset = useCallback(() => {
    microphone.cleanup();
    audioPlayer.stopAudio();
    webhookService.cleanup();
    state.reset();
    messageManager.reset();
  }, [microphone, audioPlayer, state]);

  return {
    voiceState: state.voiceState,
    messages: state.messages,
    handleVoiceInteraction,
    reset,
    isDisabled: state.voiceState.status !== 'idle' && !state.isWaitingForClick,
    isWaitingForClick: state.isWaitingForClick
  };
};
