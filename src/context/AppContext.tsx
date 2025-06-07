import React, { createContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';
import { Message } from '@/utils/messages';
import { VoiceState } from '@/types/voice';

export type Language = 'fi' | 'et' | 'en';

interface AppContextType {
  language: Language;
  setLanguage: Dispatch<SetStateAction<Language>>;
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  webhookUrl: string | null;
  setWebhookUrl: Dispatch<SetStateAction<string | null>>;
  cameraWebhookUrl: string | null;
  setCameraWebhookUrl: Dispatch<SetStateAction<string | null>>;
  // Keskustelun flow
  voiceState: VoiceState;
  setVoiceState: Dispatch<SetStateAction<VoiceState>>;
  isWaitingForClick: boolean;
  setIsWaitingForClick: Dispatch<SetStateAction<boolean>>;
  reset: () => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('et');
  const [messages, setMessages] = useState<Message[]>([]);
  // Use the local proxy path. Vite will forward this to the target specified in vite.config.ts
  const [webhookUrl, setWebhookUrl] = useState<string | null>('/webhook/voice-assistant');
  const [cameraWebhookUrl, setCameraWebhookUrl] = useState<string | null>('/webhook-camera/image-upload');
  // Keskustelun flow
  const [voiceState, setVoiceState] = useState<VoiceState>({
    status: 'idle',
    isRecording: false,
    isPlaying: false,
    error: null
  });
  const [isWaitingForClick, setIsWaitingForClick] = useState(false);
  const reset = () => {
    setVoiceState({ status: 'idle', isRecording: false, isPlaying: false, error: null });
    setMessages([]);
    setIsWaitingForClick(false);
  };

  const value = {
    language,
    setLanguage,
    messages,
    setMessages,
    webhookUrl,
    setWebhookUrl,
    cameraWebhookUrl,
    setCameraWebhookUrl,
    voiceState,
    setVoiceState,
    isWaitingForClick,
    setIsWaitingForClick,
    reset
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}; 