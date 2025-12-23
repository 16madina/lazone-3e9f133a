import { useState, useEffect } from 'react';
import { Bell, X, Smartphone, CheckCircle } from 'lucide-react';
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
import { toast } from '@/hooks/use-toast';

export const PushNotificationBanner = () => {
  const { user } = useAuth();
  const { isRegistered, register, isNative } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [success, setSuccess] = useState(false);
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
      // Show dialog after 1.5 seconds
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
    setLoading(true);
    try {
      console.log('[PushBanner] Starting registration for platform:', platform);
      const token = await register();
      
      if (token) {
        console.log('[PushBanner] Registration successful, token:', token.substring(0, 20) + '...');
        setSuccess(true);
        toast({
          title: '✅ Notifications activées',
          description: 'Vous recevrez désormais les notifications push',
        });
        // Close dialog after showing success
        setTimeout(() => {
          setShowDialog(false);
        }, 1500);
      } else {
        console.log('[PushBanner] Registration returned null token');
        toast({
          title: 'Impossible d\'activer',
          description: 'Vérifiez les permissions dans les paramètres',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[PushBanner] Registration error:', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de l\'activation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowDialog(false);
    sessionStorage.setItem('push-banner-dismissed', 'true');
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
            {success ? (
              <CheckCircle className="h-8 w-8 text-green-500" />
            ) : (
              <Bell className="h-8 w-8 text-primary" />
            )}
          </div>
          <DialogTitle className="text-xl">
            {success ? 'Notifications activées !' : 'Restez informé'}
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            {success ? (
              'Vous recevrez désormais toutes les notifications importantes de LaZone'
            ) : (
              <>
                Recevez des alertes pour les nouveaux messages, 
                les demandes de visite et les mises à jour importantes.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {!success && (
          <div className="flex flex-col gap-3 mt-4">
            <Button
              onClick={handleEnable}
              disabled={loading}
              className="w-full h-12 text-base font-medium"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Activation en cours...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Activer les notifications
                </div>
              )}
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

        {isAndroid && !success && (
          <p className="text-xs text-center text-muted-foreground mt-2">
            <Smartphone className="inline h-3 w-3 mr-1" />
            Android détecté - Cliquez sur "Activer" puis "Autoriser"
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PushNotificationBanner;
