import { useState, useEffect, useMemo } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, AlertCircle, Check, Phone, Clock, Copy, Apple, Smartphone, ExternalLink } from 'lucide-react';
import waveLogo from '@/assets/wave-logo.png';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePaymentNumbers } from '@/hooks/usePaymentNumbers';
import { usePlatformPayment, PaymentMethod } from '@/hooks/usePlatformPayment';
import { useListingLimit } from '@/hooks/useListingLimit';
import { PRODUCT_ID_LISTING_CREDIT } from '@/services/storeKitService';

interface ListingPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // These props are now optional - will be fetched internally if not provided
  price?: { amount: number; currency: string; symbol: string };
  freeListings?: number;
  currentListings?: number;
  onPaymentComplete: () => void;
  listingType: 'short_term' | 'long_term';
  propertyId?: string;
  onBeforeStripeRedirect?: () => void;
}

const ListingPaymentDialog = ({
  open,
  onOpenChange,
  price: priceFromProps,
  freeListings: freeListingsFromProps,
  currentListings: currentListingsFromProps,
  onPaymentComplete,
  listingType,
  propertyId,
  onBeforeStripeRedirect,
}: ListingPaymentDialogProps) => {
  const { user } = useAuth();
  const { activeNumbers, settings, loading: loadingNumbers } = usePaymentNumbers();
  const { platform, preferredMethod, isLoading: paymentLoading, startStripePayment, startApplePayment } = usePlatformPayment();
  const { priceForUser, remainingFreeListings, userListingsCount, loading: loadingLimits } = useListingLimit();
  
  // Use props if provided, otherwise use values from hook
  const price = useMemo(() => 
    priceFromProps || priceForUser,
    [priceFromProps, priceForUser]
  );
  const freeListings = freeListingsFromProps ?? remainingFreeListings;
  const currentListings = currentListingsFromProps ?? userListingsCount;
  
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [step, setStep] = useState<'info' | 'choose' | 'mobile_money' | 'pending' | 'processing' | 'stripe_fallback'>('info');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [stripeUrl, setStripeUrl] = useState<string | null>(null);

  // Determine available payment methods
  const availableMethods: PaymentMethod[] = [];
  if (platform === 'ios') {
    availableMethods.push('apple_iap');
  }
  availableMethods.push('stripe');
  availableMethods.push('mobile_money');

  const formatPrice = (amount: number, symbol: string) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' ' + symbol;
  };

  const handleProceedToPayment = () => {
    // If only one digital method (not mobile money), go directly
    if (platform === 'ios') {
      setStep('choose');
    } else if (platform === 'android' || platform === 'web') {
      setStep('choose');
    }
  };

  const handleSelectMethod = async (method: PaymentMethod) => {
    setSelectedMethod(method);
    
    if (method === 'mobile_money') {
      setStep('mobile_money');
      return;
    }

    if (method === 'stripe') {
      // Save form data before Stripe redirect
      onBeforeStripeRedirect?.();
      
      setStep('processing');
      const result = await startStripePayment({
        amount: price.amount,
        currency: price.currency,
        listingType,
        propertyId,
      });
      
      if (result.success && result.stripeUrl) {
        // Give time for popup/redirect, then show fallback
        setTimeout(() => {
          setStripeUrl(result.stripeUrl || null);
          setStep('stripe_fallback');
        }, 2000);
      } else if (!result.success) {
        setStep('choose');
      }
      // If success without URL, user was redirected
    }

    if (method === 'apple_iap') {
      setStep('processing');
      const result = await startApplePayment({
        productId: PRODUCT_ID_LISTING_CREDIT,
        listingType,
        propertyId,
      });
      
      if (result.success) {
        onPaymentComplete();
        handleClose();
      } else {
        setStep('choose');
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copié !',
      description: 'Numéro copié dans le presse-papier',
    });
  };

  const handleSubmitMobilePayment = async () => {
    if (!phoneNumber || phoneNumber.length < 8) {
      toast({
        title: 'Numéro invalide',
        description: 'Veuillez entrer un numéro de téléphone valide',
        variant: 'destructive',
      });
      return;
    }

    if (!user) return;

    setLoading(true);
    try {
      const { data: payment, error: paymentError } = await supabase
        .from('listing_payments')
        .insert({
          user_id: user.id,
          amount: price.amount,
          currency: price.currency,
          status: 'pending',
          payment_method: 'mobile_money',
          transaction_ref: `LZ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          sender_phone: phoneNumber,
          listing_type: listingType,
          property_id: propertyId || null,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      setStep('pending');
      
      toast({
        title: 'Demande envoyée !',
        description: 'Votre paiement sera validé sous peu par un administrateur',
      });
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue. Veuillez réessayer.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading && !paymentLoading) {
      onOpenChange(false);
      setTimeout(() => {
        setStep('info');
        setPhoneNumber('');
        setSelectedMethod(null);
        setStripeUrl(null);
      }, 300);
    }
  };

  const getMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'apple_iap':
        return <Apple className="w-5 h-5" />;
      case 'stripe':
        return <CreditCard className="w-5 h-5" />;
      case 'mobile_money':
        return <Phone className="w-5 h-5" />;
    }
  };

  const getMethodLabel = (method: PaymentMethod) => {
    switch (method) {
      case 'apple_iap':
        return 'Apple Pay';
      case 'stripe':
        return 'Carte bancaire';
      case 'mobile_money':
        return 'Mobile Money';
    }
  };

  const getMethodDescription = (method: PaymentMethod) => {
    switch (method) {
      case 'apple_iap':
        return 'Paiement instantané via App Store';
      case 'stripe':
        return 'Disponible avec Wave, Visa';
      case 'mobile_money':
        return 'MTN, Moov, Orange Money';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {/* Step: Info */}
        {step === 'info' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                Limite d'annonces atteinte
              </DialogTitle>
              <DialogDescription className="space-y-3 pt-2">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={listingType === 'short_term' ? 'default' : 'secondary'} className={listingType === 'short_term' ? 'bg-blue-500' : 'bg-emerald-500'}>
                    {listingType === 'short_term' ? '🏠 Résidence' : '🏢 Immobilier'}
                  </Badge>
                </div>
                <p>
                  Vous n'avez plus d'annonces gratuites.
                </p>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    Pour publier une annonce supplémentaire :
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Frais de publication</span>
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {formatPrice(price.amount, price.symbol)}
                    </Badge>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
                Annuler
              </Button>
              <Button onClick={handleProceedToPayment} className="w-full sm:w-auto">
                <CreditCard className="w-4 h-4 mr-2" />
                Payer maintenant
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step: Choose payment method */}
        {step === 'choose' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Choisir un mode de paiement
              </DialogTitle>
              <DialogDescription className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={listingType === 'short_term' ? 'default' : 'secondary'} className={listingType === 'short_term' ? 'bg-blue-500' : 'bg-emerald-500'}>
                    {listingType === 'short_term' ? '🏠 Résidence' : '🏢 Immobilier'}
                  </Badge>
                </div>
                <p>Montant : <strong>{formatPrice(price.amount, price.symbol)}</strong></p>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4">
              {availableMethods.map((method) => (
                <button
                  key={method}
                  onClick={() => handleSelectMethod(method)}
                  disabled={paymentLoading}
                  className="w-full flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    {getMethodIcon(method)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{getMethodLabel(method)}</p>
                      {method === 'stripe' && (
                        <div className="flex items-center gap-1">
                          <img src={waveLogo} alt="Wave" className="w-5 h-5 rounded-full" />
                          <svg viewBox="0 0 48 48" className="w-5 h-5" aria-label="Visa">
                            <rect fill="#1A1F71" width="48" height="48" rx="6"/>
                            <text x="24" y="30" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="Arial">VISA</text>
                          </svg>
                          <svg viewBox="0 0 48 48" className="w-5 h-5" aria-label="Mastercard">
                            <circle cx="18" cy="24" r="14" fill="#EB001B"/>
                            <circle cx="30" cy="24" r="14" fill="#F79E1B"/>
                            <path d="M24 12.5a14 14 0 0 0 0 23" fill="#FF5F00"/>
                          </svg>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{getMethodDescription(method)}</p>
                  </div>
                  {method === preferredMethod && (
                    <Badge variant="secondary" className="text-xs">
                      Recommandé
                    </Badge>
                  )}
                </button>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('info')} disabled={paymentLoading}>
                Retour
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step: Mobile Money */}
        {step === 'mobile_money' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-primary" />
                Paiement Mobile Money
              </DialogTitle>
              <DialogDescription className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={listingType === 'short_term' ? 'default' : 'secondary'} className={listingType === 'short_term' ? 'bg-blue-500' : 'bg-emerald-500'}>
                    {listingType === 'short_term' ? '🏠 Résidence' : '🏢 Immobilier'}
                  </Badge>
                </div>
                <p>{settings?.instructions || "Effectuez un transfert vers l'un de nos numéros puis confirmez"}</p>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-primary/10 p-3 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Montant à envoyer</p>
                <p className="text-2xl font-bold text-primary">
                  {formatPrice(price.amount, price.symbol)}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Envoyez à l'un de ces numéros :</Label>
                <div className="space-y-2">
                  {loadingNumbers ? (
                    <>
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </>
                  ) : activeNumbers.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg text-center">
                      Aucun numéro de paiement configuré. Contactez l'administrateur.
                    </p>
                  ) : (
                    activeNumbers.map((num) => (
                      <div 
                        key={num.id} 
                        className="flex items-center justify-between bg-muted/50 p-3 rounded-lg"
                      >
                        <div>
                          <p className="text-xs text-muted-foreground">{num.label}</p>
                          <p className="font-mono font-medium">{num.number}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(num.number)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Votre numéro (pour confirmation)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+229 XX XX XX XX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Entrez le numéro depuis lequel vous avez effectué le transfert
                </p>
              </div>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button 
                variant="outline" 
                onClick={() => setStep('choose')} 
                disabled={loading}
                className="w-full sm:w-auto"
              >
                Retour
              </Button>
              <Button 
                onClick={handleSubmitMobilePayment} 
                disabled={loading || !phoneNumber || activeNumbers.length === 0}
                className="w-full sm:w-auto"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    J'ai effectué le transfert
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step: Processing */}
        {step === 'processing' && (
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Traitement en cours...</h3>
            <p className="text-muted-foreground">
              {selectedMethod === 'stripe' 
                ? 'Ouverture de la page de paiement...'
                : 'Veuillez patienter...'}
            </p>
          </div>
        )}

        {/* Step: Stripe Fallback - Manual open button if popup was blocked */}
        {step === 'stripe_fallback' && stripeUrl && (
          <div className="py-6 text-center">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExternalLink className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Page de paiement prête</h3>
            <p className="text-muted-foreground mb-4">
              Si la page ne s'est pas ouverte, cliquez sur le bouton ci-dessous.
            </p>
            
            <div className="space-y-3">
              <Button 
                onClick={() => window.open(stripeUrl, '_blank', 'noopener,noreferrer')}
                className="w-full"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Ouvrir la page de paiement
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(stripeUrl);
                  toast({
                    title: 'Lien copié !',
                    description: 'Collez-le dans votre navigateur',
                  });
                }}
                className="w-full"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copier le lien
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              Après le paiement, revenez sur cette page et actualisez.
            </p>
            
            <Button onClick={() => setStep('choose')} variant="ghost" className="mt-4">
              Retour
            </Button>
          </div>
        )}

        {/* Step: Pending (Mobile Money) */}
        {step === 'pending' && (
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Paiement en attente de validation</h3>
            <p className="text-muted-foreground mb-4">
              Un administrateur va vérifier votre paiement. Vous recevrez une notification une fois validé.
            </p>
            <p className="text-sm text-muted-foreground">
              Référence: <span className="font-mono">LZ-{Date.now().toString().slice(-6)}</span>
            </p>
            <Button onClick={handleClose} className="mt-4" variant="outline">
              Fermer
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ListingPaymentDialog;
