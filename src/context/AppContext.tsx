import React, { createContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';
import { Message } from '@/utils/messages';

export type Language = 'fi' | 'et' | 'en';

interface AppContextType {
  language: Language;
  setLanguage: Dispatch<SetStateAction<Language>>;
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  webhookUrl: string | null;
  setWebhookUrl: Dispatch<SetStateAction<string | null>>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('fi');
  const [messages, setMessages] = useState<Message[]>([]);
  // Use the local proxy path. Vite will forward this to the target specified in vite.config.ts
  const [webhookUrl, setWebhookUrl] = useState<string | null>('/webhook/voice-assistant');

  const value = {
    language,
    setLanguage,
    messages,
    setMessages,
    webhookUrl,
    setWebhookUrl
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}; 