import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Coins, 
  Gift, 
  Crown, 
  Sparkles, 
  Package, 
  RefreshCw,
  Building2,
  Check,
  Star,
  Zap,
  AlertCircle,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useCredits } from '@/hooks/useCredits';
import { useListingLimit } from '@/hooks/useListingLimit';
import { CREDITS_PER_PRODUCT, SPONSORED_LISTINGS_PER_PRODUCT, PRODUCT_PRICES_FCFA } from '@/services/storeKitService';
import { CreditPaymentDialog } from '@/components/credits/CreditPaymentDialog';
import { convertUsdToLocal, parseUsdPrice, getCurrencyByCountry } from '@/data/currencies';

const CreditsPage = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { 
    settings: listingSettings, 
    availableCredits: totalCreditsFromLimit,
    subscriptionCreditsRemaining,
    hasActiveSubscription,
    subscriptionType,
    remainingFreeListings
  } = useListingLimit();
  const {
    availableCredits,
    freeCreditsRemaining,
    freeCreditsLimit,
    creditPacks,
    subscriptions,
    activeSubscription,
    purchaseProduct,
    restorePurchases,
    loading,
    purchasing,
    initialized,
    isIosNative,
    isMockMode,
    isPurchaseAvailable,
    storeKitError,
  } = useCredits();

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{
    id: string;
    name: string;
    price: number;
    symbol: string;
    displayPrice: string;
  } | null>(null);

  // Get subscription limits from admin settings
  const proMonthlyLimit = listingSettings?.pro_monthly_limit ?? 15;
  const premiumMonthlyLimit = listingSettings?.premium_monthly_limit ?? 30;
  const proSponsoredQuota = listingSettings?.pro_sponsored_quota ?? 1;
  const premiumSponsoredQuota = listingSettings?.premium_sponsored_quota ?? 2;

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  // Check for payment success/cancel in URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    if (payment === 'success') {
      // Clear params and show success message
      window.history.replaceState({}, '', '/credits');
    } else if (payment === 'cancelled') {
      window.history.replaceState({}, '', '/credits');
    }
  }, []);

  const isAgency = profile?.user_type === 'agence';
  const isPremiumUser = hasActiveSubscription && subscriptionType === 'premium';
  const isProUser = hasActiveSubscription && subscriptionType === 'pro';
  
  // Use synchronized total from useListingLimit
  const totalAvailable = totalCreditsFromLimit;

  // Get user's country for local currency display
  const userCountry = profile?.country || null;
  const localCurrency = useMemo(() => getCurrencyByCountry(userCountry), [userCountry]);
  
  // Helper to get local price estimate
  const getLocalEstimate = (displayPrice: string): string | null => {
    const usdPrice = parseUsdPrice(displayPrice);
    if (!usdPrice) return null;
    return convertUsdToLocal(usdPrice, userCountry);
  };

  // Parse price from display string or get from FCFA map
  const parsePrice = (productId: string, displayPrice: string): { amount: number; symbol: string } => {
    // First check if we have the price in our FCFA map
    const fcfaPrice = PRODUCT_PRICES_FCFA[productId];
    if (fcfaPrice) {
      return { amount: fcfaPrice, symbol: 'FCFA' };
    }
    
    // Fallback: try to parse from displayPrice
    const cleanPrice = displayPrice.replace(/[^\d\s]/g, ' ').trim();
    const parts = cleanPrice.split(/\s+/);
    const amount = parseInt(parts[0], 10) || 0;
    
    // Detect symbol
    if (displayPrice.includes('FCFA')) return { amount, symbol: 'FCFA' };
    if (displayPrice.includes('XOF')) return { amount, symbol: 'FCFA' };
    if (displayPrice.includes('$')) return { amount, symbol: 'USD' };
    
    return { amount, symbol: 'FCFA' };
  };

  const handlePurchase = async (product: { id: string; displayName: string; displayPrice: string }) => {
    // On iOS native, use StoreKit directly
    if (isIosNative) {
      await purchaseProduct(product.id);
    } else {
      // On web/Android, show payment method dialog with FCFA prices
      const { amount, symbol } = parsePrice(product.id, product.displayPrice);
      const formattedPrice = new Intl.NumberFormat('fr-FR').format(amount) + ' ' + symbol;
      
      setSelectedProduct({
        id: product.id,
        name: product.displayName,
        price: amount,
        symbol,
        displayPrice: formattedPrice,
      });
      setPaymentDialogOpen(true);
    }
  };

  const handleRestore = async () => {
    await restorePurchases();
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between p-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-lg">Mes Crédits</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRestore}
            disabled={purchasing}
          >
            <RefreshCw className={`w-4 h-4 ${purchasing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* StoreKit Error Banner (iOS only when native plugin fails) */}
        {storeKitError && isIosNative && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-destructive" />
            <p className="text-sm text-destructive">
              {storeKitError}
            </p>
          </motion.div>
        )}


        {/* Credits Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Coins className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {hasActiveSubscription ? 'Crédits restants ce mois' : 'Crédits disponibles'}
                    </p>
                    <p className="text-3xl font-bold text-primary">
                      {hasActiveSubscription 
                        ? `${subscriptionCreditsRemaining}/${isPremiumUser ? premiumMonthlyLimit : proMonthlyLimit}`
                        : totalAvailable
                      }
                    </p>
                  </div>
                </div>
                {hasActiveSubscription && (
                  <Badge className={`${
                    isPremiumUser 
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500' 
                      : 'bg-gradient-to-r from-purple-500 to-pink-500'
                  }`}>
                    <Crown className="w-3 h-3 mr-1" />
                    {isPremiumUser ? 'Premium' : 'Pro'}
                  </Badge>
                )}
              </div>

              {hasActiveSubscription ? (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Abonnement</p>
                      <p className="font-semibold">{subscriptionCreditsRemaining} restant{subscriptionCreditsRemaining > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Crédits achetés</p>
                      <p className="font-semibold">{availableCredits}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-green-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Gratuits</p>
                      <p className="font-semibold">{remainingFreeListings}/{freeCreditsLimit}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Achetés</p>
                      <p className="font-semibold">{availableCredits}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Credit Packs Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">Packs de crédits</h2>
          </div>

          {loading || !initialized ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {creditPacks.map((product, index) => {
                const credits = CREDITS_PER_PRODUCT[product.id] || 1;
                const isBestValue = product.id.includes('pack10');
                
                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <Card className={`relative overflow-hidden transition-all hover:shadow-lg ${isBestValue ? 'border-primary ring-1 ring-primary/30' : ''}`}>
                      {isBestValue && (
                        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-bl-lg font-medium">
                          -20%
                        </div>
                      )}
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            credits === 1 ? 'bg-blue-500/20' : 
                            credits === 5 ? 'bg-purple-500/20' : 'bg-amber-500/20'
                          }`}>
                            <Coins className={`w-5 h-5 ${
                              credits === 1 ? 'text-blue-500' : 
                              credits === 5 ? 'text-purple-500' : 'text-amber-500'
                            }`} />
                          </div>
                          <div>
                            <p className="font-semibold">{product.displayName}</p>
                            <p className="text-sm text-muted-foreground">{product.description}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Button
                            onClick={() => handlePurchase(product)}
                            disabled={purchasing}
                            className={isBestValue ? 'bg-primary' : ''}
                            size="sm"
                          >
                            {product.displayPrice}
                          </Button>
                          {localCurrency && getLocalEstimate(product.displayPrice) && (
                            <span className="text-xs text-muted-foreground">
                              {getLocalEstimate(product.displayPrice)}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Subscriptions Section (for everyone) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Crown className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold text-lg">Abonnements</h2>
          </div>

          {loading || !initialized ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {subscriptions.map((product, index) => {
                const isActive = activeSubscription?.product_id === product.id;
                const isPro = product.id.includes('pro');
                const isPremium = product.id.includes('premium');
                
                // Get credits and sponsorings from constants
                const credits = CREDITS_PER_PRODUCT[product.id] || 0;
                const sponsorings = SPONSORED_LISTINGS_PER_PRODUCT[product.id] || 0;
                
                const features = isPremium 
                  ? [`${credits} crédits/mois`, `${sponsorings} sponsorings/mois`, 'Mise en avant', 'Support prioritaire', 'Badge Premium']
                  : [`${credits} crédits/mois`, `${sponsorings} sponsoring/mois`, 'Badge Pro'];

                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <Card className={`relative overflow-hidden transition-all ${
                      isPremium ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30' :
                      isPro ? 'bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30' :
                      ''
                    } ${isActive ? 'ring-2 ring-green-500' : ''}`}>
                      {isPremium && (
                        <div className="absolute top-0 right-0">
                          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-none rounded-bl-lg">
                            <Star className="w-3 h-3 mr-1" />
                            Populaire
                          </Badge>
                        </div>
                      )}
                      {isActive && (
                        <div className="absolute top-0 left-0">
                          <Badge className="bg-green-500 rounded-none rounded-br-lg">
                            <Check className="w-3 h-3 mr-1" />
                            Actif
                          </Badge>
                        </div>
                      )}
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2">
                          {isPremium && <Crown className="w-5 h-5 text-amber-500" />}
                          {isPro && <Zap className="w-5 h-5 text-purple-500" />}
                          {product.displayName}
                        </CardTitle>
                        <CardDescription>{product.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1 mb-4">
                          {features.map((feature, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm">
                              <Check className="w-4 h-4 text-green-500" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                        <div className="flex flex-col gap-1">
                          <Button
                            className="w-full"
                            variant={isPremium ? 'default' : 'outline'}
                            onClick={() => handlePurchase(product)}
                            disabled={purchasing || isActive}
                          >
                            {isActive ? 'Abonnement actif' : product.displayPrice}
                          </Button>
                          {!isActive && localCurrency && getLocalEstimate(product.displayPrice) && (
                            <span className="text-xs text-muted-foreground text-center">
                              {getLocalEstimate(product.displayPrice)}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Help Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-2 px-4"
        >
          <p className="text-center text-sm text-muted-foreground">
            Les crédits sont utilisés pour publier des annonces. Les abonnements se renouvellent automatiquement chaque mois.
          </p>
          {localCurrency && (
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Les montants en {localCurrency.symbol} sont des estimations. Le prix final sera converti par votre banque au taux du jour lors du paiement.
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Payment Method Dialog (Web/Android only) */}
      {selectedProduct && (
        <CreditPaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          productId={selectedProduct.id}
          productName={selectedProduct.name}
          price={{
            amount: selectedProduct.price,
            symbol: selectedProduct.symbol,
            displayPrice: selectedProduct.displayPrice,
          }}
          onSuccess={() => {
            setPaymentDialogOpen(false);
            setSelectedProduct(null);
          }}
        />
      )}
    </div>
  );
};

export default CreditsPage;
