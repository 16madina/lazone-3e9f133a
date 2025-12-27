import { useState, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type PaymentPlatform = 'ios' | 'android' | 'web';
export type PaymentMethod = 'apple_iap' | 'stripe' | 'mobile_money';

// Stripe public key - safe to expose in client code
const STRIPE_PUBLIC_KEY = 'pk_live_51S1d9K9SmWX6qvHeQzs6JhRf8hW5IQUYLiNdqQRJf8QzlPuResXtXAxrR4iv4A7ShhpUexajheEEPBxYgNNJ5kBz00UzFsofmj';

interface PaymentResult {
  success: boolean;
  paymentId?: string;
  transactionRef?: string;
  error?: string;
  stripeUrl?: string; // For fallback UI if redirect fails
}

interface UsePlatformPaymentReturn {
  platform: PaymentPlatform;
  preferredMethod: PaymentMethod;
  isLoading: boolean;
  startStripePayment: (params: {
    amount: number;
    currency: string;
    listingType: 'short_term' | 'long_term';
    propertyId?: string;
  }) => Promise<PaymentResult>;
  startApplePayment: (params: {
    productId: string;
    listingType: 'short_term' | 'long_term';
    propertyId?: string;
  }) => Promise<PaymentResult>;
  checkPaymentStatus: (transactionRef: string) => Promise<'pending' | 'completed' | 'failed' | null>;
}

export const usePlatformPayment = (): UsePlatformPaymentReturn => {
  const [isLoading, setIsLoading] = useState(false);

  // Detect platform
  const getPlatform = (): PaymentPlatform => {
    if (Capacitor.isNativePlatform()) {
      const platform = Capacitor.getPlatform();
      if (platform === 'ios') return 'ios';
      if (platform === 'android') return 'android';
    }
    return 'web';
  };

  const platform = getPlatform();


  // Determine preferred payment method based on platform
  const preferredMethod: PaymentMethod = platform === 'ios' ? 'apple_iap' : 'stripe';

  // Get the appropriate redirect URL based on platform
  // Native apps use custom URL scheme for automatic return
  // Web uses the production domain
  const getRedirectOrigin = (): string => {
    if (Capacitor.isNativePlatform()) {
      // Use custom URL scheme for native apps - this will reopen the app automatically
      return 'lazone://';
    }
    // For web, use actual origin but fallback to production if localhost
    const origin = window.location.origin;
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return 'https://lazoneapp.com';
    }
    return origin;
  };

  // Check if we should use deep link scheme
  const isNative = Capacitor.isNativePlatform();

  // Opens an external URL, working around iframe restrictions
  const openExternalUrl = (url: string): { opened: boolean; url: string } => {
    // Try window.open first (works best in iframes)
    const popup = window.open(url, '_blank', 'noopener,noreferrer');
    if (popup) {
      return { opened: true, url };
    }

    // Fallback: try top-level navigation if in iframe
    try {
      if (window.self !== window.top && window.top) {
        window.top.location.assign(url);
        return { opened: true, url };
      }
    } catch {
      // Cross-origin iframe, can't access top
    }

    // Final fallback: direct navigation
    window.location.assign(url);
    return { opened: true, url };
  };

  // Start Stripe payment (for Android and Web)
  const startStripePayment = useCallback(async (params: {
    amount: number;
    currency: string;
    listingType: 'short_term' | 'long_term';
    propertyId?: string;
  }): Promise<PaymentResult> => {
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Non authentifié');
      }

      const mode = params.listingType === 'short_term' ? 'residence' : 'lazone';
      const redirectOrigin = getRedirectOrigin();
      
      // Build success URL - use path format for deep links
      const successPath = isNative ? 'publish' : '/publish';
      const successUrl = new URL(`${redirectOrigin}${successPath}`);
      successUrl.searchParams.set('payment', 'success');
      successUrl.searchParams.set('mode', mode);
      successUrl.searchParams.set('listingType', params.listingType);
      if (params.propertyId) successUrl.searchParams.set('propertyId', params.propertyId);

      const cancelPath = isNative ? 'publish' : '/publish';
      const cancelUrl = new URL(`${redirectOrigin}${cancelPath}`);
      cancelUrl.searchParams.set('payment', 'cancelled');
      cancelUrl.searchParams.set('mode', mode);
      cancelUrl.searchParams.set('listingType', params.listingType);
      if (params.propertyId) cancelUrl.searchParams.set('propertyId', params.propertyId);

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          amount: params.amount,
          currency: params.currency,
          listingType: params.listingType,
          propertyId: params.propertyId,
          successUrl: successUrl.toString(),
          cancelUrl: cancelUrl.toString(),
        },
      });

      if (error) {
        throw new Error(error.message || 'Erreur lors de la création du paiement');
      }

      const url = (data as any)?.url as string | undefined;
      const transactionRef = (data as any)?.transactionRef as string | undefined;

      if (!url) {
        throw new Error('URL de paiement non reçue');
      }

      const result = openExternalUrl(url);

      return {
        success: true,
        transactionRef,
        stripeUrl: result.opened ? url : undefined,
      };
    } catch (error) {
      console.error('Stripe payment error:', error);
      toast({
        title: 'Erreur de paiement',
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
        variant: 'destructive',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Start Apple IAP (for iOS)
  const startApplePayment = useCallback(async (params: {
    productId: string;
    listingType: 'short_term' | 'long_term';
    propertyId?: string;
  }): Promise<PaymentResult> => {
    setIsLoading(true);

    try {
      // Check if we're on iOS
      if (platform !== 'ios') {
        throw new Error('Apple Pay n\'est disponible que sur iOS');
      }

      // Import StoreKit service dynamically
      const { storeKitService } = await import('@/services/storeKitService');

      // Initialize StoreKit
      await storeKitService.initialize();

      // Purchase the product
      const purchase = await storeKitService.purchaseProduct(params.productId);

      if (!purchase.success) {
        if (purchase.cancelled) {
          return { success: false, error: 'Achat annulé' };
        }
        if (purchase.pending) {
          toast({
            title: 'Achat en attente',
            description: 'Votre achat est en cours de traitement',
          });
          return { success: false, error: 'Achat en attente' };
        }
        throw new Error(purchase.error || 'Achat échoué');
      }

      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Non authentifié');
      }

      // Save the purchase to the database
      const { CREDITS_PER_PRODUCT } = await import('@/services/storeKitService');
      const creditsAmount = CREDITS_PER_PRODUCT[params.productId] || 1;

      const { data, error } = await supabase
        .from('storekit_purchases')
        .insert({
          user_id: session.user.id,
          product_id: params.productId,
          transaction_id: purchase.transactionId || `tx_${Date.now()}`,
          original_transaction_id: purchase.originalTransactionId,
          credits_amount: creditsAmount,
          credits_used: 0,
          purchase_date: purchase.purchaseDate || new Date().toISOString(),
          is_subscription: params.productId.includes('agency') || params.productId.includes('sub'),
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving purchase:', error);
        // Still consider success if purchase went through
      }

      toast({
        title: 'Paiement réussi !',
        description: 'Votre crédit a été ajouté',
      });

      return {
        success: true,
        paymentId: data?.id,
        transactionRef: purchase.transactionId,
      };
    } catch (error) {
      console.error('Apple payment error:', error);
      toast({
        title: 'Erreur de paiement',
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
        variant: 'destructive',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      setIsLoading(false);
    }
  }, [platform]);

  // Check payment status
  const checkPaymentStatus = useCallback(async (transactionRef: string): Promise<'pending' | 'completed' | 'failed' | null> => {
    try {
      const { data, error } = await supabase
        .from('listing_payments')
        .select('status')
        .eq('transaction_ref', transactionRef)
        .single();

      if (error || !data) {
        return null;
      }

      return data.status as 'pending' | 'completed' | 'failed';
    } catch {
      return null;
    }
  }, []);

  return {
    platform,
    preferredMethod,
    isLoading,
    startStripePayment,
    startApplePayment,
    checkPaymentStatus,
  };
};
