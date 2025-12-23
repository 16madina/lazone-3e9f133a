import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppMode } from '@/hooks/useAppMode';

/**
 * Handles deep linking from push notifications.
 * Reads pending navigation from sessionStorage and navigates using React Router
 * to avoid full page reloads that cause blank pages on mobile.
 */
export const NotificationDeepLinkHandler = () => {
  const navigate = useNavigate();
  const { appMode } = useAppMode();

  const processPendingRoute = useCallback(() => {
    const pendingRoute = sessionStorage.getItem('pending_notification_route');
    
    if (pendingRoute) {
      console.log('[DeepLink] Processing pending route:', pendingRoute);
      sessionStorage.removeItem('pending_notification_route');
      
      // Small delay to ensure app is fully mounted and mode is applied
      setTimeout(() => {
        navigate(pendingRoute);
      }, 150);
    }
  }, [navigate]);

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

  // Re-process when appMode changes (ensures navigation happens after mode switch)
  useEffect(() => {
    const pendingRoute = sessionStorage.getItem('pending_notification_route');
    if (pendingRoute) {
      processPendingRoute();
    }
  }, [appMode, processPendingRoute]);

  return null;
};
