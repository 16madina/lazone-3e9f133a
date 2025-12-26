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
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch user's active subscription
      const { data: purchases } = await supabase
        .from('storekit_purchases')
        .select('product_id, status, expiration_date')
        .eq('user_id', user.id)
        .eq('status', 'active');

      // Find active subscription and determine quota
      let quota = 0;
      let subType: 'pro' | 'premium' | null = null;
      
      (purchases || []).forEach(sub => {
        const isActive = !sub.expiration_date || new Date(sub.expiration_date) > new Date();
        // Check for subscription products by looking for 'sub' anywhere in product_id
        const isSubscription = sub.product_id.toLowerCase().includes('sub');
        
        if (isActive && isSubscription) {
          // Determine subscription type and quota based on product_id content
          if (sub.product_id.toLowerCase().includes('premium')) {
            if (quota < 4) {
              quota = 4; // Premium gets 4 sponsored listings
              subType = 'premium';
            }
          } else if (sub.product_id.toLowerCase().includes('pro')) {
            if (quota < 2 && subType !== 'premium') {
              quota = 2; // Pro gets 2 sponsored listings
              subType = 'pro';
            }
          }
        }
      });

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