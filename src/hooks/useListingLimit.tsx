import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useAppMode } from './useAppMode';
import { countryCurrencyMap } from '@/data/currencies';
import { CREDITS_PER_PRODUCT } from '@/services/storeKitService';

// Settings for a single mode
export interface ModeLimitSettings {
  free_listings_default: number;
  free_listings_agence: number;
  free_listings_particulier: number;
  free_listings_proprietaire: number;
  free_listings_demarcheur: number;
  price_per_extra: number;
  // Subscription limits (per month)
  pro_monthly_limit?: number;
  premium_monthly_limit?: number;
}

export interface ListingLimitSettings {
  enabled: boolean;
  // Legacy fields for backwards compatibility
  free_listings_default: number;
  free_listings_agence: number;
  free_listings_particulier: number;
  free_listings_proprietaire: number;
  free_listings_demarcheur: number;
  price_per_extra: number;
  currency: string;
  // Subscription limits (global defaults)
  pro_monthly_limit?: number;
  premium_monthly_limit?: number;
  // Sponsoring quotas
  pro_sponsored_quota?: number;
  premium_sponsored_quota?: number;
  // New per-mode settings
  long_term?: ModeLimitSettings;
  short_term?: ModeLimitSettings;
}

interface ConversionRates {
  [key: string]: number;
}

// Taux de conversion approximatifs depuis XOF (FCFA)
const XOF_CONVERSION_RATES: ConversionRates = {
  'XOF': 1,
  'XAF': 1, // Même valeur que XOF
  'NGN': 2.5, // 1 XOF ≈ 2.5 NGN
  'GHS': 0.02, // 1 XOF ≈ 0.02 GHS
  'KES': 0.25, // 1 XOF ≈ 0.25 KES
  'ZAR': 0.03, // 1 XOF ≈ 0.03 ZAR
  'EGP': 0.08, // 1 XOF ≈ 0.08 EGP
  'MAD': 0.017, // 1 XOF ≈ 0.017 MAD
  'TND': 0.005, // 1 XOF ≈ 0.005 TND
  'DZD': 0.23, // 1 XOF ≈ 0.23 DZD
  'USD': 0.0017, // 1 XOF ≈ 0.0017 USD
  'EUR': 0.0015, // 1 XOF ≈ 0.0015 EUR
};

