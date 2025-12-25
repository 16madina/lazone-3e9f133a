import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { countryCurrencyMap } from '@/data/currencies';

export interface ListingLimitSettings {
  enabled: boolean;
  free_listings: number;
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
        free_listings: 3,
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

  // Initialize
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchSettings(), fetchUserListingsCount()]);
      setLoading(false);
    };
    init();
  }, [fetchSettings, fetchUserListingsCount]);

  // Refresh count when user changes
  useEffect(() => {
    if (user) {
      fetchUserListingsCount();
    }
  }, [user, fetchUserListingsCount]);

  // Calculate if user needs to pay
  const needsPayment = settings?.enabled && userListingsCount >= (settings?.free_listings || 3);

  // Get remaining free listings
  const remainingFreeListings = Math.max(0, (settings?.free_listings || 3) - userListingsCount);

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
    loading,
    needsPayment,
    remainingFreeListings,
    priceForUser,
    getConvertedPrice,
    updateSettings,
    refetch: () => Promise.all([fetchSettings(), fetchUserListingsCount()]),
  };
};
