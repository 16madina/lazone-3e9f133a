import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { storeKitService, CREDITS_PER_PRODUCT, StoreKitProduct, StoreKitPurchaseResult } from '@/services/storeKitService';
import { useToast } from '@/hooks/use-toast';

interface StoreKitPurchase {
  id: string;
  user_id: string;
  product_id: string;
  transaction_id: string;
  original_transaction_id: string | null;
  credits_amount: number;
  credits_used: number;
  purchase_date: string;
  expiration_date: string | null;
  is_subscription: boolean;
  status: string;
  created_at: string;
}

interface UseCreditsReturn {
  // Credits
  availableCredits: number;
  usedCredits: number;
  totalCredits: number;
  freeCreditsRemaining: number;
  freeCreditsLimit: number;
  
  // Products
  creditPacks: StoreKitProduct[];
  subscriptions: StoreKitProduct[];
  
  // Active subscription
  activeSubscription: StoreKitPurchase | null;
  
  // Actions
  purchaseProduct: (productId: string) => Promise<boolean>;
  purchaseWithStripe: (productId: string) => Promise<{ success: boolean; url?: string }>;
  restorePurchases: () => Promise<void>;
  useCredit: () => Promise<boolean>;
  
  // State
  loading: boolean;
  purchasing: boolean;
  initialized: boolean;
  isIosNative: boolean;
  isMockMode: boolean;
  isPurchaseAvailable: boolean;
  storeKitError: string | null;
}

