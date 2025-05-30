import React, { useState } from 'react';
import { DynamicResponsePanel } from '@/components/DynamicResponsePanel';
import { LanguageSelector } from '@/components/LanguageSelector';
import { InteractionPanel } from '@/components/InteractionPanel';
import { useConversation } from '@/hooks/useConversation';
import { ConversationConfig } from '@/types/voice';
import { getTranslations } from '@/utils/translations';

const Index = () => {
  const [config, setConfig] = useState<ConversationConfig>({
    language: 'fi',
    webhookUrl: 'https://n8n.artbachmann.eu/webhook/voice-assistant'
  });

  const conversation = useConversation(config);
  const t = getTranslations(config.language);

  const handleLanguageChange = (language: ConversationConfig['language']) => {
    setConfig(prev => ({ ...prev, language }));
    conversation.reset();
  };

  const handleReset = () => {
    conversation.reset();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex flex-col h-[100svh] overflow-hidden">
      {/* Header - narrow width like other sections */}
      <div className="max-w-sm mx-auto w-full px-2">
        <header className="bg-white/95 backdrop-blur-sm shadow-lg border-b border-orange-100 rounded-b-3xl">
          <div className="px-6 py-6">
            <h1 className="text-3xl font-bold text-center text-[#184560] mb-2">
              {t.headerTitle}
            </h1>
            <p className="text-sm text-gray-600 text-center leading-relaxed">
              {t.headerSubtitle}
            </p>
          </div>
        </header>
      </div>

      {/* Language Selector - narrow width */}
      <div className="max-w-sm mx-auto w-full px-2">
        <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 mt-2 rounded-xl">
          <LanguageSelector
            currentLanguage={config.language}
            onLanguageChange={handleLanguageChange}
          />
        </div>
      </div>

      {/* Main Content - all sections now have consistent narrow width */}
      <div className="flex-1 max-w-sm mx-auto w-full flex flex-col px-2 mt-2 overflow-hidden">
        {/* Chat Panel */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 flex-1 overflow-hidden">
          <DynamicResponsePanel 
            messages={conversation.messages} 
            language={config.language}
          />
        </div>

        {/* Interaction Panel with Tabs for Voice, Camera, and Files */}
        <InteractionPanel
          voiceState={conversation.voiceState}
          onVoiceInteraction={conversation.handleVoiceInteraction}
          isVoiceDisabled={conversation.isDisabled}
          isWaitingForClick={conversation.isWaitingForClick}
          language={config.language}
          webhookUrl={config.webhookUrl}
          onReset={handleReset}
          hasMessages={conversation.messages.length > 0}
        />
      </div>

      {/* Footer - narrow width */}
      <div className="max-w-sm mx-auto w-full px-2">
        <footer className="bg-white/80 backdrop-blur-sm border-t border-gray-200 py-2 rounded-t-xl">
          <p className="text-xs sm:text-sm text-gray-500 text-center font-medium">
            {t.footerText}
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
