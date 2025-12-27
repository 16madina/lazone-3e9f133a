import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, MessageCircle, Heart, Tag, Home, Mail, Volume2, Smartphone, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useSound } from '@/hooks/useSound';
import { usePushNotifications, getPlatform, isNativePlatform } from '@/hooks/useNativePlugins';
import { useToast } from '@/hooks/use-toast';

const NotificationSettingsPage = () => {
  const navigate = useNavigate();
  const { playNotificationSound, isMuted, setMuted } = useSound();
  const { isRegistered, register, isNative } = usePushNotifications();
  const { toast } = useToast();
  const [isRegistering, setIsRegistering] = useState(false);
  const [notifications, setNotifications] = useState({
    push: true,
    messages: true,
    favorites: true,
    offers: true,
    newListings: true,
    email: false,
  });
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    setSoundEnabled(!isMuted());
  }, [isMuted]);

  const handleToggle = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSoundToggle = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    setMuted(!newValue);
    if (newValue) {
      // Play a test sound when enabling
      setTimeout(() => playNotificationSound(), 100);
    }
  };

  const handleActivatePush = async () => {
    if (!isNativePlatform()) {
      toast({
        title: "Non disponible",
        description: "Les notifications push ne sont disponibles que sur l'application mobile.",
        variant: "destructive",
      });
      return;
    }

    setIsRegistering(true);
    try {
      await register();
      toast({
        title: "Notifications activées",
        description: "Vous recevrez désormais les notifications push.",
      });
    } catch (error: any) {
      console.error('Error registering for push:', error);
      if (error.message === 'permission_denied') {
        toast({
          title: "Permission refusée",
          description: "Veuillez autoriser les notifications dans les paramètres de votre appareil.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erreur",
          description: "Impossible d'activer les notifications. Réessayez plus tard.",
          variant: "destructive",
        });
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const platform = getPlatform();

  return (
    <div className="min-h-screen bg-muted/30 pb-32">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary via-primary to-primary/80 text-primary-foreground pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-4 px-4 py-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Notifications</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Push Notification Activation - Native Only */}
        {isNative && (
          <div className="bg-card rounded-2xl overflow-hidden border-2 border-primary/20">
            <div className="p-4 border-b border-border bg-primary/5">
              <h2 className="font-semibold flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary" />
                Activation des notifications
              </h2>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {isRegistered ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-500" />
                    )}
                    <p className="font-medium text-sm">
                      {isRegistered ? 'Notifications activées' : 'Notifications non activées'}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isRegistered 
                      ? `Appareil ${platform === 'android' ? 'Android' : 'iOS'} enregistré`
                      : 'Activez pour recevoir les notifications sur cet appareil'
                    }
                  </p>
                </div>
                {!isRegistered && (
                  <Button 
                    onClick={handleActivatePush}
                    disabled={isRegistering}
                    size="sm"
                    className="shrink-0"
                  >
                    {isRegistering ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Activation...
                      </>
                    ) : (
                      'Activer'
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sound Settings */}
        <div className="bg-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-primary" />
              Sons
            </h2>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Sons de notification</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Jouer un son lors des notifications
                </p>
              </div>
              <Switch 
                checked={soundEnabled} 
                onCheckedChange={handleSoundToggle} 
              />
            </div>
          </div>
        </div>

        {/* Push Notifications */}
        <div className="bg-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notifications Push
            </h2>
          </div>
          <div className="divide-y divide-border">
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Activer les notifications</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Recevoir des notifications sur votre appareil
                </p>
              </div>
              <Switch 
                checked={notifications.push} 
                onCheckedChange={() => handleToggle('push')} 
              />
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="bg-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold">Préférences</h2>
          </div>
          <div className="divide-y divide-border">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Messages</p>
                  <p className="text-xs text-muted-foreground">
                    Nouveaux messages reçus
                  </p>
                </div>
              </div>
              <Switch 
                checked={notifications.messages} 
                onCheckedChange={() => handleToggle('messages')} 
              />
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Heart className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Favoris</p>
                  <p className="text-xs text-muted-foreground">
                    Mises à jour de vos favoris
                  </p>
                </div>
              </div>
              <Switch 
                checked={notifications.favorites} 
                onCheckedChange={() => handleToggle('favorites')} 
              />
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Tag className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Offres spéciales</p>
                  <p className="text-xs text-muted-foreground">
                    Promotions et offres exclusives
                  </p>
                </div>
              </div>
              <Switch 
                checked={notifications.offers} 
                onCheckedChange={() => handleToggle('offers')} 
              />
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Home className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Nouvelles annonces</p>
                  <p className="text-xs text-muted-foreground">
                    Annonces correspondant à vos recherches
                  </p>
                </div>
              </div>
              <Switch 
                checked={notifications.newListings} 
                onCheckedChange={() => handleToggle('newListings')} 
              />
            </div>
          </div>
        </div>

        {/* Email Notifications */}
        <div className="bg-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Notifications par email
            </h2>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Recevoir par email</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Résumé hebdomadaire des activités
                </p>
              </div>
              <Switch 
                checked={notifications.email} 
                onCheckedChange={() => handleToggle('email')} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettingsPage;
