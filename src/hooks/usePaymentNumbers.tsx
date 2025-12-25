import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PaymentNumber {
  id: string;
  label: string;
  number: string;
  enabled: boolean;
}

export interface PaymentNumbersSettings {
  numbers: PaymentNumber[];
  instructions: string;
}

const DEFAULT_SETTINGS: PaymentNumbersSettings = {
  numbers: [
    { id: 'mtn', label: 'MTN Mobile Money', number: '', enabled: true },
    { id: 'moov', label: 'Moov Money', number: '', enabled: true },
  ],
  instructions: 'Effectuez un transfert vers l\'un de nos numéros puis confirmez votre paiement.',
};

export const usePaymentNumbers = () => {
  const [settings, setSettings] = useState<PaymentNumbersSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('id', 'payment_numbers')
        .single();

      if (error) {
        // If not found, create default using upsert
        if (error.code === 'PGRST116') {
          // Settings don't exist, just use defaults - admin will need to save them
          setSettings(DEFAULT_SETTINGS);
          return;
        }
        throw error;
      }

      const settingsValue = data?.value as unknown as PaymentNumbersSettings;
      setSettings(settingsValue);
    } catch (error) {
      console.error('Error fetching payment numbers:', error);
      setSettings(DEFAULT_SETTINGS);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchSettings();
      setLoading(false);
    };
    init();
  }, [fetchSettings]);

  const updateSettings = async (newSettings: PaymentNumbersSettings) => {
    try {
      const jsonValue = JSON.parse(JSON.stringify(newSettings));

      const { error } = await supabase
        .from('app_settings')
        .upsert({
          id: 'payment_numbers',
          value: jsonValue,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setSettings(newSettings);
      return true;
    } catch (error) {
      console.error('Error updating payment numbers:', error);
      return false;
    }
  };

  // Get only enabled numbers with a valid phone number
  const activeNumbers = settings?.numbers.filter(n => n.enabled && n.number.trim()) || [];

  return {
    settings,
    activeNumbers,
    loading,
    updateSettings,
    refetch: fetchSettings,
  };
};
