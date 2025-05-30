
export interface Translations {
  // Header texts
  headerTitle: string;
  headerSubtitle: string;
  
  // Voice button states
  startConversation: string;
  greetingInProgress: string;
  listening: string;
  sending: string;
  waitingResponse: string;
  playingResponse: string;
  readyForClick: string;
  
  // Chat messages
  startRecording: string;
  stopRecording: string;
  sendingToServer: string;
  processingResponse: string;
  playingAudio: string;
  readyForNext: string;
  startConversationPrompt: string;
  greetingPlayed: string;
  readyToListen: string;
  listeningClickWhenReady: string;
  processingAudio: string;
  
  // Buttons and controls
  resetConversation: string;
  
  // Empty state
  pressToStart: string;
  
  // Footer
  footerText: string;
  
  // Error messages
  voiceError: string;
  tryAgain: string;
  unknownError: string;
  recordingFailed: string;
  noAudioDetected: string;

  // Tab navigation
  audioTab: string;
  filesTab: string;
  cameraTab: string;
  photoVoiceTab: string;

  // Camera component
  startCamera: string;
  takePhoto: string;
  stopCamera: string;
  retakePhoto: string;
  sendPhoto: string;
  capturedPhoto: string;
  cameraPlaceholder: string;
  cameraError: string;
  cameraPermissionDenied: string;
  photoSent: string;
  photoSentSuccess: string;
  saveToGallery: string;
  photoSaved: string;
  photoSavedSuccess: string;
  saveError: string;
  uploadError: string;
  uploading: string;

  // PhotoVoice component
  addVoiceComment: string;
  confirmPhotoName: string;
  photoWillBeSavedAs: string;
  voiceTextRecognized: string;
  confirmAndSend: string;

  // File upload component
  selectFile: string;
  sendFile: string;
  cancel: string;
  dragDropFiles: string;
  orClickToUpload: string;
  selectedFile: string;
  fileSent: string;
  fileSentSuccess: string;
}

