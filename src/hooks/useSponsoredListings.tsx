import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { addDays } from 'date-fns';

interface SponsoredListingsReturn {
  // Quota
  sponsoredQuota: number;
  sponsoredUsed: number;
  sponsoredRemaining: number;
  
  // Active subscription info
  subscriptionType: 'pro' | 'premium' | null;
  
  // Actions
  sponsorProperty: (propertyId: string) => Promise<boolean>;
  unsponsorProperty: (propertyId: string) => Promise<boolean>;
  
  // State
  loading: boolean;
  refreshSponsoredData: () => Promise<void>;
}

export function useSponsoredListings(): SponsoredListingsReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [sponsoredQuota, setSponsoredQuota] = useState(0);
  const [sponsoredUsed, setSponsoredUsed] = useState(0);
  const [subscriptionType, setSubscriptionType] = useState<'pro' | 'premium' | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSponsoredData = useCallback(async () => {
    console.log('[useSponsoredListings] Current user:', user?.id);
    if (!user?.id) {
      console.log('[useSponsoredListings] No user, exiting');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Read public subscription status (safe) instead of private purchase rows
      const { data: subRow, error: subError } = await supabase
        .from('user_subscriptions')
        .select('subscription_type, is_active')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('[useSponsoredListings] Subscription query result:', { subRow, subError });

      if (subError) {
        console.error('[useSponsoredListings] Failed to load subscription status:', subError);
      }

      const subType = subRow?.is_active ? (subRow.subscription_type as 'pro' | 'premium') : null;
      const quota = subType === 'premium' ? 4 : subType === 'pro' ? 2 : 0;

      console.log('[useSponsoredListings] Calculated:', { subType, quota });

      setSponsoredQuota(quota);
      setSubscriptionType(subType);

      // Count currently sponsored properties by this user
      const { count } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_sponsored', true)
        .gte('sponsored_until', new Date().toISOString());

      setSponsoredUsed(count || 0);

    } catch (error) {
      console.error('Failed to fetch sponsored data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchSponsoredData();
  }, [fetchSponsoredData]);

  const sponsorProperty = useCallback(async (propertyId: string): Promise<boolean> => {
    if (!user?.id) {
      toast({
        title: 'Connexion requise',
        description: 'Vous devez être connecté pour sponsoriser une annonce',
        variant: 'destructive',
      });
      return false;
    }

    if (sponsoredQuota === 0) {
      toast({
        title: 'Abonnement requis',
        description: 'Vous devez avoir un abonnement Pro ou Premium pour sponsoriser vos annonces',
        variant: 'destructive',
      });
      return false;
    }

    if (sponsoredUsed >= sponsoredQuota) {
      toast({
        title: 'Quota atteint',
        description: `Vous avez utilisé toutes vos ${sponsoredQuota} annonces sponsorisées ce mois`,
        variant: 'destructive',
      });
      return false;
    }

    try {
      // Sponsor for 30 days
      const sponsoredUntil = addDays(new Date(), 30);

      const { error } = await supabase
        .from('properties')
        .update({
          is_sponsored: true,
          sponsored_until: sponsoredUntil.toISOString(),
          sponsored_by: user.id,
        })
        .eq('id', propertyId)
        .eq('user_id', user.id);

      if (error) throw error;

      setSponsoredUsed(prev => prev + 1);

      toast({
        title: 'Annonce sponsorisée !',
        description: 'Votre annonce sera mise en avant pendant 30 jours',
      });

      return true;
    } catch (error) {
      console.error('Error sponsoring property:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sponsoriser l\'annonce',
        variant: 'destructive',
      });
      return false;
    }
  }, [user?.id, sponsoredQuota, sponsoredUsed, toast]);

  const unsponsorProperty = useCallback(async (propertyId: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase
        .from('properties')
        .update({
          is_sponsored: false,
          sponsored_until: null,
          sponsored_by: null,
        })
        .eq('id', propertyId)
        .eq('user_id', user.id);

      if (error) throw error;

      setSponsoredUsed(prev => Math.max(0, prev - 1));

      toast({
        title: 'Sponsoring annulé',
        description: 'Votre annonce n\'est plus sponsorisée',
      });

      return true;
    } catch (error) {
      console.error('Error unsponsoring property:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'annuler le sponsoring',
        variant: 'destructive',
      });
      return false;
    }
  }, [user?.id, toast]);

  return {
    sponsoredQuota,
    sponsoredUsed,
    sponsoredRemaining: Math.max(0, sponsoredQuota - sponsoredUsed),
    subscriptionType,
    sponsorProperty,
    unsponsorProperty,
    loading,
    refreshSponsoredData: fetchSponsoredData,
  };
}