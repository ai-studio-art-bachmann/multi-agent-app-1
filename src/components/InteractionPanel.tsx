import React, { useState, useEffect, useContext } from 'react';
import { VoiceButton } from '@/components/VoiceButton';
import { FileUploadComponent } from '@/components/FileUploadComponent';
import { VoiceAssistedCamera } from '@/components/VoiceAssistedCamera';
import { TabSelector, TabType } from '@/components/TabSelector';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { uploadFile } from '@/services/uploadService';
import { AppContext } from '@/context/AppContext';
import { useConversation } from '@/hooks/useConversation';

export const InteractionPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('audio');
  const { toast } = useToast();

  const context = useContext(AppContext);
  if (!context) throw new Error("InteractionPanel must be used within an AppProvider");
  const { language, webhookUrl } = context;

  const { voiceState, handleVoiceInteraction, isDisabled, isWaitingForClick, t } = useConversation();

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  const handleFileUpload = async (file: File) => {
    if (!webhookUrl) {
      toast({ title: "Webhook URL not configured", variant: "destructive" });
      return;
    }
    try {
      const success = await uploadFile(file, webhookUrl);
      if (success) {
        toast({
          title: t.fileSent,
          description: t.fileSentSuccess
        });
      } else {
        toast({
          title: t.unknownError,
          description: 'Failed to upload file',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: t.unknownError,
        description: 'Error uploading file',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    console.log(`Active tab in InteractionPanel: ${activeTab}`);
  }, [activeTab]);

  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg mt-2 mb-4">
      <TabSelector 
        currentTab={activeTab} 
        onTabChange={handleTabChange}
      />
      
      <div className="p-2 sm:p-3">
        <div className="flex flex-col items-center space-y-2">
          {activeTab === 'audio' && (
            <VoiceButton
              onClick={handleVoiceInteraction}
              isRecording={voiceState.isRecording}
              language={language}
            />
          )}
          
          {/* Voice-assisted camera - unified solution */}
          {activeTab === 'voiceCamera' && (
            <VoiceAssistedCamera />
          )}
          
          {/* Files tab */}
          {activeTab === 'files' && (
            <FileUploadComponent 
              onFileUpload={handleFileUpload}
            />
          )}
        </div>
      </div>
    </div>
  );
};
