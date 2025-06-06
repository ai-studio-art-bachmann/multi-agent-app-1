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
import { useMicrophone } from '@/hooks/useMicrophone';

export const InteractionPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('audio');
  const { toast } = useToast();

  const context = useContext(AppContext);
  if (!context) throw new Error("InteractionPanel must be used within an AppProvider");
  const { language, webhookUrl, messages } = context;

  const { sendAudio, t } = useConversation();
  const microphone = useMicrophone();
  const [isRecording, setIsRecording] = useState(false);


  const handleTabChange = (tab: TabType) => {
    console.log(`Tab changed to: ${tab}`);
    // Stop recording if switching tabs
    if (isRecording) {
      microphone.stopRecording();
      setIsRecording(false);
    }
    setActiveTab(tab);
  };
  
  const handleVoiceInteraction = async () => {
    if (!isRecording) {
      try {
        await microphone.startRecording();
        setIsRecording(true);
        toast({ title: t.listening, description: t.clickToStop });
      } catch (error) {
        toast({ title: t.voiceError, description: (error as Error).message, variant: 'destructive' });
      }
    } else {
      try {
        const audioBlob = await microphone.stopRecording();
        setIsRecording(false);
        if (audioBlob.size > 100) { // Simple validation for non-empty recording
          sendAudio(audioBlob);
        } else {
          toast({ title: t.recordingFailed, description: t.tryAgain, variant: 'destructive' });
        }
      } catch (error) {
        toast({ title: t.voiceError, description: (error as Error).message, variant: 'destructive' });
      }
    }
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

  // Log the current active tab for debugging
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
              isRecording={isRecording}
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
