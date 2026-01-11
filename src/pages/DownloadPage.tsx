import { useEffect, useState } from 'react';
import { Apple, Play } from 'lucide-react';
import logoLazone from '@/assets/lazone-logo-new.png';

type Platform = 'ios' | 'android' | 'desktop';

const APP_STORE_URL = 'https://apps.apple.com/app/lazone/id6756757879';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.lazone.afrique';

const DownloadPage = () => {
  const [platform, setPlatform] = useState<Platform>('desktop');

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
    } else if (/android/.test(userAgent)) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex flex-col items-center justify-center px-6 py-12">
      {/* Logo */}
      <div className="mb-8">
        <img 
          src={logoLazone} 
          alt="LaZone" 
          className="w-24 h-24 object-contain"
        />
      </div>

      {/* Title */}
      <h1 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-4">
        Télécharger l'application LaZone
      </h1>

      {/* Subtitle */}
      <p className="text-muted-foreground text-center mb-10 max-w-sm">
        L'immobilier en Afrique, simplifié.
      </p>

      {/* Buttons */}
      <div className="flex flex-col gap-4 w-full max-w-xs">
        {/* App Store Button - Show on iOS or Desktop */}
        {(platform === 'ios' || platform === 'desktop') && (
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-4 px-6 bg-black text-white rounded-2xl hover:bg-gray-800 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
            aria-label="Télécharger sur l'App Store"
          >
            <Apple className="w-8 h-8" />
            <div className="text-left">
              <div className="text-xs opacity-80">Télécharger sur</div>
              <div className="text-lg font-semibold">App Store</div>
            </div>
          </a>
        )}

        {/* Google Play Button - Show on Android or Desktop */}
        {(platform === 'android' || platform === 'desktop') && (
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-4 px-6 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
            aria-label="Télécharger sur Google Play"
          >
            <Play className="w-8 h-8 fill-current" />
            <div className="text-left">
              <div className="text-xs opacity-80">Disponible sur</div>
              <div className="text-lg font-semibold">Google Play</div>
            </div>
          </a>
        )}
      </div>

      {/* Footer note */}
      <p className="text-xs text-muted-foreground/60 mt-12 text-center">
        © {new Date().getFullYear()} LaZone
      </p>
    </div>
  );
};

export default DownloadPage;
