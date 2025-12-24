import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, BellRing, CheckCircle, XCircle, Smartphone, Globe, Send, RefreshCw, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications, isNativePlatform, getPlatform } from '@/hooks/useNativePlugins';
import { sendPushNotification } from '@/hooks/useNotifications';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface NotificationDebugInfo {
  timestamp: string;
  rawEvent?: string;
  data?: string;
  type?: string;
  listing_type?: string;
  entity_id?: string | null;
  actor_id?: string | null;
  route?: string | null;
  calculated_route?: string;
  calculated_mode?: string | null;
}

const PushNotificationTestPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { token, isRegistered, register, unregister, isNative } = usePushNotifications();
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [fcmTokens, setFcmTokens] = useState<Array<{ token: string; platform: string; created_at: string }>>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [debugInfo, setDebugInfo] = useState<NotificationDebugInfo | null>(null);

  const platform = getPlatform();
  const isNativePlatformCheck = isNativePlatform();
  
  // Load debug info from sessionStorage
  const loadDebugInfo = () => {
    try {
      const stored = sessionStorage.getItem('last_notification_tap_debug');
      if (stored) {
        setDebugInfo(JSON.parse(stored));
      }
    } catch (e) {
      console.log('Failed to load debug info:', e);
    }
  };
  
  // Clear debug info
  const clearDebugInfo = () => {
    sessionStorage.removeItem('last_notification_tap_debug');
    setDebugInfo(null);
    toast({ title: 'Debug info effacée' });
  };

  const fetchUserTokens = async () => {
    if (!user) return;
    
    setLoadingTokens(true);
    try {
      const { data, error } = await supabase
        .from('fcm_tokens')
        .select('token, platform, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFcmTokens(data || []);
    } catch (error) {
      console.error('Error fetching tokens:', error);
    } finally {
      setLoadingTokens(false);
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      const result = await register();
      if (result) {
        toast({
          title: 'Inscription réussie',
          description: 'Les notifications push sont maintenant activées'
        });
        await fetchUserTokens();
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'activer les notifications',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnregister = async () => {
    setLoading(true);
    try {
      await unregister();
      toast({
        title: 'Désinscription réussie',
        description: 'Les notifications push sont désactivées'
      });
      await fetchUserTokens();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de désactiver les notifications',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    if (!user) {
      toast({
        title: 'Non connecté',
        description: 'Connectez-vous pour tester les notifications',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    setTestResult(null);
    
    try {
      const success = await sendPushNotification(
        user.id,
        '🔔 Test de notification',
        'Ceci est un test de notification push LaZone!',
        { type: 'test', timestamp: new Date().toISOString() }
      );

      if (success) {
        setTestResult('success');
        toast({
          title: 'Notification envoyée',
          description: 'Vérifiez votre appareil pour la notification'
        });
      } else {
        setTestResult('error');
        toast({
          title: 'Échec de l\'envoi',
          description: 'La notification n\'a pas pu être envoyée',
          variant: 'destructive'
        });
      }
    } catch (error) {
      setTestResult('error');
      toast({
        title: 'Erreur',
        description: 'Une erreur s\'est produite',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch tokens and debug info on mount
  useEffect(() => {
    if (user) {
      fetchUserTokens();
    }
    loadDebugInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b pt-14">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold truncate">Test Notifications Push</h1>
        </div>
      </div>

      <div className="p-4 space-y-4 pb-24">
        {/* Platform Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {isNativePlatformCheck ? (
                <Smartphone className="h-5 w-5 text-primary" />
              ) : (
                <Globe className="h-5 w-5 text-muted-foreground" />
              )}
              Plateforme détectée
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Type</span>
              <Badge variant={isNativePlatformCheck ? 'default' : 'secondary'}>
                {platform.toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Mode</span>
              <Badge variant={isNativePlatformCheck ? 'default' : 'outline'}>
                {isNativePlatformCheck ? 'Natif (Capacitor)' : 'Web (Navigateur)'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Push disponible</span>
              {isNativePlatformCheck ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <span className="text-xs text-muted-foreground">Via navigateur uniquement</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Registration Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Statut d'inscription
            </CardTitle>
            <CardDescription>
              {isNativePlatformCheck 
                ? 'Gérez votre inscription aux notifications push natives'
                : 'Les notifications navigateur sont utilisées sur le web'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Inscrit aux notifications</span>
              {isRegistered ? (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Actif
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="h-3 w-3 mr-1" />
                  Inactif
                </Badge>
              )}
            </div>

            {token && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Token FCM</span>
                <code className="block text-xs bg-muted p-2 rounded break-all">
                  {token.substring(0, 50)}...
                </code>
              </div>
            )}

            <div className="flex gap-2">
              {!isRegistered ? (
                <Button 
                  onClick={handleRegister} 
                  disabled={loading || !isNativePlatformCheck}
                  className="flex-1"
                >
                  <BellRing className="h-4 w-4 mr-2" />
                  Activer les notifications
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={handleUnregister}
                  disabled={loading}
                  className="flex-1"
                >
                  Désactiver
                </Button>
              )}
            </div>

            {!isNativePlatformCheck && (
              <p className="text-xs text-muted-foreground text-center">
                Les notifications push natives ne sont disponibles que sur l'application mobile.
                Sur le web, les notifications navigateur sont utilisées.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Test Notification */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="h-5 w-5" />
              Envoyer une notification test
            </CardTitle>
            <CardDescription>
              Envoyez-vous une notification pour tester le système
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleTestNotification}
              disabled={loading || !user}
              className="w-full"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Envoyer notification test
            </Button>

            {testResult && (
              <div className={`flex items-center gap-2 p-3 rounded-lg ${
                testResult === 'success' 
                  ? 'bg-green-500/10 text-green-600' 
                  : 'bg-destructive/10 text-destructive'
              }`}>
                {testResult === 'success' ? (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm">Notification envoyée avec succès!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5" />
                    <span className="text-sm">Échec de l'envoi</span>
                  </>
                )}
              </div>
            )}

            {!user && (
              <p className="text-xs text-muted-foreground text-center">
                Connectez-vous pour tester les notifications
              </p>
            )}
          </CardContent>
        </Card>

        {/* Registered Tokens */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Appareils enregistrés</CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={fetchUserTokens}
                disabled={loadingTokens}
              >
                <RefreshCw className={`h-4 w-4 ${loadingTokens ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <CardDescription>
              Liste des appareils recevant les notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            {fcmTokens.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun appareil enregistré
              </p>
            ) : (
              <div className="space-y-3">
                {fcmTokens.map((t, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium capitalize">{t.platform}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(t.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <code className="text-xs text-muted-foreground">
                      ...{t.token.slice(-8)}
                    </code>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Debug Panel */}
        <Card className="border-dashed border-orange-500/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-orange-600">
                <Bug className="h-5 w-5" />
                Debug: Dernier tap notification
              </CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={loadDebugInfo}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                {debugInfo && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearDebugInfo}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <CardDescription>
              Données reçues lors du dernier clic sur une notification
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!debugInfo ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun tap de notification enregistré. Cliquez sur une notification push pour voir les données ici.
              </p>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Timestamp</span>
                  <span className="font-mono">{new Date(debugInfo.timestamp).toLocaleString('fr-FR')}</span>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <p className="font-medium text-sm">Données reçues:</p>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-muted/50 rounded">
                      <span className="text-muted-foreground block">type</span>
                      <span className="font-mono">{debugInfo.type || 'N/A'}</span>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <span className="text-muted-foreground block">listing_type</span>
                      <Badge variant={debugInfo.listing_type === 'short_term' ? 'default' : debugInfo.listing_type === 'long_term' ? 'secondary' : 'outline'}>
                        {debugInfo.listing_type || 'N/A'}
                      </Badge>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <span className="text-muted-foreground block">entity_id</span>
                      <span className="font-mono truncate block">{debugInfo.entity_id || 'N/A'}</span>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <span className="text-muted-foreground block">actor_id</span>
                      <span className="font-mono truncate block">{debugInfo.actor_id || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <p className="font-medium text-sm">Valeurs calculées:</p>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-green-500/10 rounded border border-green-500/30">
                      <span className="text-muted-foreground block">Route calculée</span>
                      <span className="font-mono text-green-600">{debugInfo.calculated_route || 'N/A'}</span>
                    </div>
                    <div className="p-2 bg-blue-500/10 rounded border border-blue-500/30">
                      <span className="text-muted-foreground block">Mode calculé</span>
                      <Badge variant={debugInfo.calculated_mode === 'residence' ? 'default' : debugInfo.calculated_mode === 'lazone' ? 'secondary' : 'outline'}>
                        {debugInfo.calculated_mode || 'aucun'}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {debugInfo.data && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="font-medium text-sm">Données brutes:</p>
                      <pre className="p-2 bg-muted/50 rounded overflow-x-auto text-[10px]">
                        {JSON.stringify(JSON.parse(debugInfo.data), null, 2)}
                      </pre>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* Help Section */}
        <div className="text-center space-y-2 py-4">
          <h3 className="text-sm font-medium">Besoin d'aide?</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Si vous ne recevez pas de notifications, vérifiez que les notifications sont 
            activées dans les paramètres de votre appareil pour l'application LaZone.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PushNotificationTestPage;
