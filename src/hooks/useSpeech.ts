import { useCallback, useRef } from 'react';

// Speech Recognition types
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: {
    readonly length: number;
    item(index: number): {
      readonly length: number;
      item(index: number): {
        readonly transcript: string;
        readonly confidence: number;
      };
      [index: number]: {
        readonly transcript: string;
        readonly confidence: number;
      };
    };
    [index: number]: {
      readonly length: number;
      item(index: number): {
        readonly transcript: string;
        readonly confidence: number;
      };
      [index: number]: {
        readonly transcript: string;
        readonly confidence: number;
      };
    };
  };
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message?: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onstart: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
}

export interface SpeechHookReturn {
  ask: (question: string, language?: 'fi' | 'et' | 'en') => Promise<string>;
  speak: (text: string, language?: 'fi' | 'et' | 'en') => Promise<void>;
  isListening: boolean;
  isSpeaking: boolean;
}

export const useSpeech = (): SpeechHookReturn => {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef(false);
  const isSpeakingRef = useRef(false);

  const speak = useCallback(async (text: string, language: 'fi' | 'et' | 'en' = 'fi'): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Speech synthesis ei ole tuettu'));
        return;
      }

      // Pysäytetään mahdollinen käynnissä oleva puhe
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Kieliasetukset
      utterance.lang = language === 'fi' ? 'fi-FI' : language === 'et' ? 'et-EE' : 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Yritetään löytää paras ääni
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.lang.startsWith(utterance.lang) && voice.name.includes('Google')
      ) || voices.find(voice => voice.lang.startsWith(utterance.lang));
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        isSpeakingRef.current = true;
      };

      utterance.onend = () => {
        isSpeakingRef.current = false;
        resolve();
      };

      utterance.onerror = (event) => {
        isSpeakingRef.current = false;
        reject(new Error(`Puhesynteesi virhe: ${event.error}`));
      };

      window.speechSynthesis.speak(utterance);
    });
  }, []);

  const listen = useCallback(async (language: 'fi' | 'et' | 'en' = 'fi'): Promise<string> => {
    return new Promise((resolve, reject) => {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognitionAPI) {
        reject(new Error('Puheentunnistus ei ole tuettu'));
        return;
      }

      // Pysäytetään mahdollinen käynnissä oleva tunnistus
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      const recognition = new SpeechRecognitionAPI();
      recognitionRef.current = recognition;

      recognition.lang = language === 'fi' ? 'fi-FI' : language === 'et' ? 'et-EE' : 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isListeningRef.current = true;
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        isListeningRef.current = false;
        if (event.results && event.results.length > 0 && event.results[0].length > 0) {
          const transcript = event.results[0][0].transcript;
          resolve(transcript.trim());
        } else {
          reject(new Error('Ei tunnistettu puhetta'));
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        isListeningRef.current = false;
        reject(new Error(`Puheentunnistus virhe: ${event.error}`));
      };

      recognition.onend = () => {
        isListeningRef.current = false;
      };

      recognition.start();
      
      // Timeout 10 sekunnin kuluttua
      setTimeout(() => {
        if (isListeningRef.current) {
          recognition.stop();
          reject(new Error('Puheentunnistus aikakatkaisu'));
        }
      }, 10000);
    });
  }, []);

  const ask = useCallback(async (question: string, language: 'fi' | 'et' | 'en' = 'fi'): Promise<string> => {
    try {
      // Puhu kysymys
      await speak(question, language);
      
      // Odota 500ms ennen kuuntelun aloittamista
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Kuuntele vastaus
      const answer = await listen(language);
      return answer;
    } catch (error) {
      throw error;
    }
  }, [speak, listen]);

  return {
    ask,
    speak,
    isListening: isListeningRef.current,
    isSpeaking: isSpeakingRef.current
  };
}; 