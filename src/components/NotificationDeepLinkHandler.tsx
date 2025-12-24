import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppMode } from '@/hooks/useAppMode';
import { useAppStore, AppMode } from '@/stores/appStore';
import { toast } from '@/hooks/use-toast';

/**
 * Handles deep linking from push notifications.
 * Applies the correct app mode FIRST (via Zustand), then navigates using React Router
 * to avoid full page reloads that cause blank pages on mobile.
 */
export const NotificationDeepLinkHandler = () => {
  const navigate = useNavigate();
  const { appMode } = useAppMode();
  const setAppMode = useAppStore((state) => state.setAppMode);
  const isProcessingRef = useRef(false);

  // Helper function to deduce mode from route as a last resort fallback
  const deduceModeFromRoute = (route: string): AppMode | null => {
    // Reservation routes are always residence mode (short_term)
    if (route.startsWith('/reservation')) {
      console.log('[DeepLink] Deduced mode from route: residence (reservation route)');
      return 'residence';
    }
    // Messages could be either, but if we're navigating to messages without explicit mode,
    // we don't force a switch
    return null;
  };

  const processPendingRoute = useCallback(() => {
    // Prevent double processing
    if (isProcessingRef.current) {
      console.log('[DeepLink] Already processing, skipping');
      return;
    }

    const pendingRoute = sessionStorage.getItem('pending_notification_route');
    let pendingMode = sessionStorage.getItem('pending_notification_mode') as AppMode | null;
    
    if (!pendingRoute) {
      return;
    }

    console.log('[DeepLink] Processing pending route:', pendingRoute, 'explicit mode:', pendingMode);
    isProcessingRef.current = true;

    // Clear sessionStorage items immediately to prevent re-processing
    sessionStorage.removeItem('pending_notification_route');
    sessionStorage.removeItem('pending_notification_mode');

    // If no explicit mode was provided, try to deduce from route as fallback
    if (!pendingMode) {
      pendingMode = deduceModeFromRoute(pendingRoute);
      console.log('[DeepLink] Fallback mode from route:', pendingMode);
    }

    // Check if we need to switch mode
    const currentMode = useAppStore.getState().appMode;
    const needsModeSwitch = pendingMode && pendingMode !== currentMode;

    console.log('[DeepLink] Current mode:', currentMode, 'Target mode:', pendingMode, 'Needs switch:', needsModeSwitch);

    if (needsModeSwitch && pendingMode) {
      console.log('[DeepLink] Switching mode from', currentMode, 'to', pendingMode);
      
      // Apply mode via Zustand (this will sync localStorage and DOM class)
      setAppMode(pendingMode);
      
      // Also apply DOM class immediately for visual consistency
      if (pendingMode === 'residence') {
        document.documentElement.classList.add('residence');
      } else {
        document.documentElement.classList.remove('residence');
      }
      
      // Persist to localStorage immediately
      localStorage.setItem('lazone-app-mode', pendingMode);
      
      // Show toast for mode switch
      const toastTitle = pendingMode === 'residence' 
        ? '🏠 Mode Résidence activé' 
        : '🏢 Mode LaZone activé';
      const toastDescription = pendingMode === 'residence'
        ? 'Passage automatique en mode résidence'
        : 'Passage automatique en mode immobilier';
      
      // Navigate after a delay to ensure mode is applied and React state is updated
      setTimeout(() => {
        toast({ title: toastTitle, description: toastDescription });
        navigate(pendingRoute);
        isProcessingRef.current = false;
      }, 300);
    } else {
      // No mode switch needed, navigate immediately
      setTimeout(() => {
        navigate(pendingRoute);
        isProcessingRef.current = false;
      }, 100);
    }
  }, [navigate, setAppMode]);

  // Process on mount (app opened from killed/background state)
  useEffect(() => {
    processPendingRoute();
  }, [processPendingRoute]);

  // Listen for deep link events (app already open in foreground)
  useEffect(() => {
    const handleDeepLink = () => {
      console.log('[DeepLink] Received notification-deep-link event');
      processPendingRoute();
    };

    window.addEventListener('notification-deep-link', handleDeepLink);
    return () => window.removeEventListener('notification-deep-link', handleDeepLink);
  }, [processPendingRoute]);

  return null;
};
