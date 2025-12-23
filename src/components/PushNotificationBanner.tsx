import { useState, useEffect } from 'react';
import { Bell, Smartphone, CheckCircle, AlertTriangle, Settings } from 'lucide-react';
import { usePushNotifications, isNativePlatform, getPlatform } from '@/hooks/useNativePlugins';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type DialogState = 'prompt' | 'loading' | 'success' | 'denied';

export const PushNotificationBanner = () => {
  const { user } = useAuth();
  const { isRegistered, register, isNative } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState>('prompt');
  const platform = getPlatform();
  const isAndroid = platform === 'android';

  // Check if banner was dismissed in this session
  useEffect(() => {
    const wasDismissed = sessionStorage.getItem('push-banner-dismissed');
    if (wasDismissed) {
      setDismissed(true);
    }
  }, []);

  // Show dialog after a short delay on native platforms
  useEffect(() => {
    if (isNative && user && !isRegistered && !dismissed) {
      const timer = setTimeout(() => {
        setShowDialog(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isNative, user, isRegistered, dismissed]);

  // Don't show if not on native platform, not logged in, already registered, or dismissed
  if (!isNative || !user || isRegistered || dismissed) {
    return null;
  }

  const handleEnable = async () => {
    setDialogState('loading');
    try {
      console.log('[PushBanner] Starting registration for platform:', platform);
      const token = await register();
      
      console.log('[PushBanner] Registration successful, token:', token.substring(0, 20) + '...');
      setDialogState('success');
      
      // Close dialog after showing success
      setTimeout(() => {
        setShowDialog(false);
      }, 2000);
    } catch (error: any) {
      console.error('[PushBanner] Registration error:', error?.message || error);
      
      if (error?.message === 'permission_denied') {
        setDialogState('denied');
      } else {
        // For other errors, go back to prompt state
        setDialogState('prompt');
      }
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowDialog(false);
    sessionStorage.setItem('push-banner-dismissed', 'true');
  };

  const handleRetry = () => {
    setDialogState('prompt');
  };

  const getIcon = () => {
    switch (dialogState) {
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'denied':
        return <AlertTriangle className="h-8 w-8 text-amber-500" />;
      case 'loading':
        return (
          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        );
      default:
        return <Bell className="h-8 w-8 text-primary" />;
    }
  };

  const getTitle = () => {
    switch (dialogState) {
      case 'success':
        return 'Notifications activées !';
      case 'denied':
        return 'Autorisation requise';
      case 'loading':
        return 'Activation...';
      default:
        return 'Restez informé';
    }
  };

  const getDescription = () => {
    switch (dialogState) {
      case 'success':
        return 'Vous recevrez désormais toutes les notifications importantes de LaZone';
      case 'denied':
        return (
          <>
            Pour recevoir les notifications, vous devez autoriser l'accès dans les paramètres de votre appareil.
            <br /><br />
            <span className="flex items-center justify-center gap-1 text-muted-foreground">
              <Settings className="h-3 w-3" />
              Paramètres → Applications → LaZone → Notifications
            </span>
          </>
        );
      case 'loading':
        return 'Veuillez patienter...';
      default:
        return 'Recevez des alertes pour les nouveaux messages, les demandes de visite et les mises à jour importantes.';
    }
  };

  return (
    <Dialog open={showDialog} onOpenChange={(open) => {
      if (!open) {
        handleDismiss();
      }
    }}>
      <DialogContent className="sm:max-w-md mx-4 rounded-2xl">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            {getIcon()}
          </div>
          <DialogTitle className="text-xl">
            {getTitle()}
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            {getDescription()}
          </DialogDescription>
        </DialogHeader>

        {dialogState === 'prompt' && (
          <div className="flex flex-col gap-3 mt-4">
            <Button
              onClick={handleEnable}
              className="w-full h-12 text-base font-medium"
            >
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Activer les notifications
              </div>
            </Button>
            
            <Button
              variant="ghost"
              onClick={handleDismiss}
              className="w-full h-10 text-muted-foreground"
            >
              Plus tard
            </Button>

            {isAndroid && (
              <p className="text-xs text-center text-muted-foreground">
                <Smartphone className="inline h-3 w-3 mr-1" />
                Cliquez sur "Activer" puis "Autoriser"
              </p>
            )}
          </div>
        )}

        {dialogState === 'denied' && (
          <div className="flex flex-col gap-3 mt-4">
            <Button
              onClick={handleRetry}
              className="w-full h-12 text-base font-medium"
            >
              Réessayer
            </Button>
            
            <Button
              variant="ghost"
              onClick={handleDismiss}
              className="w-full h-10 text-muted-foreground"
            >
              Plus tard
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PushNotificationBanner;
