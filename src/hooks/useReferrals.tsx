import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  referral_code: string;
  status: 'pending' | 'completed';
  bonus_granted: boolean;
  created_at: string;
  completed_at: string | null;
  referred_profile?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export const useReferrals = () => {
  const { user, profile } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalReferrals: 0,
    completedReferrals: 0,
    pendingReferrals: 0,
    bonusCreditsEarned: 0,
  });

  // Cast profile to access referral_code which is newly added
  const referralCode = (profile as any)?.referral_code || '';

  const fetchReferrals = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch referred user profiles
      const referredIds = data?.map(r => r.referred_id) || [];
      let profilesMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
      
      if (referredIds.length > 0) {
        const { data: profiles } = await supabase
          .from('public_profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', referredIds);
        
        profilesMap = (profiles || []).reduce((acc, p) => {
          acc[p.user_id] = { full_name: p.full_name, avatar_url: p.avatar_url };
          return acc;
        }, {} as Record<string, { full_name: string | null; avatar_url: string | null }>);
      }

      const referralsWithProfiles: Referral[] = (data || []).map(r => ({
        ...r,
        status: r.status as 'pending' | 'completed',
        referred_profile: profilesMap[r.referred_id] || null,
      }));

      setReferrals(referralsWithProfiles);
      
      const completed = referralsWithProfiles.filter(r => r.status === 'completed').length;
      setStats({
        totalReferrals: referralsWithProfiles.length,
        completedReferrals: completed,
        pendingReferrals: referralsWithProfiles.length - completed,
        bonusCreditsEarned: completed,
      });
    } catch (error) {
      console.error('Error fetching referrals:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyReferralCode = async (code: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Non connecté' };
    
    try {
      // Find the referrer by code
      const { data: referrerProfile, error: findError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('referral_code', code.toUpperCase())
        .maybeSingle();

      if (findError) throw findError;
      if (!referrerProfile) {
        return { success: false, error: 'Code de parrainage invalide' };
      }

      // Can't refer yourself
      if (referrerProfile.user_id === user.id) {
        return { success: false, error: 'Vous ne pouvez pas utiliser votre propre code' };
      }

      // Check if already referred
      const { data: existingReferral } = await supabase
        .from('referrals')
        .select('id')
        .eq('referred_id', user.id)
        .maybeSingle();

      if (existingReferral) {
        return { success: false, error: 'Vous avez déjà utilisé un code de parrainage' };
      }

      // Create referral
      const { error: insertError } = await supabase
        .from('referrals')
        .insert({
          referrer_id: referrerProfile.user_id,
          referred_id: user.id,
          referral_code: code.toUpperCase(),
        });

      if (insertError) throw insertError;

      return { success: true };
    } catch (error: any) {
      console.error('Error applying referral code:', error);
      return { success: false, error: error.message || 'Erreur lors de l\'application du code' };
    }
  };

  const getReferralLink = () => {
    if (!referralCode) return '';
    return `${window.location.origin}/auth?ref=${referralCode}`;
  };

  useEffect(() => {
    if (user) {
      fetchReferrals();
    }
  }, [user]);

  return {
    referralCode,
    referralLink: getReferralLink(),
    referrals,
    stats,
    loading,
    applyReferralCode,
    refresh: fetchReferrals,
  };
};
