import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { countryCurrencyMap } from '@/data/currencies';

export interface ListingLimitSettings {
  enabled: boolean;
  free_listings_default: number;
  free_listings_agence: number;
  free_listings_particulier: number;
  free_listings_proprietaire: number;
  free_listings_demarcheur: number;
  price_per_extra: number;
  currency: string;
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
  const [settings, setSettings] = useState<ListingLimitSettings | null>(null);
  const [userListingsCount, setUserListingsCount] = useState<number>(0);
  const [availableCredits, setAvailableCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);

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

  // Count user's active listings
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
        .eq('is_active', true);

      if (error) throw error;
      setUserListingsCount(count || 0);
    } catch (error) {
      console.error('Error counting user listings:', error);
      setUserListingsCount(0);
    }
  }, [user]);

  // Fetch available credits (completed payments without associated property)
  const fetchAvailableCredits = useCallback(async () => {
    if (!user) {
      setAvailableCredits(0);
      return;
    }

    try {
      const { count, error } = await supabase
        .from('listing_payments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .is('property_id', null);

      if (error) throw error;
      setAvailableCredits(count || 0);
    } catch (error) {
      console.error('Error counting available credits:', error);
      setAvailableCredits(0);
    }
  }, [user]);

  // Use a credit for a property
  const useCredit = useCallback(async (propertyId: string): Promise<boolean> => {
    if (!user || availableCredits === 0) {
      return false;
    }

    try {
      // Find the oldest unused credit
      const { data: credit, error: fetchError } = await supabase
        .from('listing_payments')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .is('property_id', null)
        .order('completed_at', { ascending: true })
        .limit(1)
        .single();

      if (fetchError || !credit) {
        console.error('No credit found:', fetchError);
        return false;
      }

      // Associate the credit with the property
      const { error: updateError } = await supabase
        .from('listing_payments')
        .update({ property_id: propertyId })
        .eq('id', credit.id);

      if (updateError) {
        console.error('Error using credit:', updateError);
        return false;
      }

      // Refresh credits count
      await fetchAvailableCredits();
      return true;
    } catch (error) {
      console.error('Error using credit:', error);
      return false;
    }
  }, [user, availableCredits, fetchAvailableCredits]);

  // Initialize
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchSettings(), fetchUserListingsCount(), fetchAvailableCredits()]);
      setLoading(false);
    };
    init();
  }, [fetchSettings, fetchUserListingsCount, fetchAvailableCredits]);

  // Refresh count when user changes
  useEffect(() => {
    if (user) {
      fetchUserListingsCount();
      fetchAvailableCredits();
    }
  }, [user, fetchUserListingsCount, fetchAvailableCredits]);

  // Get the free listings limit based on user type
  const getFreeListingsForUserType = (userType: string | null | undefined): number => {
    if (!settings) return 3;
    
    switch (userType) {
      case 'agence':
        return settings.free_listings_agence ?? 1;
      case 'particulier':
        return settings.free_listings_particulier ?? 3;
      case 'proprietaire':
        return settings.free_listings_proprietaire ?? 3;
      case 'demarcheur':
        return settings.free_listings_demarcheur ?? 3;
      default:
        return settings.free_listings_default ?? 3;
    }
  };

  const freeListingsLimit = getFreeListingsForUserType(profile?.user_type);

  // Calculate if user needs to pay (considering available credits)
  // Important: when free_listings is 0, payment is always required
  const needsPayment = settings?.enabled && 
    !loading &&
    userListingsCount >= freeListingsLimit && 
    availableCredits === 0;

  // User has exceeded free limit but has credits
  const canUseCredit = settings?.enabled && 
    !loading &&
    userListingsCount >= freeListingsLimit && 
    availableCredits > 0;

  // Get remaining free listings
  const remainingFreeListings = Math.max(0, freeListingsLimit - userListingsCount);

  // Convert price to user's currency
  const getConvertedPrice = useCallback((countryCode: string | null | undefined): { amount: number; currency: string; symbol: string } => {
    if (!settings) {
      return { amount: 1000, currency: 'XOF', symbol: 'FCFA' };
    }

    const basePriceXOF = settings.price_per_extra;
    
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
  }, [settings]);

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
    availableCredits,
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