export const translations: Record<'fi' | 'et' | 'en', Translations> = {
  fi: {
    headerTitle: 'Älykästä apua työmaalle!',
    headerSubtitle: 'Ääniohjattu työkalu rakennustyömaalle',
    startConversation: 'Aloita keskustelu',
    greetingInProgress: 'Tervehdys käynnissä...',
    listening: 'Kuuntelen...',
    sending: 'Lähetän...',
    waitingResponse: 'Odotan vastausta...',
    playingResponse: 'Toistan vastausta...',
    readyForClick: 'Kliki kun olet valmis!',
    startRecording: 'Alusta puhuminen...',
    stopRecording: 'Pysäytän nauhoituksen...',
    sendingToServer: 'Lähetän palvelimelle...',
    processingResponse: 'Käsittelen vastausta...',
    playingAudio: 'Toistan äänivastauksen...',
    readyForNext: 'Valmis seuraavaan kysymykseen!',
    startConversationPrompt: 'Aloitan keskustelun...',
    greetingPlayed: 'Tervehdys toistettu!',
    readyToListen: 'Valmis kuuntelemaan!',
    listeningClickWhenReady: 'Kuuntelen... Kliki uuesti kun olet valmis!',
    processingAudio: 'Ääniviestin sisältö käsitellään...',
    resetConversation: 'Aloita alusta',
    pressToStart: 'Paina mikrofonia aloittaaksesi keskustelun',
    footerText: '© AI Studio Art Bachmann',
    voiceError: 'Virhe äänikäskyssä',
    tryAgain: 'Yritä uudelleen',
    unknownError: 'Tuntematon virhe',
    recordingFailed: 'Äänitallennus epäonnistui - ei ääntä havaittu',
    noAudioDetected: 'Ei ääntä havaittu',
    
    // Tab navigation
    audioTab: 'Ääni',
    filesTab: 'Tiedostot',
    cameraTab: 'Kamera',
    photoVoiceTab: 'Kuva+Ääni',
    
    // Camera component
    startCamera: 'Käynnistä kamera',
    takePhoto: 'Ota kuva',
    stopCamera: 'Pysäytä kamera',
    retakePhoto: 'Ota uusi kuva',
    sendPhoto: 'Lähetä kuva',
    capturedPhoto: 'Otettu kuva',
    cameraPlaceholder: 'Paina käynnistääksesi kameran',
    cameraError: 'Kameravirhe',
    cameraPermissionDenied: 'Kameran käyttöoikeus evätty',
    photoSent: 'Kuva lähetetty',
    photoSentSuccess: 'Kuva lähetetty onnistuneesti',
    saveToGallery: 'Tallenna galleriaan',
    photoSaved: 'Kuva tallennettu',
    photoSavedSuccess: 'Kuva tallennettu laitteellesi',
    saveError: 'Virhe tallennuksessa',
    uploadError: 'Virhe lähetyksessä',
    uploading: 'Lähetetään...',
    
    // PhotoVoice component
    addVoiceComment: 'Lisää äänikommentti',
    confirmPhotoName: 'Vahvista kuvan nimi',
    photoWillBeSavedAs: 'Kuva tallennetaan nimellä:',
    voiceTextRecognized: 'Tunnistettu äänikommentti:',
    confirmAndSend: 'Vahvista ja lähetä',
    
    // File upload component
    selectFile: 'Valitse tiedosto',
    sendFile: 'Lähetä tiedosto',
    cancel: 'Peruuta',
    dragDropFiles: 'Vedä ja pudota tiedostot tähän',
    orClickToUpload: 'tai klikkaa valitaksesi',
    selectedFile: 'Valittu tiedosto',
    fileSent: 'Tiedosto lähetetty',
    fileSentSuccess: 'Tiedosto lähetetty onnistuneesti'
  },
  et: {
    headerTitle: 'Nutikas abi ehitusplatsile!',
    headerSubtitle: 'Häälega juhitav tööriist ehitusplatsile',
    startConversation: 'Alusta vestlust',
    greetingInProgress: 'Tervitus käib...',
    listening: 'Kuulan...',
    sending: 'Saadan...',
    waitingResponse: 'Ootan vastust...',
    playingResponse: 'Mängin vastust...',
    readyForClick: 'Kliki kui oled valmis!',
    startRecording: 'Alusta rääkimist...',
    stopRecording: 'Peatan salvestamise...',
    sendingToServer: 'Saadan serverisse...',
    processingResponse: 'Töötlen vastust...',
    playingAudio: 'Mängin helivastust...',
    readyForNext: 'Valmis järgmiseks küsimuseks!',
    startConversationPrompt: 'Alustan vestlust...',
    greetingPlayed: 'Tervitus mängitud!',
    readyToListen: 'Valmis kuulama!',
    listeningClickWhenReady: 'Kuulan... Kliki uuesti kui oled valmis!',
    processingAudio: 'Helistsõnumi sisu töödeldakse...',
    resetConversation: 'Alusta otsast',
    pressToStart: 'Vajuta mikrofoni vestluse alustamiseks',
    footerText: '© AI Studio Art Bachmann',
    voiceError: 'Viga häälkäskluses',
    tryAgain: 'Proovi uuesti',
    unknownError: 'Tundmatu viga',
    recordingFailed: 'Helisalvestus ebaõnnestus - heli ei tuvastatud',
    noAudioDetected: 'Heli ei tuvastatud',
    
    // Tab navigation
    audioTab: 'Hääl',
    filesTab: 'Tiedostot',
    cameraTab: 'Kaamera',
    photoVoiceTab: 'Pilt+Hääl',
    
    // Camera component
    startCamera: 'Käivita kaamera',
    takePhoto: 'Tee pilt',
    stopCamera: 'Peata kaamera',
    retakePhoto: 'Tee uus pilt',
    sendPhoto: 'Saada pilt',
    capturedPhoto: 'Tehtud pilt',
    cameraPlaceholder: 'Vajuta kaamera käivitamiseks',
    cameraError: 'Kaamera viga',
    cameraPermissionDenied: 'Kaamera kasutamise õigus keelatud',
    photoSent: 'Pilt saadetud',
    photoSentSuccess: 'Pilt edukalt saadetud',
    saveToGallery: 'Salvesta galeriisse',
    photoSaved: 'Pilt salvestatud',
    photoSavedSuccess: 'Pilt salvestatud sinu seadmesse',
    saveError: 'Viga salvestamisel',
    uploadError: 'Viga saatmisel',
    uploading: 'Saatmine...',
    
    // PhotoVoice component
    addVoiceComment: 'Lisa häälkommentaar',
    confirmPhotoName: 'Kinnita pildi nimi',
    photoWillBeSavedAs: 'Pilt salvestatakse nimega:',
    voiceTextRecognized: 'Tuvastatud häälkommentaar:',
    confirmAndSend: 'Kinnita ja saada',
    
    // File upload component
    selectFile: 'Vali fail',
    sendFile: 'Saada fail',
    cancel: 'Tühista',
    dragDropFiles: 'Lohista ja kukuta failid siia',
    orClickToUpload: 'või klõpsa valimiseks',
    selectedFile: 'Valitud fail',
    fileSent: 'Fail saadetud',
    fileSentSuccess: 'Fail edukalt saadetud'
  },
  en: {
    headerTitle: 'Smart help for construction sites!',
    headerSubtitle: 'Voice-controlled tool for construction sites',
    startConversation: 'Start conversation',
    greetingInProgress: 'Greeting in progress...',
    listening: 'Listening...',
    sending: 'Sending...',
    waitingResponse: 'Waiting for response...',
    playingResponse: 'Playing response...',
    readyForClick: 'Click when ready!',
    startRecording: 'Start speaking...',
    stopRecording: 'Stopping recording...',
    sendingToServer: 'Sending to server...',
    processingResponse: 'Processing response...',
    playingAudio: 'Playing audio response...',
    readyForNext: 'Ready for next question!',
    startConversationPrompt: 'Starting conversation...',
    greetingPlayed: 'Greeting played!',
    readyToListen: 'Ready to listen!',
    listeningClickWhenReady: 'Listening... Click again when ready!',
    processingAudio: 'Audio message content being processed...',
    resetConversation: 'Start over',
    pressToStart: 'Press microphone to start conversation',
    footerText: '© AI Studio Art Bachmann',
    voiceError: 'Voice command error',
    tryAgain: 'Try again',
    unknownError: 'Unknown error',
    recordingFailed: 'Audio recording failed - no audio detected',
    noAudioDetected: 'No audio detected',
    
    // Tab navigation
    audioTab: 'Audio',
    filesTab: 'Files',
    cameraTab: 'Camera',
    photoVoiceTab: 'Photo+Voice',
    
    // Camera component
    startCamera: 'Start camera',
    takePhoto: 'Take photo',
    stopCamera: 'Stop camera',
    retakePhoto: 'Retake photo',
    sendPhoto: 'Send photo',
    capturedPhoto: 'Captured photo',
    cameraPlaceholder: 'Press to start camera',
    cameraError: 'Camera error',
    cameraPermissionDenied: 'Camera permission denied',
    photoSent: 'Photo sent',
    photoSentSuccess: 'Photo sent successfully',
    saveToGallery: 'Save to Gallery',
    photoSaved: 'Photo saved',
    photoSavedSuccess: 'Photo saved to your device',
    saveError: 'Save error',
    uploadError: 'Upload error',
    uploading: 'Uploading...',
    
    // PhotoVoice component
    addVoiceComment: 'Add voice comment',
    confirmPhotoName: 'Confirm photo name',
    photoWillBeSavedAs: 'Photo will be saved as:',
    voiceTextRecognized: 'Voice text recognized:',
    confirmAndSend: 'Confirm & Send',
    
    // File upload component
    selectFile: 'Select file',
    sendFile: 'Send file',
    cancel: 'Cancel',
    dragDropFiles: 'Drag and drop files here',
    orClickToUpload: 'or click to upload',
    selectedFile: 'Selected file',
    fileSent: 'File sent',
    fileSentSuccess: 'File sent successfully'
  }
};

export const getTranslations = (language: 'fi' | 'et' | 'en'): Translations => {
  return translations[language];
};
