import { Apple, Play } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

const APP_STORE_URL = 'https://apps.apple.com/app/lazone/id6756757879';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.lazone.afrique';

interface AppDownloadButtonsProps {
  variant?: 'default' | 'compact' | 'footer';
  className?: string;
}

export const AppDownloadButtons = ({ variant = 'default', className = '' }: AppDownloadButtonsProps) => {
  // Hide Google Play references in the iOS native build (Apple Guideline 2.3.10)
  const isIOSNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-lg text-xs hover:bg-gray-800 transition-colors"
        >
          <Apple className="w-4 h-4" />
          <span>App Store</span>
        </a>
        {!isIOSNative && (
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-lg text-xs hover:bg-gray-800 transition-colors"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Google Play</span>
          </a>
        )}
      </div>
    );
  }

  if (variant === 'footer') {
    return (
      <div className={`bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-6 ${className}`}>
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold mb-1">Télécharger l'application</h3>
          <p className="text-sm text-muted-foreground">
            Accédez à toutes les annonces immobilières en Afrique
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {/* Apple App Store Badge */}
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-5 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-all hover:scale-105 min-w-[160px]"
            aria-label="Télécharger sur l'App Store"
          >
            <Apple className="w-7 h-7" />
            <div className="text-left">
              <div className="text-[10px] opacity-80">Télécharger sur</div>
              <div className="text-sm font-semibold">App Store</div>
            </div>
          </a>

          {/* Google Play Store Badge - hidden on iOS native */}
          {!isIOSNative && (
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-5 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-all hover:scale-105 min-w-[160px]"
              aria-label="Télécharger sur Google Play"
            >
              <Play className="w-7 h-7 fill-current" />
              <div className="text-left">
                <div className="text-[10px] opacity-80">Disponible sur</div>
                <div className="text-sm font-semibold">Google Play</div>
              </div>
            </a>
          )}
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <p className="text-sm text-muted-foreground text-center">
        Téléchargez l'application LaZone
      </p>
      <div className="flex items-center gap-3">
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
        >
          <Apple className="w-5 h-5" />
          <div className="text-left">
            <div className="text-[9px] opacity-80">Télécharger sur</div>
            <div className="text-xs font-semibold">App Store</div>
          </div>
        </a>
        {!isIOSNative && (
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
          >
            <Play className="w-5 h-5 fill-current" />
            <div className="text-left">
              <div className="text-[9px] opacity-80">Disponible sur</div>
              <div className="text-xs font-semibold">Google Play</div>
            </div>
          </a>
        )}
      </div>
    </div>
  );
};
