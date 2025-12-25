import { useState, useEffect } from 'react';
import { Loader2, Settings, DollarSign, Users, TrendingUp, BarChart3 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useListingLimit, ListingLimitSettings } from '@/hooks/useListingLimit';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import RevenueDashboard from './RevenueDashboard';

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
  const [localSettings, setLocalSettings] = useState<ListingLimitSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<PaymentStats>({
    totalPayments: 0,
    totalRevenue: 0,
    recentPayments: [],
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Sync local settings with fetched settings
  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
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

          {/* Free Listings */}
          <div className="space-y-2">
            <Label htmlFor="free_listings">Annonces gratuites par utilisateur</Label>
            <Input
              id="free_listings"
              type="number"
              min="0"
              max="100"
              value={localSettings.free_listings}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  free_listings: parseInt(e.target.value) || 0,
                })
              }
              className="max-w-[200px]"
            />
            <p className="text-xs text-muted-foreground">
              Nombre d'annonces qu'un utilisateur peut publier gratuitement
            </p>
          </div>

          {/* Price per Extra */}
          <div className="space-y-2">
            <Label htmlFor="price_per_extra" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Prix par annonce supplémentaire (FCFA)
            </Label>
            <Input
              id="price_per_extra"
              type="number"
              min="0"
              step="100"
              value={localSettings.price_per_extra}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  price_per_extra: parseInt(e.target.value) || 0,
                })
              }
              className="max-w-[200px]"
            />
            <p className="text-xs text-muted-foreground">
              Ce prix sera automatiquement converti selon le pays de l'utilisateur
            </p>
          </div>

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
