import { useEffect } from 'react';
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

  useEffect(() => {
    const pendingRoute = sessionStorage.getItem('pending_notification_route');
    
    if (pendingRoute) {
      console.log('[DeepLink] Processing pending route:', pendingRoute);
      sessionStorage.removeItem('pending_notification_route');
      
      // Small delay to ensure app is fully mounted
      const timer = setTimeout(() => {
        navigate(pendingRoute);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [navigate, appMode]);

  return null;
};
