import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Coins, Check, Info, Package, Star, Zap, RotateCcw } from 'lucide-react';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useCredits } from '@/hooks/useCredits';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { CreditPaymentDialog } from '@/components/credits/CreditPaymentDialog';

import {
  convertUsdToLocal,
  convertUsdToLocalAmount,
  getCurrencyByCountry,
  parseUsdPrice,
} from '@/data/currencies';
import {
  CREDITS_PER_PRODUCT,
  PRODUCT_PRICES_FCFA,
  SPONSORED_LISTINGS_PER_PRODUCT,
} from '@/services/storeKitService';

type SelectedProduct = {
  id: string;
  name: string;
  price: number;
  symbol: string;
  displayPrice: string;
};

export function CreditPurchaseSheet({
  open,
  onOpenChange,
  defaultTab = 'credits',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'credits' | 'subscriptions';
}) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();

  const {
    creditPacks,
    subscriptions,
    activeSubscription,
    purchaseProduct,
    loading,
    purchasing,
    initialized,
    isIosNative,
  } = useCredits();

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<SelectedProduct | null>(null);

  const userCountry = profile?.country || null;
  const localCurrency = useMemo(() => getCurrencyByCountry(userCountry), [userCountry]);

  const getLocalEstimate = (displayPrice: string): string | null => {
    if (!displayPrice.includes('$')) return null;
    const usdPrice = parseUsdPrice(displayPrice);
    if (!usdPrice) return null;
    return convertUsdToLocal(usdPrice, userCountry);
  };

  const parsePrice = (productId: string, displayPrice: string): { amount: number; symbol: string } => {
    const usdPrice = parseUsdPrice(displayPrice);
    if (usdPrice && userCountry) {
      const converted = convertUsdToLocalAmount(usdPrice, userCountry);
      if (converted) {
        return { amount: converted.amount, symbol: converted.currency.symbol };
      }
    }

    const fcfaPrice = PRODUCT_PRICES_FCFA[productId];
    if (fcfaPrice !== undefined && fcfaPrice > 0) {
      return { amount: fcfaPrice, symbol: 'FCFA' };
    }

    return { amount: 500, symbol: 'FCFA' };
  };

  const handlePurchase = async (product: { id: string; displayName: string; displayPrice: string }) => {
    try {
      if (isIosNative) {
        await purchaseProduct(product.id);
        return;
      }

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
    } catch (e) {
      toast({
        title: 'Erreur',
        description: e instanceof Error ? e.message : 'Impossible de lancer le paiement',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next);
          if (!next) {
            setSelectedProduct(null);
            setPaymentDialogOpen(false);
          }
        }}
      >
        <SheetContent side="bottom" className="h-[100dvh] rounded-none pt-[calc(env(safe-area-inset-top)+1.5rem)]">
          <SheetHeader className="pb-2">
            <SheetTitle className="flex items-center gap-2 text-xl">
              <Coins className="w-6 h-6 text-primary" />
              Acheter des crédits
            </SheetTitle>
          </SheetHeader>

          <Tabs defaultValue={defaultTab} className="h-[calc(100dvh-80px-env(safe-area-inset-top))] flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mb-4 h-12 bg-muted/80 p-1 rounded-xl">
              <TabsTrigger value="credits" className="flex items-center gap-2 rounded-lg text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
                <Package className="w-4 h-4" />
                Crédits
              </TabsTrigger>
              <TabsTrigger value="subscriptions" className="flex items-center gap-2 rounded-lg text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
                <Crown className="w-4 h-4" />
                Abonnements
              </TabsTrigger>
            </TabsList>

            {/* Credits Tab */}
            <TabsContent value="credits" className="flex-1 overflow-y-auto pb-8 space-y-4 mt-0">
              {loading || !initialized ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {creditPacks.map((product) => {
                    const credits = CREDITS_PER_PRODUCT[product.id] || 1;
                    const isBestValue = product.id.includes('pack10');

                    return (
                      <Card
                        key={product.id}
                        className={`relative overflow-hidden transition-all hover:shadow-lg ${
                          isBestValue ? 'border-primary ring-1 ring-primary/30' : ''
                        }`}
                      >
                        {isBestValue && (
                          <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-bl-lg font-medium">
                            -20%
                          </div>
                        )}
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                credits === 1
                                  ? 'bg-blue-500/20'
                                  : credits === 5
                                    ? 'bg-purple-500/20'
                                    : 'bg-amber-500/20'
                              }`}
                            >
                              <Coins
                                className={`w-5 h-5 ${
                                  credits === 1
                                    ? 'text-blue-500'
                                    : credits === 5
                                      ? 'text-purple-500'
                                      : 'text-amber-500'
                                }`}
                              />
                            </div>
                            <div>
                              <p className="font-semibold">{product.displayName}</p>
                              <p className="text-sm text-muted-foreground">{product.description}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Button
                              onClick={() => {
                                handlePurchase(product);
                                onOpenChange(false);
                              }}
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
                    );
                  })}
                </div>
              )}

              {/* Legal info for credits */}
              <div className="space-y-3 pt-4 border-t border-border">
                <p className="text-center text-sm text-muted-foreground">
                  Les crédits sont utilisés pour publier des annonces.
                </p>
                {localCurrency && (
                  <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                    <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      Les montants en {localCurrency.symbol} sont des estimations. Pour Mobile Money, vous payez le montant affiché ;
                      pour carte bancaire, la conversion dépend de votre banque.
                    </p>
                  </div>
                )}
                <LegalLinks navigate={navigate} />
              </div>
            </TabsContent>

            {/* Subscriptions Tab */}
            <TabsContent value="subscriptions" className="flex-1 overflow-y-auto pb-8 space-y-4 mt-0">
              {loading || !initialized ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-32 rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {subscriptions.map((product) => {
                    const isActive = activeSubscription?.product_id === product.id;
                    const isPro = product.id.includes('pro');
                    const isPremium = product.id.includes('premium');

                    const credits = CREDITS_PER_PRODUCT[product.id] || 0;
                    const sponsorings = SPONSORED_LISTINGS_PER_PRODUCT[product.id] || 0;

                    const features = isPremium
                      ? [
                          `${credits} crédits/mois`,
                          `${sponsorings} sponsorings/mois`,
                          'Mise en avant',
                          'Support prioritaire',
                          'Badge Premium',
                        ]
                      : [`${credits} crédits/mois`, `${sponsorings} sponsoring/mois`, 'Badge Pro'];

                    return (
                      <Card
                        key={product.id}
                        className={`relative overflow-hidden transition-all ${
                          isPremium
                            ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30'
                            : isPro
                              ? 'bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30'
                              : ''
                        } ${isActive ? 'ring-2 ring-green-500' : ''}`}
                      >
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
                        <CardHeader className="pb-2 p-4 pt-5">
                          <CardTitle className="flex items-center gap-1.5 text-base font-bold">
                            {isPremium && <Crown className="w-5 h-5 text-amber-500" />}
                            {isPro && <Zap className="w-5 h-5 text-purple-500" />}
                            {product.displayName}
                          </CardTitle>
                          <CardDescription className="text-sm mt-1">{product.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <ul className="space-y-1.5 mb-4">
                            {features.map((feature, i) => (
                              <li key={i} className="flex items-center gap-2 text-sm">
                                <Check className="w-4 h-4 text-green-500 shrink-0" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                          <div className="flex flex-col gap-1">
                            <Button
                              className="w-full"
                              variant={isPremium ? 'default' : 'outline'}
                              onClick={() => {
                                handlePurchase(product);
                                onOpenChange(false);
                              }}
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
                    );
                  })}
                </div>
              )}

              {/* Legal info for subscriptions */}
              <div className="space-y-3 pt-4 border-t border-border">
                <p className="text-center text-sm text-muted-foreground">
                  Les abonnements se renouvellent automatiquement chaque mois.
                </p>
                {localCurrency && (
                  <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                    <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      Les montants en {localCurrency.symbol} sont des estimations. Pour Mobile Money, vous payez le montant affiché ;
                      pour carte bancaire, la conversion dépend de votre banque.
                    </p>
                  </div>
                )}
                <LegalLinks navigate={navigate} />
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

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
    </>
  );
}

function LegalLinks({ navigate }: { navigate: (path: string) => void }) {
  return (
    <div className="text-center space-y-1 pt-2">
      <p className="text-xs text-muted-foreground">
        En achetant, vous acceptez nos{' '}
        <button
          onClick={() => navigate('/settings/legal/terms')}
          className="text-primary underline hover:text-primary/80 transition-colors"
        >
          Conditions d'utilisation
        </button>{' '}
        et notre{' '}
        <button
          onClick={() => navigate('/settings/legal/privacy')}
          className="text-primary underline hover:text-primary/80 transition-colors"
        >
          Politique de confidentialité
        </button>
      </p>
    </div>
  );
}