import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Gift, Download, Smartphone, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/AppLogo';
import splashBg from '@/assets/splash-bg-10.jpg';

const APP_STORE_URL = 'https://apps.apple.com/app/lazone-afrique/id6740092997';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.lazone.afrique';

const SmartLinkPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [platform, setPlatform] = useState<'ios' | 'android' | 'web'>('web');
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [showManualOptions, setShowManualOptions] = useState(false);

  useEffect(() => {
    // Get referral code from URL
    const ref = searchParams.get('ref');
    if (ref) {
      setReferralCode(ref.toUpperCase());
      // Store in localStorage for after app install
      localStorage.setItem('pendingReferralCode', ref.toUpperCase());
    }

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
    } else if (/android/.test(userAgent)) {
      setPlatform('android');
    } else {
      setPlatform('web');
    }

    // If we're already in the native app, just navigate to auth
    if (Capacitor.isNativePlatform()) {
      navigate(`/auth${ref ? `?ref=${ref}` : ''}`, { replace: true });
      return;
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    // Only run countdown on mobile
    if (platform === 'web' || Capacitor.isNativePlatform()) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setShowManualOptions(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Try to open the app via Universal Links (HTTPS URL that app can intercept)
    // This works better than custom URL schemes on modern iOS/Android
    const universalLink = `https://lazoneapp.com/auth${referralCode ? `?ref=${referralCode}` : ''}`;
    
    // Create a hidden iframe to attempt opening the app without navigating away
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = universalLink;
    document.body.appendChild(iframe);
    
    // Clean up iframe after attempt
    const cleanupTimeout = setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 2000);

    return () => {
      clearInterval(timer);
      clearTimeout(cleanupTimeout);
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    };
  }, [platform, referralCode]);

  const handleOpenStore = () => {
    if (platform === 'ios') {
      window.location.href = APP_STORE_URL;
    } else if (platform === 'android') {
      window.location.href = PLAY_STORE_URL;
    }
  };

  const handleContinueWeb = () => {
    navigate(`/auth${referralCode ? `?ref=${referralCode}` : ''}`, { replace: true });
  };

  // For desktop, redirect directly to auth
  if (platform === 'web' && !Capacitor.isNativePlatform()) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url(${splashBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="glass-card p-8 max-w-md w-full text-center space-y-6">
          <AppLogo className="h-16 w-auto mx-auto" />
          
          {referralCode && (
            <div className="bg-primary/20 border border-primary/30 rounded-xl p-4">
              <Gift className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Code de parrainage</p>
              <p className="text-2xl font-mono font-bold text-primary">{referralCode}</p>
              <p className="text-xs text-emerald-500 mt-1">+1 crédit gratuit après inscription</p>
            </div>
          )}

          <div className="space-y-4">
            <p className="text-muted-foreground">
              Téléchargez l'app LaZone pour une meilleure expérience
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a 
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-black text-white px-4 py-3 rounded-xl hover:bg-gray-900 transition-colors"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                App Store
              </a>
              <a 
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-black text-white px-4 py-3 rounded-xl hover:bg-gray-900 transition-colors"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                </svg>
                Play Store
              </a>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <Button 
              variant="ghost" 
              onClick={handleContinueWeb}
              className="text-muted-foreground hover:text-foreground"
            >
              Continuer sur le web
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Mobile view with app opening attempt
  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url(${splashBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="glass-card p-8 max-w-md w-full text-center space-y-6">
        <AppLogo className="h-16 w-auto mx-auto" />
        
        {referralCode && (
          <div className="bg-primary/20 border border-primary/30 rounded-xl p-4">
            <Gift className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Code de parrainage</p>
            <p className="text-2xl font-mono font-bold text-primary">{referralCode}</p>
            <p className="text-xs text-emerald-500 mt-1">+1 crédit gratuit après inscription</p>
          </div>
        )}

        {!showManualOptions ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Smartphone className="w-6 h-6 text-primary animate-pulse" />
              <span className="text-lg">Ouverture de l'app...</span>
            </div>
            <div className="text-4xl font-bold text-primary">{countdown}</div>
            <p className="text-sm text-muted-foreground">
              Si l'app ne s'ouvre pas automatiquement, les options apparaîtront ci-dessous
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              L'app n'est pas installée ? Téléchargez-la maintenant !
            </p>
            
            <Button 
              onClick={handleOpenStore}
              className="w-full gap-2"
              size="lg"
            >
              <Download className="w-5 h-5" />
              Télécharger LaZone
            </Button>

            <div className="pt-4 border-t border-border">
              <Button 
                variant="ghost" 
                onClick={handleContinueWeb}
                className="text-muted-foreground hover:text-foreground"
              >
                Continuer sur le web
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartLinkPage;