export const useListingLimit = () => {
  const { user, profile } = useAuth();
  const { isResidence } = useAppMode();
  const [settings, setSettings] = useState<ListingLimitSettings | null>(null);
  const [userListingsCount, setUserListingsCount] = useState<number>(0);
  const [availableCredits, setAvailableCredits] = useState<number>(0);
  const [subscriptionCreditsRemaining, setSubscriptionCreditsRemaining] = useState<number>(0);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [subscriptionType, setSubscriptionType] = useState<'pro' | 'premium' | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Current listing type based on app mode
  const currentListingType = isResidence ? 'short_term' : 'long_term';

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('id', 'listing_limit')
        .single();

      if (error) throw error;
      
      // Safely parse the JSONB value
      const settingsValue = data?.value as unknown as ListingLimitSettings;
      setSettings(settingsValue);
    } catch (error) {
      console.error('Error fetching listing limit settings:', error);
      // Default settings if not found
      setSettings({
        enabled: true,
        free_listings_default: 3,
        free_listings_agence: 1,
        free_listings_particulier: 3,
        free_listings_proprietaire: 3,
        free_listings_demarcheur: 3,
        price_per_extra: 1000,
        currency: 'XOF',
      });
    }
  }, []);

  // Count user's active listings for current mode
  const fetchUserListingsCount = useCallback(async () => {
    if (!user) {
      setUserListingsCount(0);
      return;
    }

    try {
      const { count, error } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('listing_type', currentListingType);

      if (error) throw error;
      setUserListingsCount(count || 0);
    } catch (error) {
      console.error('Error counting user listings:', error);
      setUserListingsCount(0);
    }
  }, [user, currentListingType]);

  // Fetch available credits for current mode from ALL sources:
  // 1. storekit_purchases (credit packs + subscriptions)
  // 2. listing_payments (legacy mobile money payments)
  const fetchAvailableCredits = useCallback(async () => {
    if (!user) {
      setAvailableCredits(0);
      setSubscriptionCreditsRemaining(0);
      setHasActiveSubscription(false);
      setSubscriptionType(null);
      return;
    }

    try {
      // 1. Fetch all storekit_purchases for credit calculation
      const { data: storeKitData, error: storeKitError } = await supabase
        .from('storekit_purchases')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (storeKitError) throw storeKitError;

      // Calculate credits from storekit_purchases
      let storeKitCreditsTotal = 0;
      let storeKitCreditsUsed = 0;
      let foundActiveSubscription = null;

      for (const purchase of storeKitData || []) {
        const isSubscription = purchase.is_subscription || 
          purchase.product_id.includes('sub.') || 
          purchase.product_id.includes('agency.');
        
        // Check if subscription is still valid
        const isValidSubscription = isSubscription && 
          (!purchase.expiration_date || new Date(purchase.expiration_date) > new Date());

        if (isValidSubscription && !foundActiveSubscription) {
          // Track active subscription
          foundActiveSubscription = purchase;
          const subType = purchase.product_id.toLowerCase().includes('premium') ? 'premium' : 'pro';
          setSubscriptionType(subType);
          setHasActiveSubscription(true);
          
          // Get monthly limit from subscription
          const monthlyLimit = CREDITS_PER_PRODUCT[purchase.product_id] || 
            (subType === 'premium' ? 30 : 15);
          
          // Calculate remaining credits for this month
          const creditsRemaining = monthlyLimit - (purchase.credits_used || 0);
          setSubscriptionCreditsRemaining(Math.max(0, creditsRemaining));
        } else if (!isSubscription) {
          // Regular credit pack - add to available credits
          storeKitCreditsTotal += purchase.credits_amount || 0;
          storeKitCreditsUsed += purchase.credits_used || 0;
        }
      }

      const storeKitCreditsAvailable = storeKitCreditsTotal - storeKitCreditsUsed;

      // If no active subscription found, reset subscription state
      if (!foundActiveSubscription) {
        setHasActiveSubscription(false);
        setSubscriptionType(null);
        setSubscriptionCreditsRemaining(0);
      }

      // 2. Count listing_payments credits (legacy - completed payments without property)
      const { count: paymentCredits, error: paymentError } = await supabase
        .from('listing_payments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .eq('listing_type', currentListingType)
        .is('property_id', null);

      if (paymentError) throw paymentError;
      
      // Total available credits = storekit credits + listing_payments credits
      const totalCredits = storeKitCreditsAvailable + (paymentCredits || 0);
      setAvailableCredits(totalCredits);
      
      console.log('[useListingLimit] StoreKit credits:', storeKitCreditsAvailable, 
        '| Payment credits:', paymentCredits || 0,
        '| Total:', totalCredits);
    } catch (error) {
      console.error('Error counting available credits:', error);
      setAvailableCredits(0);
      setSubscriptionCreditsRemaining(0);
    }
  }, [user, currentListingType]);

  // Use a credit for a property (from subscription, storekit_purchases, or listing_payments)
  const useCredit = useCallback(async (propertyId: string): Promise<boolean> => {
    if (!user) return false;
    
    // Total available = subscription credits + pack credits + listing_payments credits
    const totalAvailable = subscriptionCreditsRemaining + availableCredits;
    if (totalAvailable === 0) return false;

    try {
      // Priority 1: Use subscription credits first (if available)
      if (subscriptionCreditsRemaining > 0 && hasActiveSubscription) {
        const { data: subscription, error: subFetchError } = await supabase
          .from('storekit_purchases')
          .select('id, credits_used, is_subscription, product_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .or('expiration_date.is.null,expiration_date.gt.now()')
          .order('created_at', { ascending: false });

        const activeSub = subscription?.find(p => 
          p.is_subscription || p.product_id.includes('sub.') || p.product_id.includes('agency.')
        );

        if (!subFetchError && activeSub) {
          const { error: updateError } = await supabase
            .from('storekit_purchases')
            .update({ credits_used: (activeSub.credits_used || 0) + 1 })
            .eq('id', activeSub.id);

          if (!updateError) {
            await fetchAvailableCredits();
            return true;
          }
        }
      }

      // Priority 2: Use storekit_purchases credit packs
      const { data: creditPacks, error: packError } = await supabase
        .from('storekit_purchases')
        .select('id, credits_amount, credits_used, is_subscription, product_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      if (!packError && creditPacks) {
        // Find a non-subscription pack with available credits
        const availablePack = creditPacks.find(p => {
          const isSubscription = p.is_subscription || 
            p.product_id.includes('sub.') || 
            p.product_id.includes('agency.');
          return !isSubscription && (p.credits_used || 0) < (p.credits_amount || 0);
        });

        if (availablePack) {
          const { error: updateError } = await supabase
            .from('storekit_purchases')
            .update({ credits_used: (availablePack.credits_used || 0) + 1 })
            .eq('id', availablePack.id);

          if (!updateError) {
            await fetchAvailableCredits();
            return true;
          }
        }
      }

      // Priority 3: Use listing_payments credits (legacy)
      const { data: credit, error: fetchError } = await supabase
        .from('listing_payments')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .eq('listing_type', currentListingType)
        .is('property_id', null)
        .order('completed_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (fetchError || !credit) {
        console.error('No credit found:', fetchError);
        return false;
      }

      const { error: updateError } = await supabase
        .from('listing_payments')
        .update({ property_id: propertyId })
        .eq('id', credit.id);

      if (updateError) {
        console.error('Error using credit:', updateError);
        return false;
      }

      await fetchAvailableCredits();
      return true;
    } catch (error) {
      console.error('Error using credit:', error);
      return false;
    }
  }, [user, availableCredits, subscriptionCreditsRemaining, hasActiveSubscription, fetchAvailableCredits, currentListingType]);

  // Initialize
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchSettings(), fetchUserListingsCount(), fetchAvailableCredits()]);
      setLoading(false);
    };
    init();
  }, [fetchSettings, fetchUserListingsCount, fetchAvailableCredits]);

  // Refresh count when user or mode changes
  useEffect(() => {
    if (user) {
      fetchUserListingsCount();
      fetchAvailableCredits();
    }
  }, [user, currentListingType, fetchUserListingsCount, fetchAvailableCredits]);

  // Get the mode-specific settings
  const getModeSettings = (): ModeLimitSettings => {
    if (!settings) {
      return {
        free_listings_default: 3,
        free_listings_agence: 1,
        free_listings_particulier: 3,
        free_listings_proprietaire: 3,
        free_listings_demarcheur: 3,
        price_per_extra: 1000,
      };
    }

    // Check if mode-specific settings exist
    const modeSettings = currentListingType === 'short_term' 
      ? settings.short_term 
      : settings.long_term;

    if (modeSettings) {
      return modeSettings;
    }

    // Fallback to legacy global settings
    return {
      free_listings_default: settings.free_listings_default,
      free_listings_agence: settings.free_listings_agence,
      free_listings_particulier: settings.free_listings_particulier,
      free_listings_proprietaire: settings.free_listings_proprietaire,
      free_listings_demarcheur: settings.free_listings_demarcheur,
      price_per_extra: settings.price_per_extra,
    };
  };

  const currentModeSettings = getModeSettings();

  // Get the free listings limit based on user type for current mode
  const getFreeListingsForUserType = (userType: string | null | undefined): number => {
    switch (userType) {
      case 'agence':
        return currentModeSettings.free_listings_agence ?? 1;
      case 'particulier':
        return currentModeSettings.free_listings_particulier ?? 3;
      case 'proprietaire':
        return currentModeSettings.free_listings_proprietaire ?? 3;
      case 'demarcheur':
        return currentModeSettings.free_listings_demarcheur ?? 3;
      default:
        return currentModeSettings.free_listings_default ?? 3;
    }
  };

  const freeListingsLimit = getFreeListingsForUserType(profile?.user_type);
  
  // Total available credits = subscription credits + listing_payments credits
  const totalAvailableCredits = subscriptionCreditsRemaining + availableCredits;

  // Debug logging for payment calculation
  console.log('[useListingLimit] Mode:', currentListingType, 
    '| Free limit:', freeListingsLimit, 
    '| User listings:', userListingsCount, 
    '| Subscription credits:', subscriptionCreditsRemaining,
    '| Payment credits:', availableCredits,
    '| Total credits:', totalAvailableCredits,
    '| Has subscription:', hasActiveSubscription,
    '| Subscription type:', subscriptionType,
    '| Settings enabled:', settings?.enabled,
    '| Loading:', loading);

  // Calculate if user needs to pay (considering ALL available credits)
  // Important: when free_listings is 0, payment is always required for the first listing
  // Fix: Use > instead of >= only when freeListingsLimit > 0, otherwise always require payment
  const exceededLimit = freeListingsLimit === 0 
    ? true  // When limit is 0, always exceeded (must pay for every listing)
    : userListingsCount >= freeListingsLimit;  // Otherwise check if count >= limit
  
  // User needs payment ONLY if they exceeded limit AND have no credits (subscription or payments)
  const needsPayment = settings?.enabled && 
    !loading &&
    exceededLimit && 
    totalAvailableCredits === 0;

  // User has exceeded free limit but has credits (subscription or payments)
  const canUseCredit = settings?.enabled && 
    !loading &&
    exceededLimit && 
    totalAvailableCredits > 0;
    
  console.log('[useListingLimit] Exceeded limit:', exceededLimit, '| Needs payment:', needsPayment, '| Can use credit:', canUseCredit);

  // Get remaining free listings
  const remainingFreeListings = Math.max(0, freeListingsLimit - userListingsCount);

  // Convert price to user's currency - use mode-specific price
  const getConvertedPrice = useCallback((countryCode: string | null | undefined): { amount: number; currency: string; symbol: string } => {
    const basePriceXOF = currentModeSettings.price_per_extra;
    
    // Get user's currency based on country
    const userCurrency = countryCode ? countryCurrencyMap[countryCode] : null;
    
    if (!userCurrency) {
      return { amount: basePriceXOF, currency: 'XOF', symbol: 'FCFA' };
    }

    const rate = XOF_CONVERSION_RATES[userCurrency.code] || 1;
    const convertedAmount = Math.round(basePriceXOF * rate);

    return {
      amount: convertedAmount,
      currency: userCurrency.code,
      symbol: userCurrency.symbol,
    };
  }, [currentModeSettings]);

  // Get price for current user
  const priceForUser = getConvertedPrice(profile?.country);

  // Update settings (admin only)
  const updateSettings = async (newSettings: Partial<ListingLimitSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      
      // Convert to JSON-compatible format
      const jsonValue = JSON.parse(JSON.stringify(updatedSettings));
      
      const { error } = await supabase
        .from('app_settings')
        .update({ 
          value: jsonValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 'listing_limit');

      if (error) throw error;
      
      setSettings(updatedSettings as ListingLimitSettings);
      return true;
    } catch (error) {
      console.error('Error updating settings:', error);
      return false;
    }
  };

  return {
    settings,
    userListingsCount,
    availableCredits: totalAvailableCredits, // Now includes subscription credits
    subscriptionCreditsRemaining,
    hasActiveSubscription,
    subscriptionType,
    loading,
    needsPayment,
    canUseCredit,
    remainingFreeListings,
    priceForUser,
    getConvertedPrice,
    updateSettings,
    useCredit,
    refetch: () => Promise.all([fetchSettings(), fetchUserListingsCount(), fetchAvailableCredits()]),
  };
};
