import { useCallback, useRef, useState, useEffect } from 'react';

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
  speechSupported: boolean;
  showTextInput: boolean;
  textInputPrompt: string;
  handleTextInput: (text: string) => void;
}

export const useSpeech = (): SpeechHookReturn => {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputPrompt, setTextInputPrompt] = useState('');
  const textInputResolveRef = useRef<((value: string) => void) | null>(null);

  // Check speech API support on mount
  useEffect(() => {
    const checkSpeechSupport = () => {
      const hasRecognition = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
      const hasSynthesis = !!window.speechSynthesis;
      setSpeechSupported(hasRecognition && hasSynthesis);
      
      console.log('[useSpeech] Speech API support check:', {
        recognition: hasRecognition,
        synthesis: hasSynthesis,
        overall: hasRecognition && hasSynthesis
      });
    };

    checkSpeechSupport();
  }, []);

  const speak = useCallback(async (text: string, language: 'fi' | 'et' | 'en' = 'fi'): Promise<void> => {
    console.log('[useSpeech] speak called:', { text, language, speechSupported });
    
    if (!speechSupported || !('speechSynthesis' in window)) {
      console.log('[useSpeech] Speech synthesis not supported, skipping speak');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        // Stop any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        
        // Language settings
        utterance.lang = language === 'fi' ? 'fi-FI' : language === 'et' ? 'et-EE' : 'en-US';
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Try to find the best voice
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(voice => 
          voice.lang.startsWith(utterance.lang) && voice.name.includes('Google')
        ) || voices.find(voice => voice.lang.startsWith(utterance.lang));
        
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        utterance.onstart = () => {
          setIsSpeaking(true);
        };

        utterance.onend = () => {
          setIsSpeaking(false);
          resolve();
        };

        utterance.onerror = (event) => {
          setIsSpeaking(false);
          console.warn('[useSpeech] Speech synthesis error:', event.error);
          resolve(); // Don't reject, just resolve to continue the flow
        };

        window.speechSynthesis.speak(utterance);
      } catch (error) {
        setIsSpeaking(false);
        console.warn('[useSpeech] Speech synthesis failed:', error);
        resolve(); // Don't reject, just resolve to continue the flow
      }
    });
  }, [speechSupported]);

  const listen = useCallback(async (language: 'fi' | 'et' | 'en' = 'fi'): Promise<string> => {
    console.log('[useSpeech] listen called:', { language, speechSupported });
    
    if (!speechSupported) {
      throw new Error('Puheentunnistus ei ole tuettu');
    }

    return new Promise((resolve, reject) => {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognitionAPI) {
        reject(new Error('Puheentunnistus ei ole tuettu'));
        return;
      }

      try {
        // Stop any ongoing recognition
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
          setIsListening(true);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          setIsListening(false);
          if (event.results && event.results.length > 0 && event.results[0].length > 0) {
            const transcript = event.results[0][0].transcript;
            resolve(transcript.trim());
          } else {
            reject(new Error('Ei tunnistettu puhetta'));
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          setIsListening(false);
          reject(new Error(`Puheentunnistus virhe: ${event.error}`));
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.start();
        
        // Timeout after 10 seconds
        setTimeout(() => {
          if (isListening) {
            recognition.stop();
            reject(new Error('Puheentunnistus aikakatkaisu'));
          }
        }, 10000);
      } catch (error) {
        setIsListening(false);
        reject(error);
      }
    });
  }, [speechSupported, isListening]);

  const handleTextInput = useCallback((text: string) => {
    if (textInputResolveRef.current) {
      textInputResolveRef.current(text);
      textInputResolveRef.current = null;
      setShowTextInput(false);
      setTextInputPrompt('');
    }
  }, []);

  const askWithTextFallback = useCallback(async (question: string): Promise<string> => {
    return new Promise((resolve) => {
      setTextInputPrompt(question);
      setShowTextInput(true);
      textInputResolveRef.current = resolve;
    });
  }, []);

  const ask = useCallback(async (question: string, language: 'fi' | 'et' | 'en' = 'fi'): Promise<string> => {
    console.log('[useSpeech] ask called:', { question, language, speechSupported });
    
    try {
      if (speechSupported) {
        // Try speech first
        await speak(question, language);
        
        // Wait 500ms before starting to listen
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Listen for answer
        const answer = await listen(language);
        return answer;
      } else {
        // Fallback to text input
        console.log('[useSpeech] Using text input fallback');
        return await askWithTextFallback(question);
      }
    } catch (error) {
      console.warn('[useSpeech] Speech failed, falling back to text input:', error);
      // If speech fails, fall back to text input
      return await askWithTextFallback(question);
    }
  }, [speechSupported, speak, listen, askWithTextFallback]);

  return {
    ask,
    speak,
    isListening,
    isSpeaking,
    speechSupported,
    showTextInput,
    textInputPrompt,
    handleTextInput
  };
}; 