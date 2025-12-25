import { useState, useEffect, useCallback } from 'react';
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
  restorePurchases: () => Promise<void>;
  useCredit: () => Promise<boolean>;
  
  // State
  loading: boolean;
  purchasing: boolean;
  initialized: boolean;
  isMockMode: boolean;
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

  // Get free credits limit based on user type
  const freeCreditsLimit = profile?.user_type === 'agence' ? 1 : 3;

  // Calculate credits from purchases
  const totalCredits = purchases.reduce((sum, p) => sum + p.credits_amount, 0);
  const usedCredits = purchases.reduce((sum, p) => sum + p.credits_used, 0);
  const availableCredits = totalCredits - usedCredits;
  const freeCreditsRemaining = Math.max(0, freeCreditsLimit - freeListingsUsed);

  // Get active subscription
  const activeSubscription = purchases.find(
    p => p.is_subscription && p.status === 'active' && 
    (!p.expiration_date || new Date(p.expiration_date) > new Date())
  ) || null;

  // Initialize StoreKit and fetch data
  useEffect(() => {
    const init = async () => {
      try {
        await storeKitService.initialize();
        setCreditPacks(storeKitService.getCreditPacks());
        setSubscriptions(storeKitService.getSubscriptions());
        setInitialized(true);
      } catch (error) {
        console.error('Failed to initialize StoreKit:', error);
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

  // Purchase a product
  const purchaseProduct = useCallback(async (productId: string): Promise<boolean> => {
    if (!user?.id) {
      toast({
        title: 'Connexion requise',
        description: 'Vous devez être connecté pour acheter des crédits',
        variant: 'destructive',
      });
      return false;
    }

    setPurchasing(true);
    try {
      const result: StoreKitPurchaseResult = await storeKitService.purchaseProduct(productId);

      if (result.success && result.transactionId) {
        // Save purchase to database
        const creditsAmount = CREDITS_PER_PRODUCT[productId] || 1;
        const isSubscription = productId.includes('agency');
        
        const { error } = await supabase
          .from('storekit_purchases')
          .insert({
            user_id: user.id,
            product_id: productId,
            transaction_id: result.transactionId,
            original_transaction_id: result.originalTransactionId,
            credits_amount: creditsAmount,
            credits_used: 0,
            purchase_date: result.purchaseDate || new Date().toISOString(),
            is_subscription: isSubscription,
            status: 'active',
          });

        if (error) throw error;

        // Refresh purchases
        const { data: newPurchases } = await supabase
          .from('storekit_purchases')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        setPurchases((newPurchases || []) as StoreKitPurchase[]);

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
  }, [user?.id, toast]);

  // Restore purchases
  const restorePurchases = useCallback(async () => {
    if (!user?.id) return;

    setPurchasing(true);
    try {
      const entitlements = await storeKitService.restorePurchases();
      
      // Process each restored entitlement
      for (const entitlement of entitlements) {
        const creditsAmount = CREDITS_PER_PRODUCT[entitlement.productId] || 1;
        const isSubscription = entitlement.productId.includes('agency');

        // Check if already exists
        const { data: existing } = await supabase
          .from('storekit_purchases')
          .select('id')
          .eq('transaction_id', entitlement.transactionId)
          .maybeSingle();

        if (!existing) {
          await supabase
            .from('storekit_purchases')
            .insert({
              user_id: user.id,
              product_id: entitlement.productId,
              transaction_id: entitlement.transactionId,
              original_transaction_id: entitlement.originalTransactionId,
              credits_amount: creditsAmount,
              credits_used: 0,
              purchase_date: entitlement.purchaseDate,
              expiration_date: entitlement.expirationDate,
              is_subscription: isSubscription,
              status: 'active',
            });
        }
      }

      // Refresh purchases
      const { data: newPurchases } = await supabase
        .from('storekit_purchases')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setPurchases((newPurchases || []) as StoreKitPurchase[]);

      toast({
        title: 'Restauration terminée',
        description: `${entitlements.length} achat(s) restauré(s)`,
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
    restorePurchases,
    useCredit,
    loading,
    purchasing,
    initialized,
    isMockMode: storeKitService.isMockMode(),
  };
}
