import React, { useState, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import { getTranslations, Translations } from '@/utils/translations';
import { Camera as CameraIcon } from 'lucide-react';

interface CameraProps {
  language: 'fi' | 'et' | 'en';
  // webhookUrl is no longer needed here as functionality is moved
}

export const Camera: React.FC<CameraProps> = ({ language }) => {
  const t = getTranslations(language);
  const [message, setMessage] = useState<string>(
    'Tämä kameratoiminto on vanhentunut. Uusi ääniohjattu kuvaus löytyy välilehdeltä "ÄäniVirta".'
  );

  useEffect(() => {
    const warningMessage = "Camera.tsx on vanhentunut ja se korvataan pian kokonaan. Käytä 'ÄäniVirta'-välilehteä.";
    console.warn(warningMessage);
    toast({
      title: t.cameraTab + " - Vanhentunut", // Example: Using existing translation key
      description: warningMessage,
      variant: "destructive",
      duration: 10000,
    });
  }, [t, toast]); // Added toast to dependencies

  return (
    <div className="flex flex-col items-center p-4 space-y-3 w-full max-w-md mx-auto bg-amber-50 border border-amber-300 rounded-lg shadow-md">
      <CameraIcon size={48} className="mx-auto mb-3 text-amber-600" />
      <p className="text-center text-amber-800 font-semibold text-lg">
        {t.cameraTab} - {t.unknownError} {/* Using a generic error as placeholder for "Deprecated" if not available */}
      </p>
      <p className="text-sm text-amber-700 text-center px-2">
        {message}
      </p>
      <p className="text-xs text-gray-500 text-center mt-3">
        (Tämä komponentti on merkitty poistettavaksi ja sen toiminnot on siirretty uuteen käyttöliittymään.)
      </p>
    </div>
  );
};
