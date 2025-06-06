import React, { useContext } from 'react';
import { Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getTranslations } from '@/utils/translations';
import { AppContext } from '@/context/AppContext';

interface VoiceButtonProps {
  onClick: () => void;
  isRecording: boolean;
  language: 'fi' | 'et' | 'en'; // Keep language prop for now if needed, but get `t` from context
}

const getButtonState = (isRecording: boolean, t: any) => {
  if (isRecording) {
    return {
      text: t.listening,
      color: 'bg-red-500 hover:bg-red-600',
      pulse: true
    };
  }
  
  return {
    text: t.startConversation,
    color: 'bg-blue-500 hover:bg-blue-600',
    pulse: false
  };
};

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  onClick,
  isRecording,
}) => {
  const context = useContext(AppContext);
  if (!context) throw new Error("VoiceButton must be used within an AppProvider");
  
  const t = getTranslations(context.language);
  const buttonState = getButtonState(isRecording, t);

  return (
    <div className="flex flex-col items-center space-y-4">
      <Button
        onClick={onClick}
        className={cn(
          'w-24 h-24 rounded-full transition-all duration-200 text-white',
          buttonState.color,
          buttonState.pulse && 'animate-slow-pulse',
        )}
        size="lg"
      >
        <Mic className="text-white" style={{ width: '44px', height: '44px' }} strokeWidth={1.5} />
      </Button>
      
      <p className="text-sm font-medium text-gray-700 text-center">
        {buttonState.text}
      </p>
    </div>
  );
};
