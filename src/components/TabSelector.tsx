import React from 'react';
import { cn } from '@/lib/utils';
import { getTranslations } from '@/utils/translations';

export type TabType = 'audio' | 'files' | 'photoVoice' | 'voiceFlow';

interface TabSelectorProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  language: 'fi' | 'et' | 'en';
}

export const TabSelector: React.FC<TabSelectorProps> = ({
  currentTab,
  onTabChange,
  language
}) => {
  const t = getTranslations(language);
  
  const tabs = [
    { id: 'audio' as const, label: t.audioTab },
    { id: 'photoVoice' as const, label: t.photoVoiceTab },
    { id: 'voiceFlow' as const, label: t.voiceFlowTab },
    { id: 'files' as const, label: t.filesTab }
  ];

  return (
    <div className="flex w-full border-b border-gray-200">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => {
            console.log(`Tab button clicked: ${tab.id}, label: ${tab.label}`);
            onTabChange(tab.id);
          }}
          className={cn(
            "flex-1 text-center py-3 font-medium text-sm transition-colors",
            currentTab === tab.id
              ? "text-gray-900 border-b-2 border-orange-500"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
