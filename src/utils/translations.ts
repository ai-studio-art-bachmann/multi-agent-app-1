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
  voiceFlowTab: string;
  voiceCameraTab: string;

  // Camera component
  startCamera: string;
  takePhoto: string;
  stopCamera: string;
  retakePhoto: string;
  sendPhoto: string;
  capturedPhoto: string;
  capturedPhotoAlt: string;
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
  invalidWebhookUrl: string;
  configureWebhook: string;
  networkError: string;
  photoAnalyzed: string;
  uploadSuccess: string;
  audioProcessingFailed: string;
  missingPhotoOrName: string;

  // PhotoVoice component
  addVoiceComment: string;
  confirmPhotoName: string;
  photoWillBeSavedAs: string;
  voiceTextRecognized: string;
  confirmAndSend: string;
  processingStatus: string;
  resetButtonLabel: string;
  savePhotoButtonLabel: string;
  recordingStatus: string;
  generatedFilenameLabel: string;
  uploadConfirmQuestionPrompt: string;
  uploadButtonLabel: string;

  // Camera component - File Naming by Voice
  giveFileNameByVoice: string;
  tryNamingAgain: string;
  fileNameRecognizedAs: string;
  photoWillBeSentAs: string;
  dictateFileName: string;
  stopDictating: string;
  processingName: string;
  noSpeechDetected: string;
  recognitionError: string;
  voiceNamingNotAvailable: string;
  noPhotoOrFilenameError: string;
  
  // Photo analysis and audio
  analysisResult: string;
  playAnalysis: string;
  playingAnalysisAudio: string;
  audioError: string;
  audioPlayError: string;
  analysisError: string;
  analysisFailedMessage: string;
  responseParseError: string;
  invalidResponseFormat: string;
  zoomInLabel: string;
  zoomOutLabel: string;
  zoomErrorTitle: string;
  zoomErrorDescription: string;
  switchToFrontCamera: string;
  switchToBackCamera: string;
  switchingCameraText: string;
  zoomSlider: string;

  // File upload component
  selectFile: string;
  sendFile: string;
  cancel: string;
  dragDropFiles: string;
  orClickToUpload: string;
  selectedFile: string;
  fileSent: string;
  fileSentSuccess: string;

  // CameraVoiceFlow component
  takingPhoto: string;
  askingForFileName: string;
  wantToHearAnalysis: string;
  yesHearAnalysis: string;
  noSkipAnalysis: string;
  processingAnalysis: string;
  savingToDatabase: string;
  operationComplete: string;
  operationFailed: string;
  cameraVoiceFlowError: string;
  offlineSavedForLater: string;
  syncWhenOnline: string;
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
    footerText: ' AI Studio Art Bachmann',
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
    voiceFlowTab: 'ÄäniVirta',
    voiceCameraTab: 'ÄäniKamera',
    
    // Camera component
    startCamera: 'Käynnistä kamera',
    takePhoto: 'Ota kuva',
    stopCamera: 'Pysäytä kamera',
    retakePhoto: 'Ota uusi kuva',
    sendPhoto: 'Lähetä kuva',
    capturedPhoto: 'Otettu kuva',
    capturedPhotoAlt: 'Otettu kuva',
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
    processingStatus: 'Käsitellään...',
    resetButtonLabel: 'Nollaa',
    savePhotoButtonLabel: 'Tallenna kuva',
    recordingStatus: 'Nauhoitetaan...',
    generatedFilenameLabel: 'Luotu tiedostonimi:',
    uploadConfirmQuestionPrompt: 'Haluatko ladata kuvan tällä nimellä?',
    uploadButtonLabel: 'Lataa',
    
    // Camera component - File Naming by Voice
    giveFileNameByVoice: 'Anna tiedostonimi äänellä',
    tryNamingAgain: 'Yritä nimeämistä uudelleen',
    fileNameRecognizedAs: 'Tiedostonimi tunnistettu:',
    photoWillBeSentAs: 'Kuva lähetetään nimellä:',
    dictateFileName: 'Aloita nimen saneleminen',
    stopDictating: 'Lopeta nimen saneleminen',
    processingName: 'Käsitellään nimeä...',
    noSpeechDetected: 'Puhetta ei havaittu',
    recognitionError: 'Virhe puheen tunnistuksessa',
    voiceNamingNotAvailable: 'Ääninimeäminen ei ole käytettävissä',
    noPhotoOrFilenameError: 'Ei kuvaa tai tiedostonimeä',
    
    // Photo analysis and audio
    analysisResult: 'Analyysin tulos',
    playAnalysis: 'Toista analyysi',
    playingAnalysisAudio: 'Toistetaan...',
    audioError: 'Äänivirhe',
    audioPlayError: 'Äänen toistaminen epäonnistui',
    analysisError: 'Analyysivirhe',
    analysisFailedMessage: 'Kuvan analyysi epäonnistui',
    responseParseError: 'Vastauksen käsittelyvirhe',
    invalidResponseFormat: 'Virheellinen vastausmuoto',
    zoomInLabel: 'Lähennä',
    zoomOutLabel: 'Loitonna',
    zoomErrorTitle: 'Zoomausvirhe',
    zoomErrorDescription: 'Zoomaustason asettaminen epäonnistui',
    switchToFrontCamera: 'Vaihda etukameraan',
    switchToBackCamera: 'Vaihda takakameraan',
    switchingCameraText: 'Vaihdetaan kameraa...',
    zoomSlider: 'Zoomaustaso',

    // File upload component
    selectFile: 'Valitse tiedosto',
    sendFile: 'Lähetä tiedosto',
    cancel: 'Peruuta',
    dragDropFiles: 'Vedä ja pudota tiedostot tähän',
    orClickToUpload: 'tai klikkaa valitaksesi',
    selectedFile: 'Valittu tiedosto',
    fileSent: 'Tiedosto lähetetty',
    fileSentSuccess: 'Tiedosto lähetetty onnistuneesti',
    invalidWebhookUrl: 'Virheellinen webhook-osoite',
    configureWebhook: 'Määritä webhook-osoite',
    networkError: 'Verkkovirhe',
    photoAnalyzed: 'Kuva analysoitu',
    uploadSuccess: 'Lähetys onnistui',
    audioProcessingFailed: 'Äänen käsittely epäonnistui',
    missingPhotoOrName: 'Kuva tai tiedostonimi puuttuu',

    // CameraVoiceFlow component
    takingPhoto: 'Otan kuvan...',
    askingForFileName: 'Anna tiedoston nimi',
    wantToHearAnalysis: 'Haluatko kuulla analyysin nyt?',
    yesHearAnalysis: 'Kyllä',
    noSkipAnalysis: 'Ei',
    processingAnalysis: 'Käsittelen analyysiä...',
    savingToDatabase: 'Tallennan tietokantaan...',
    operationComplete: 'Toiminto valmis!',
    operationFailed: 'Toiminto epäonnistui',
    cameraVoiceFlowError: 'Kameran ääniohjaus virhe',
    offlineSavedForLater: 'Tallennettu offline-tilaan',
    syncWhenOnline: 'Synkronoidaan kun verkko palaa'
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
    footerText: ' AI Studio Art Bachmann',
    voiceError: 'Viga häälkäskluses',
    tryAgain: 'Proovi uuesti',
    unknownError: 'Tundmatu viga',
    recordingFailed: 'Helisalvestus ebaõnnestus - heli ei tuvastatud',
    noAudioDetected: 'Heli ei tuvastatud',
    
    // Tab navigation
    audioTab: 'Hääl',
    filesTab: 'Failid',
    cameraTab: 'Kaamera',
    photoVoiceTab: 'Pilt+Hääl',
    voiceFlowTab: 'Häälevoog',
    voiceCameraTab: 'HääleKaamera',
    
    // Camera component
    startCamera: 'Käivita kaamera',
    takePhoto: 'Tee pilt',
    stopCamera: 'Peata kaamera',
    retakePhoto: 'Tee uus pilt',
    sendPhoto: 'Saada pilt',
    capturedPhoto: 'Tehtud pilt',
    capturedPhotoAlt: 'Tehtud pilt',
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
    processingStatus: 'Töötlemisel...',
    resetButtonLabel: 'Lähtesta',
    savePhotoButtonLabel: 'Salvesta pilt',
    recordingStatus: 'Salvestan...',
    generatedFilenameLabel: 'Genereeritud failinimi:',
    uploadConfirmQuestionPrompt: 'Kas soovid pildi selle nimega üles laadida?',
    uploadButtonLabel: 'Laadi üles',
    
    // Camera component - File Naming by Voice
    giveFileNameByVoice: 'Nimeta fail häälega',
    tryNamingAgain: 'Proovi uuesti nimetada',
    fileNameRecognizedAs: 'Failinimi tuvastati:',
    photoWillBeSentAs: 'Foto saadetakse nimega:',
    dictateFileName: 'Alusta failinime dikteerimist',
    stopDictating: 'Lõpeta dikteerimine',
    processingName: 'Töötlen nime...',
    noSpeechDetected: 'Kõnet ei tuvastatud',
    recognitionError: 'Kõne tuvastamise viga',
    voiceNamingNotAvailable: 'Hääle nimetamine pole saadaval',
    noPhotoOrFilenameError: 'Foto või failinimi puudub',
    
    // Photo analysis and audio
    analysisResult: 'Analüüsi tulemus',
    playAnalysis: 'Mängi analüüsi',
    playingAnalysisAudio: 'Mängin...',
    audioError: 'Heliviga',
    audioPlayError: 'Heli esitamine ebaõnnestus',
    analysisError: 'Analüüsi viga',
    analysisFailedMessage: 'Pildi analüüs ebaõnnestus',
    responseParseError: 'Vastuse töötlemise viga',
    invalidResponseFormat: 'Vigane vastuse formaat',
    zoomInLabel: 'Suurenda',
    zoomOutLabel: 'Vähenda',
    zoomErrorTitle: 'Suumimise viga',
    zoomErrorDescription: 'Suumi taseme seadistamine ebaõnnestus',
    switchToFrontCamera: 'Lülitu eesmisele kaamerale',
    switchToBackCamera: 'Lülitu tagumisele kaamerale',
    switchingCameraText: 'Kaamerate vahetamine...',
    zoomSlider: 'Suumi kontroll',

    // File upload component
    selectFile: 'Vali fail',
    sendFile: 'Saada fail',
    cancel: 'Tühista',
    dragDropFiles: 'Lohista ja kukuta failid siia',
    orClickToUpload: 'või klõpsa valimiseks',
    selectedFile: 'Valitud fail',
    fileSent: 'Fail saadetud',
    fileSentSuccess: 'Fail edukalt saadetud',
    invalidWebhookUrl: 'Vigane webhook URL',
    configureWebhook: 'Seadista webhook',
    networkError: 'Võrgu viga',
    photoAnalyzed: 'Foto analüüsitud',
    uploadSuccess: 'Üleslaadimine õnnestus',
    audioProcessingFailed: 'Heli töötlemine ebaõnnestus',
    missingPhotoOrName: 'Foto või failinimi puudub',

    // CameraVoiceFlow component
    takingPhoto: 'Teen pilti...',
    askingForFileName: 'Anna faili nimi',
    wantToHearAnalysis: 'Kas tahad kuulda analüüsi nüüd?',
    yesHearAnalysis: 'Jah',
    noSkipAnalysis: 'Ei',
    processingAnalysis: 'Töötlen analüüsi...',
    savingToDatabase: 'Salvendan andmebaasi...',
    operationComplete: 'Toiming lõpetatud!',
    operationFailed: 'Toiming ebaõnnestus',
    cameraVoiceFlowError: 'Kaamera häälkomandite viga',
    offlineSavedForLater: 'Salvestatud offline-režiimis',
    syncWhenOnline: 'Sünkroniseeritakse kui ühendus taastub'
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
    footerText: ' AI Studio Art Bachmann',
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
    voiceCameraTab: 'VoiceCamera',
    
    // Camera component
    startCamera: 'Start camera',
    takePhoto: 'Take photo',
    stopCamera: 'Stop camera',
    retakePhoto: 'Retake photo',
    sendPhoto: 'Send photo',
    capturedPhoto: 'Captured photo',
    capturedPhotoAlt: 'Captured photo',
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
    confirmAndSend: 'Confirm and Send',
    processingStatus: 'Processing...',
    resetButtonLabel: 'Reset',
    savePhotoButtonLabel: 'Save Photo',
    recordingStatus: 'Recording...',
    generatedFilenameLabel: 'Generated filename:',
    uploadConfirmQuestionPrompt: 'Do you want to upload the photo with this name?',
    uploadButtonLabel: 'Upload',
    
    // Camera component - File Naming by Voice
    giveFileNameByVoice: 'Give filename by voice',
    tryNamingAgain: 'Try naming again',
    fileNameRecognizedAs: 'Filename recognized as:',
    photoWillBeSentAs: 'Photo will be sent as:',
    dictateFileName: 'Start dictating name',
    stopDictating: 'Stop dictating name',
    processingName: 'Processing name...',
    noSpeechDetected: 'No speech detected',
    recognitionError: 'Speech recognition error',
    voiceNamingNotAvailable: 'Voice naming not available',
    noPhotoOrFilenameError: 'No photo or filename',
    
    // Photo analysis and audio
    analysisResult: 'Analysis Result',
    playAnalysis: 'Play Analysis',
    playingAnalysisAudio: 'Playing...',
    audioError: 'Audio Error',
    audioPlayError: 'Failed to play audio',
    analysisError: 'Analysis Error',
    analysisFailedMessage: 'Image analysis failed',
    responseParseError: 'Response Processing Error',
    invalidResponseFormat: 'Invalid response format',
    zoomInLabel: 'Zoom In',
    zoomOutLabel: 'Zoom Out',
    zoomErrorTitle: 'Zoom Error',
    zoomErrorDescription: 'Failed to set zoom level',
    switchToFrontCamera: 'Switch to front camera',
    switchToBackCamera: 'Switch to back camera',
    switchingCameraText: 'Switching camera...',
    zoomSlider: 'Zoom control',

    // File upload component
    selectFile: 'Select file',
    sendFile: 'Send file',
    cancel: 'Cancel',
    dragDropFiles: 'Drag and drop files here',
    orClickToUpload: 'or click to upload',
    selectedFile: 'Selected file',
    fileSent: 'File sent',
    fileSentSuccess: 'File sent successfully',
    invalidWebhookUrl: 'Invalid webhook URL',
    configureWebhook: 'Configure webhook',
    networkError: 'Network error',
    photoAnalyzed: 'Photo analyzed',
    uploadSuccess: 'Upload successful',
    audioProcessingFailed: 'Audio processing failed',
    missingPhotoOrName: 'Missing photo or filename',

    // CameraVoiceFlow component
    takingPhoto: 'Taking photo...',
    askingForFileName: 'Give file name',
    wantToHearAnalysis: 'Do you want to hear the analysis now?',
    yesHearAnalysis: 'Yes',
    noSkipAnalysis: 'No',
    processingAnalysis: 'Processing analysis...',
    savingToDatabase: 'Saving to database...',
    operationComplete: 'Operation complete!',
    operationFailed: 'Operation failed',
    cameraVoiceFlowError: 'Camera voice flow error',
    offlineSavedForLater: 'Saved offline for later',
    syncWhenOnline: 'Will sync when online'
  }
};

export const getTranslations = (language: 'fi' | 'et' | 'en'): Translations => {
  return translations[language];
};
