import { useState, useEffect } from 'react';
import { Loader2, Settings, DollarSign, Users, TrendingUp, BarChart3, Home, Building, Crown, Zap } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useListingLimit, ListingLimitSettings, ModeLimitSettings } from '@/hooks/useListingLimit';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import RevenueDashboard from './RevenueDashboard';
import { useAppMode } from '@/hooks/useAppMode';

interface PaymentStats {
  totalPayments: number;
  totalRevenue: number;
  recentPayments: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    created_at: string;
    user_name: string | null;
  }>;
}

const ListingLimitsTab = () => {
  const { settings, updateSettings, loading: settingsLoading } = useListingLimit();
  const { isResidence } = useAppMode();
  const [localSettings, setLocalSettings] = useState<ListingLimitSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [modeTab, setModeTab] = useState<'long_term' | 'short_term'>('long_term');
  const [stats, setStats] = useState<PaymentStats>({
    totalPayments: 0,
    totalRevenue: 0,
    recentPayments: [],
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Initialize mode tab based on current app mode
  useEffect(() => {
    setModeTab(isResidence ? 'short_term' : 'long_term');
  }, [isResidence]);

  // Sync local settings with fetched settings and ensure mode-specific settings exist
  useEffect(() => {
    if (settings) {
      // Ensure mode-specific settings exist
      const defaultModeSettings: ModeLimitSettings = {
        free_listings_default: 3,
        free_listings_agence: 1,
        free_listings_particulier: 3,
        free_listings_proprietaire: 3,
        free_listings_demarcheur: 3,
        price_per_extra: 1000,
        pro_monthly_limit: 15,
        premium_monthly_limit: 30,
      };
      
      const updatedSettings: ListingLimitSettings = {
        ...settings,
        long_term: settings.long_term || {
          free_listings_default: settings.free_listings_default,
          free_listings_agence: settings.free_listings_agence,
          free_listings_particulier: settings.free_listings_particulier,
          free_listings_proprietaire: settings.free_listings_proprietaire,
          free_listings_demarcheur: settings.free_listings_demarcheur,
          price_per_extra: settings.price_per_extra,
        },
        short_term: settings.short_term || defaultModeSettings,
      };
      
      setLocalSettings(updatedSettings);
    }
  }, [settings]);

  // Fetch payment statistics
  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        // Fetch all completed payments
        const { data: payments, error } = await supabase
          .from('listing_payments')
          .select('*')
          .eq('status', 'completed')
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Calculate stats
        const totalPayments = payments?.length || 0;
        const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

        // Get user names for recent payments
        const recentPaymentsWithNames = await Promise.all(
          (payments || []).slice(0, 10).map(async (payment) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', payment.user_id)
              .single();

            return {
              id: payment.id,
              amount: payment.amount,
              currency: payment.currency,
              status: payment.status,
              created_at: payment.created_at,
              user_name: profile?.full_name || 'Utilisateur',
            };
          })
        );

        setStats({
          totalPayments,
          totalRevenue,
          recentPayments: recentPaymentsWithNames,
        });
      } catch (error) {
        console.error('Error fetching payment stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, []);

  const handleSave = async () => {
    if (!localSettings) return;

    setSaving(true);
    const success = await updateSettings(localSettings);
    setSaving(false);

    if (success) {
      toast({
        title: 'Paramètres enregistrés',
        description: 'Les limites d\'annonces ont été mises à jour',
      });
    } else {
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder les paramètres',
        variant: 'destructive',
      });
    }
  };

  const formatPrice = (amount: number, currency: string) => {
    const symbol = currency === 'XOF' || currency === 'XAF' ? 'FCFA' : currency;
    return new Intl.NumberFormat('fr-FR').format(amount) + ' ' + symbol;
  };

  if (settingsLoading || !localSettings) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="dashboard" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="dashboard" className="text-xs">
          <BarChart3 className="w-3 h-3 mr-1" />
          Tableau de bord
        </TabsTrigger>
        <TabsTrigger value="settings" className="text-xs">
          <Settings className="w-3 h-3 mr-1" />
          Paramètres
        </TabsTrigger>
      </TabsList>

      <TabsContent value="dashboard">
        <RevenueDashboard />
      </TabsContent>

      <TabsContent value="settings" className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card p-4 rounded-xl border">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Revenus totaux</span>
          </div>
          {loadingStats ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <p className="text-xl font-bold text-primary">
              {formatPrice(stats.totalRevenue, 'XOF')}
            </p>
          )}
        </div>
        <div className="bg-card p-4 rounded-xl border">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="w-4 h-4" />
            <span className="text-sm">Paiements</span>
          </div>
          {loadingStats ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <p className="text-xl font-bold">{stats.totalPayments}</p>
          )}
        </div>
      </div>

      {/* Settings Card */}
      <div className="bg-card p-4 rounded-xl border">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Configuration des limites</h3>
        </div>

        <div className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enabled" className="font-medium">
                Activer les limites
              </Label>
              <p className="text-sm text-muted-foreground">
                Limiter le nombre d'annonces gratuites par utilisateur
              </p>
            </div>
            <Switch
              id="enabled"
              checked={localSettings.enabled}
              onCheckedChange={(checked) =>
                setLocalSettings({ ...localSettings, enabled: checked })
              }
            />
          </div>

          {/* Mode Tabs for Settings */}
          <Tabs value={modeTab} onValueChange={(v) => setModeTab(v as 'long_term' | 'short_term')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="long_term" className="text-xs">
                <Building className="w-3 h-3 mr-1" />
                Immobilier
              </TabsTrigger>
              <TabsTrigger value="short_term" className="text-xs">
                <Home className="w-3 h-3 mr-1" />
                Résidence
              </TabsTrigger>
            </TabsList>

            {/* Long Term Settings */}
            <TabsContent value="long_term" className="space-y-4 mt-4">
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <p className="text-sm text-blue-700 font-medium">Mode Immobilier (long_term)</p>
                <p className="text-xs text-blue-600">Paramètres pour les annonces de vente et location longue durée</p>
              </div>
              
              {/* Free Listings by User Type */}
              <div className="space-y-4">
                <Label className="font-medium">Annonces gratuites par type d'utilisateur</Label>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Particuliers</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={localSettings.long_term?.free_listings_particulier ?? 3}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          long_term: {
                            ...localSettings.long_term!,
                            free_listings_particulier: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Propriétaires</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={localSettings.long_term?.free_listings_proprietaire ?? 3}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          long_term: {
                            ...localSettings.long_term!,
                            free_listings_proprietaire: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Démarcheurs</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={localSettings.long_term?.free_listings_demarcheur ?? 3}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          long_term: {
                            ...localSettings.long_term!,
                            free_listings_demarcheur: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Agences</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={localSettings.long_term?.free_listings_agence ?? 1}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          long_term: {
                            ...localSettings.long_term!,
                            free_listings_agence: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Price per Extra */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Prix par annonce supplémentaire (FCFA)
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  value={localSettings.long_term?.price_per_extra ?? 1000}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      long_term: {
                        ...localSettings.long_term!,
                        price_per_extra: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  className="max-w-[200px]"
                />
              </div>
            </TabsContent>

            {/* Short Term Settings */}
            <TabsContent value="short_term" className="space-y-4 mt-4">
              <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                <p className="text-sm text-purple-700 font-medium">Mode Résidence (short_term)</p>
                <p className="text-xs text-purple-600">Paramètres pour les annonces de location courte durée</p>
              </div>
              
              {/* Free Listings by User Type */}
              <div className="space-y-4">
                <Label className="font-medium">Annonces gratuites par type d'utilisateur</Label>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Particuliers</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={localSettings.short_term?.free_listings_particulier ?? 3}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          short_term: {
                            ...localSettings.short_term!,
                            free_listings_particulier: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Propriétaires</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={localSettings.short_term?.free_listings_proprietaire ?? 3}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          short_term: {
                            ...localSettings.short_term!,
                            free_listings_proprietaire: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Démarcheurs</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={localSettings.short_term?.free_listings_demarcheur ?? 3}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          short_term: {
                            ...localSettings.short_term!,
                            free_listings_demarcheur: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Agences</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={localSettings.short_term?.free_listings_agence ?? 1}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          short_term: {
                            ...localSettings.short_term!,
                            free_listings_agence: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Price per Extra */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Prix par annonce supplémentaire (FCFA)
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  value={localSettings.short_term?.price_per_extra ?? 1000}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      short_term: {
                        ...localSettings.short_term!,
                        price_per_extra: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  className="max-w-[200px]"
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Subscription Limits Section */}
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              <Label className="font-medium">Limites mensuelles par abonnement</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Nombre maximum d'annonces par mois pour les abonnés Pro et Premium
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-500" />
                  <Label className="text-sm font-medium text-purple-700">Pro</Label>
                </div>
                <Input
                  type="number"
                  min="1"
                  max="1000"
                  value={localSettings.pro_monthly_limit ?? 15}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      pro_monthly_limit: parseInt(e.target.value) || 15,
                    })
                  }
                  className="bg-background"
                />
                <p className="text-xs text-purple-600">annonces/mois</p>
              </div>
              
              <div className="space-y-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <Label className="text-sm font-medium text-amber-700">Premium</Label>
                </div>
                <Input
                  type="number"
                  min="1"
                  max="1000"
                  value={localSettings.premium_monthly_limit ?? 30}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      premium_monthly_limit: parseInt(e.target.value) || 30,
                    })
                  }
                  className="bg-background"
                />
                <p className="text-xs text-amber-600">annonces/mois</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Les limites sont appliquées séparément pour chaque mode. Un utilisateur peut avoir des limites différentes en mode Immobilier et Résidence.
          </p>

          {/* Save Button */}
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              'Enregistrer les paramètres'
            )}
          </Button>
        </div>
      </div>

      {/* Recent Payments */}
      <div className="bg-card p-4 rounded-xl border">
        <h3 className="font-semibold mb-4">Paiements récents</h3>
        
        {loadingStats ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : stats.recentPayments.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Aucun paiement pour le moment
          </p>
        ) : (
          <div className="space-y-3">
            {stats.recentPayments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div>
                  <p className="font-medium">{payment.user_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(payment.created_at), 'dd MMM yyyy à HH:mm', {
                      locale: fr,
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="secondary">
                    {formatPrice(payment.amount, payment.currency)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </TabsContent>
    </Tabs>
  );
};

export default ListingLimitsTab;