export function useCredits(): UseCreditsReturn {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [purchases, setPurchases] = useState<StoreKitPurchase[]>([]);
  const [creditPacks, setCreditPacks] = useState<StoreKitProduct[]>([]);
  const [subscriptions, setSubscriptions] = useState<StoreKitProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [freeListingsUsed, setFreeListingsUsed] = useState(0);
  const [storeKitError, setStoreKitError] = useState<string | null>(null);

  // Get free credits limit based on user type
  const freeCreditsLimit = profile?.user_type === 'agence' ? 1 : 3;

  // Calculate credits from purchases
  const totalCredits = purchases.reduce((sum, p) => sum + p.credits_amount, 0);
  const usedCredits = purchases.reduce((sum, p) => sum + p.credits_used, 0);
  const availableCredits = totalCredits - usedCredits;
  const freeCreditsRemaining = Math.max(0, freeCreditsLimit - freeListingsUsed);

  // Get active subscription (check both is_subscription flag and product_id pattern)
  const activeSubscription = purchases.find(
    p => (p.is_subscription || p.product_id.includes('sub.') || p.product_id.includes('agency.')) && 
    p.status === 'active' && 
    (!p.expiration_date || new Date(p.expiration_date) > new Date())
  ) || null;

  // Initialize StoreKit and fetch data
  useEffect(() => {
    const init = async () => {
      try {
        await storeKitService.initialize();
        setCreditPacks(storeKitService.getCreditPacks());
        setSubscriptions(storeKitService.getSubscriptions());
        
        // Check for initialization errors
        const initError = storeKitService.getInitError();
        if (initError) {
          setStoreKitError(initError);
        }
        
        setInitialized(true);
      } catch (error) {
        console.error('Failed to initialize StoreKit:', error);
        setStoreKitError('Impossible d\'initialiser le système de paiement');
      }
    };

    init();
  }, []);

  // Fetch user's purchases and listings count
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch StoreKit purchases
        const { data: purchasesData, error: purchasesError } = await supabase
          .from('storekit_purchases')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (purchasesError) throw purchasesError;
        setPurchases((purchasesData || []) as StoreKitPurchase[]);

        // Count active listings to determine free credits used
        const { count, error: countError } = await supabase
          .from('properties')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (countError) throw countError;
        setFreeListingsUsed(count || 0);

      } catch (error) {
        console.error('Failed to fetch credits data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  // Check if we're on iOS native
  const isIosNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

  // Purchase via Stripe (for web/Android)
  const purchaseWithStripe = useCallback(async (productId: string): Promise<{ success: boolean; url?: string }> => {
    if (!user?.id) {
      toast({
        title: 'Connexion requise',
        description: 'Vous devez être connecté pour acheter des crédits',
        variant: 'destructive',
      });
      return { success: false };
    }

    setPurchasing(true);
    try {
      const successUrl = `${window.location.origin}/credits?payment=success`;
      const cancelUrl = `${window.location.origin}/credits?payment=cancelled`;

      const { data, error } = await supabase.functions.invoke('create-credits-checkout', {
        body: {
          productId,
          successUrl,
          cancelUrl,
        },
      });

      if (error) {
        throw new Error(error.message || 'Erreur lors de la création du paiement');
      }

      const url = data?.url;
      if (url) {
        // Open Stripe checkout
        const popup = window.open(url, '_blank', 'noopener,noreferrer');
        if (!popup) {
          // Fallback: return URL for manual opening
          return { success: true, url };
        }
        return { success: true, url };
      }

      throw new Error('URL de paiement non reçue');
    } catch (error) {
      console.error('Stripe purchase error:', error);
      toast({
        title: 'Erreur de paiement',
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
        variant: 'destructive',
      });
      return { success: false };
    } finally {
      setPurchasing(false);
    }
  }, [user?.id, toast]);

  // Purchase a product via StoreKit (iOS only) - validates with Apple server before crediting
  const purchaseProduct = useCallback(async (productId: string): Promise<boolean> => {
    if (!user?.id) {
      toast({
        title: 'Connexion requise',
        description: 'Vous devez être connecté pour acheter des crédits',
        variant: 'destructive',
      });
      return false;
    }

    // If not on iOS native, redirect to Stripe
    if (!isIosNative) {
      const result = await purchaseWithStripe(productId);
      return result.success;
    }

    // Check if purchases are available
    if (!storeKitService.isPurchaseAvailable()) {
      toast({
        title: 'Achat indisponible',
        description: storeKitService.getInitError() || 'StoreKit non disponible',
        variant: 'destructive',
      });
      return false;
    }

    setPurchasing(true);
    try {
      // Step 1: Execute the StoreKit purchase (native iOS)
      const result: StoreKitPurchaseResult = await storeKitService.purchaseProduct(productId);

      if (result.success && result.transactionId) {
        // Step 2: Validate with Apple server via our backend
        console.log('[useCredits] Purchase successful, validating with server...');
        
        const { data, error } = await supabase.functions.invoke('process-storekit-purchase', {
          body: {
            productId,
            transactionId: result.transactionId,
            originalTransactionId: result.originalTransactionId,
            purchaseDate: result.purchaseDate,
          },
        });

        if (error) {
          console.error('[useCredits] Server validation failed:', error);
          toast({
            title: 'Erreur de validation',
            description: 'L\'achat a été effectué mais la validation a échoué. Utilisez "Restaurer les achats".',
            variant: 'destructive',
          });
          return false;
        }

        if (!data.success) {
          toast({
            title: 'Validation échouée',
            description: data.error || 'Impossible de valider l\'achat',
            variant: 'destructive',
          });
          return false;
        }

        // Step 3: Refresh purchases from database
        const { data: newPurchases } = await supabase
          .from('storekit_purchases')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        setPurchases((newPurchases || []) as StoreKitPurchase[]);

        const creditsAmount = CREDITS_PER_PRODUCT[productId] || 1;
        toast({
          title: 'Achat réussi !',
          description: `${creditsAmount} crédit(s) ajouté(s) à votre compte`,
        });

        return true;
      } else if (result.cancelled) {
        // User cancelled, no error message needed
        return false;
      } else if (result.pending) {
        toast({
          title: 'Achat en attente',
          description: 'Votre achat est en cours de traitement',
        });
        return false;
      } else {
        toast({
          title: 'Échec de l\'achat',
          description: result.error || 'Une erreur est survenue',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de traiter l\'achat',
        variant: 'destructive',
      });
      return false;
    } finally {
      setPurchasing(false);
    }
  }, [user?.id, toast, isIosNative, purchaseWithStripe]);

  // Restore purchases - validates each with server
  const restorePurchases = useCallback(async () => {
    if (!user?.id) return;

    // Check if on iOS native
    if (!storeKitService.isIosNative()) {
      toast({
        title: 'Non disponible',
        description: 'La restauration n\'est disponible que sur iOS',
        variant: 'destructive',
      });
      return;
    }

    setPurchasing(true);
    try {
      const entitlements = await storeKitService.restorePurchases();
      
      let restoredCount = 0;
      
      // Process each restored entitlement via server
      for (const entitlement of entitlements) {
        try {
          const { data, error } = await supabase.functions.invoke('process-storekit-purchase', {
            body: {
              productId: entitlement.productId,
              transactionId: entitlement.transactionId,
              originalTransactionId: entitlement.originalTransactionId,
              purchaseDate: entitlement.purchaseDate,
              expirationDate: entitlement.expirationDate,
              isRestore: true,
            },
          });

          if (!error && data?.success) {
            restoredCount++;
          }
        } catch (e) {
          console.error('Error restoring transaction:', entitlement.transactionId, e);
        }
      }

      // Refresh purchases from database
      const { data: newPurchases } = await supabase
        .from('storekit_purchases')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setPurchases((newPurchases || []) as StoreKitPurchase[]);

      toast({
        title: 'Restauration terminée',
        description: `${restoredCount} achat(s) restauré(s)`,
      });
    } catch (error) {
      console.error('Restore error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de restaurer les achats',
        variant: 'destructive',
      });
    } finally {
      setPurchasing(false);
    }
  }, [user?.id, toast]);

  // Use one credit
  const useCredit = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;

    // First check if free credits available
    if (freeCreditsRemaining > 0) {
      return true; // Use free credit
    }

    // Find a purchase with available credits
    const availablePurchase = purchases.find(
      p => p.status === 'active' && p.credits_used < p.credits_amount
    );

    if (!availablePurchase) {
      toast({
        title: 'Pas de crédits',
        description: 'Achetez des crédits pour publier',
        variant: 'destructive',
      });
      return false;
    }

    // Increment used credits
    const { error } = await supabase
      .from('storekit_purchases')
      .update({ credits_used: availablePurchase.credits_used + 1 })
      .eq('id', availablePurchase.id);

    if (error) {
      console.error('Error using credit:', error);
      return false;
    }

    // Update local state
    setPurchases(prev =>
      prev.map(p =>
        p.id === availablePurchase.id
          ? { ...p, credits_used: p.credits_used + 1 }
          : p
      )
    );

    return true;
  }, [user?.id, purchases, freeCreditsRemaining, toast]);

  return {
    availableCredits,
    usedCredits,
    totalCredits,
    freeCreditsRemaining,
    freeCreditsLimit,
    creditPacks,
    subscriptions,
    activeSubscription,
    purchaseProduct,
    purchaseWithStripe,
    restorePurchases,
    useCredit,
    loading,
    purchasing,
    initialized,
    isIosNative,
    isMockMode: storeKitService.isMockMode(),
    isPurchaseAvailable: storeKitService.isPurchaseAvailable(),
    storeKitError,
  };
}
