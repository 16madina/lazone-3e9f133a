import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

// Dynamic import for App plugin to avoid type issues
const getAppPlugin = async () => {
  const { App } = await import('@capacitor/app');
  return App;
};

/**
 * Hook to handle deep links for payment redirects and referrals
 * Listens for lazone:// URLs and https://lazoneapp.com URLs
 */
export const useDeepLinks = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check for pending referral code from SmartLinkPage (after app install)
    const pendingRef = localStorage.getItem('pendingReferralCode');
    if (pendingRef) {
      // Only apply once, then clear
      localStorage.removeItem('pendingReferralCode');
      navigate(`/auth?ref=${pendingRef}`, { replace: true });
      return;
    }

    // Only setup listeners on native platforms
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let listenerHandle: { remove: () => void } | null = null;

    const setupListener = async () => {
      try {
        const App = await getAppPlugin();
        
        const handleDeepLink = (event: { url: string }) => {
          console.log('[DeepLink] Received URL:', event.url);

          try {
            // Parse the deep link URL
            // Format: lazone://path?params or https://lazoneapp.com/path?params
            let url: URL;
            
            if (event.url.startsWith('lazone://')) {
              // Convert lazone:// to a parseable format
              const httpUrl = event.url.replace('lazone://', 'https://lazone.app/');
              url = new URL(httpUrl);
            } else {
              url = new URL(event.url);
            }

            const path = url.pathname;
            const params = url.searchParams;

            console.log('[DeepLink] Parsed path:', path, 'params:', Object.fromEntries(params));

            // Handle referral deep links
            const referralCode = params.get('ref');
            if (referralCode || path.includes('/auth')) {
              const authPath = referralCode ? `/auth?ref=${referralCode}` : '/auth';
              navigate(authPath, { replace: true });
              
              if (referralCode) {
                toast({
                  title: 'Code de parrainage détecté 🎁',
                  description: `Le code ${referralCode} sera appliqué à votre inscription.`,
                });
              }
              return;
            }

            // Handle payment redirects
            const paymentStatus = params.get('payment');
            
            if (paymentStatus === 'success') {
              const mode = params.get('mode');
              const listingType = params.get('listingType');
              const propertyId = params.get('propertyId');
              const transactionRef = params.get('transactionRef');

              toast({
                title: 'Paiement réussi ! 🎉',
                description: 'Votre paiement a été confirmé.',
              });

              // Navigate to the appropriate page
              if (path.includes('credits')) {
                navigate('/credits?payment=success');
              } else if (path.includes('publish')) {
                const navParams = new URLSearchParams();
                navParams.set('payment', 'success');
                if (mode) navParams.set('mode', mode);
                if (listingType) navParams.set('listingType', listingType);
                if (propertyId) navParams.set('propertyId', propertyId);
                if (transactionRef) navParams.set('transactionRef', transactionRef);
                
                navigate(`/publish?${navParams.toString()}`);
              } else {
                // Default: go to profile
                navigate('/profile');
              }
            } else if (paymentStatus === 'cancelled') {
              toast({
                title: 'Paiement annulé',
                description: 'Vous pouvez réessayer à tout moment.',
                variant: 'destructive',
              });

              // Navigate back
              if (path.includes('credits')) {
                navigate('/credits');
              } else if (path.includes('publish')) {
                const mode = params.get('mode');
                navigate(`/publish${mode ? `?mode=${mode}` : ''}`);
              }
            } else {
              // Generic deep link - just navigate to the path with query params
              const fullPath = params.toString() ? `${path}?${params.toString()}` : path;
              navigate(fullPath || '/', { replace: true });
            }
          } catch (error) {
            console.error('[DeepLink] Error parsing URL:', error);
          }
        };

        // Listen for app URL open events
        listenerHandle = await App.addListener('appUrlOpen', handleDeepLink);
        console.log('[DeepLink] Listener setup complete');
      } catch (error) {
        console.error('[DeepLink] Failed to setup listener:', error);
      }
    };

    setupListener();

    // Cleanup
    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, [navigate]);
};
