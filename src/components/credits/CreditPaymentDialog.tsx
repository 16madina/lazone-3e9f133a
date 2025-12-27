import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, 
  Phone, 
  ArrowLeft, 
  Copy, 
  Check,
  Loader2,
  ExternalLink
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { usePaymentNumbers } from '@/hooks/usePaymentNumbers';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import waveLogo from '@/assets/wave-logo.png';
import { Capacitor } from '@capacitor/core';

// Helper to get production URL for Stripe redirects
const getProductionOrigin = (): string => {
  if (Capacitor.isNativePlatform()) {
    return 'https://lazone.lovable.app';
  }
  const origin = window.location.origin;
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return 'https://lazone.lovable.app';
  }
  return origin;
};

type PaymentMethod = 'stripe' | 'mobile_money';
type PaymentStep = 'choose' | 'mobile_money' | 'stripe_fallback' | 'processing' | 'submitted';

interface CreditPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  price: {
    amount: number;
    symbol: string;
    displayPrice: string;
  };
  onSuccess?: () => void;
}

export const CreditPaymentDialog = ({
  open,
  onOpenChange,
  productId,
  productName,
  price,
  onSuccess,
}: CreditPaymentDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings, activeNumbers, loading: loadingNumbers } = usePaymentNumbers();

  const [step, setStep] = useState<PaymentStep>('choose');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [senderPhone, setSenderPhone] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);
  const [stripeUrl, setStripeUrl] = useState<string | null>(null);

  const availableMethods: PaymentMethod[] = ['stripe', 'mobile_money'];

  const handleClose = () => {
    setStep('choose');
    setSelectedMethod(null);
    setSenderPhone('');
    setStripeUrl(null);
    onOpenChange(false);
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedNumber(id);
      setTimeout(() => setCopiedNumber(null), 2000);
      toast({
        title: 'Copié !',
        description: 'Numéro copié dans le presse-papier',
      });
    } catch {
      toast({
        title: 'Erreur',
        description: 'Impossible de copier',
        variant: 'destructive',
      });
    }
  };

  const handleMethodSelect = async (method: PaymentMethod) => {
    setSelectedMethod(method);

    if (method === 'stripe') {
      setIsProcessing(true);
      setStep('processing');

      // Open popup immediately before async call
      const popup = window.open('about:blank', '_blank');

      try {
        const productionOrigin = getProductionOrigin();
        const successUrl = `${productionOrigin}/credits?payment=success`;
        const cancelUrl = `${productionOrigin}/credits?payment=cancelled`;

        const { data, error } = await supabase.functions.invoke('create-credits-checkout', {
          body: {
            productId,
            successUrl,
            cancelUrl,
          },
        });

        if (error) {
          popup?.close();
          throw new Error(error.message);
        }

        const url = data?.url;
        if (url) {
          if (popup && !popup.closed) {
            popup.location.href = url;
            handleClose();
          } else {
            // Popup was blocked, show fallback
            setStripeUrl(url);
            setStep('stripe_fallback');
          }
        } else {
          popup?.close();
          throw new Error('URL de paiement non reçue');
        }
      } catch (error) {
        console.error('Stripe payment error:', error);
        toast({
          title: 'Erreur de paiement',
          description: error instanceof Error ? error.message : 'Une erreur est survenue',
          variant: 'destructive',
        });
        setStep('choose');
      } finally {
        setIsProcessing(false);
      }
    } else if (method === 'mobile_money') {
      setStep('mobile_money');
    }
  };

  const handleMobileMoneySubmit = async () => {
    if (!user?.id || !senderPhone.trim()) {
      toast({
        title: 'Numéro requis',
        description: 'Veuillez entrer le numéro depuis lequel vous avez envoyé le paiement',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Create a listing_payment record for manual validation
      const { error } = await supabase.from('listing_payments').insert({
        user_id: user.id,
        amount: price.amount,
        currency: price.symbol,
        payment_method: 'mobile_money',
        sender_phone: senderPhone.trim(),
        transaction_ref: `MM-${productId}-${Date.now()}`,
        listing_type: 'long_term', // Default for credits
        status: 'pending',
      });

      if (error) throw error;

      setStep('submitted');
      toast({
        title: 'Paiement soumis',
        description: 'Votre paiement sera validé sous peu',
      });
    } catch (error) {
      console.error('Mobile money submission error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de soumettre le paiement',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPrice = (amount: number, symbol: string) => {
    return `${amount.toLocaleString('fr-FR')} ${symbol}`;
  };

  const getMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'stripe':
        return <CreditCard className="w-5 h-5 text-primary" />;
      case 'mobile_money':
        return <Phone className="w-5 h-5 text-green-500" />;
    }
  };

  const getMethodLabel = (method: PaymentMethod) => {
    switch (method) {
      case 'stripe':
        return 'Carte bancaire';
      case 'mobile_money':
        return 'Mobile Money';
    }
  };

  const getMethodDescription = (method: PaymentMethod) => {
    switch (method) {
      case 'stripe':
        return 'Disponible avec Wave, Visa';
      case 'mobile_money':
        return 'MTN, Moov, Orange Money';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <AnimatePresence mode="wait">
          {/* Step: Choose payment method */}
          {step === 'choose' && (
            <motion.div
              key="choose"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <DialogHeader>
                <DialogTitle>Choisir le mode de paiement</DialogTitle>
                <DialogDescription>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary">{productName}</Badge>
                    <span className="font-semibold text-primary">{price.displayPrice}</span>
                  </div>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-4">
                {availableMethods.map((method) => (
                  <Button
                    key={method}
                    variant="outline"
                    className="w-full h-auto p-4 flex items-center justify-between hover:border-primary"
                    onClick={() => handleMethodSelect(method)}
                    disabled={isProcessing}
                  >
                    <div className="flex items-center gap-3">
                      {getMethodIcon(method)}
                      <div className="text-left">
                        <p className="font-medium">{getMethodLabel(method)}</p>
                        <p className="text-xs text-muted-foreground">{getMethodDescription(method)}</p>
                      </div>
                    </div>
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
                  </Button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step: Processing */}
          {step === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="py-8 flex flex-col items-center justify-center"
            >
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Préparation du paiement...</p>
            </motion.div>
          )}

          {/* Step: Stripe fallback */}
          {step === 'stripe_fallback' && stripeUrl && (
            <motion.div
              key="stripe_fallback"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <DialogHeader>
                <DialogTitle>Ouvrir le paiement</DialogTitle>
                <DialogDescription>
                  Le lien de paiement n'a pas pu s'ouvrir automatiquement.
                </DialogDescription>
              </DialogHeader>

              <div className="py-6 space-y-4">
                <Button
                  className="w-full"
                  onClick={() => {
                    window.open(stripeUrl, '_blank');
                    handleClose();
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Ouvrir le paiement
                </Button>
                <Button variant="outline" className="w-full" onClick={handleClose}>
                  Annuler
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step: Mobile Money */}
          {step === 'mobile_money' && (
            <motion.div
              key="mobile_money"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setStep('choose')}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <Phone className="w-5 h-5 text-primary" />
                  Paiement Mobile Money
                </DialogTitle>
                <DialogDescription>
                  {settings?.instructions || "Effectuez un transfert vers l'un de nos numéros puis confirmez"}
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
                            onClick={() => copyToClipboard(num.number, num.id)}
                          >
                            {copiedNumber === num.id ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sender_phone">Votre numéro (expéditeur)</Label>
                  <Input
                    id="sender_phone"
                    type="tel"
                    placeholder="+229 XX XX XX XX"
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Le numéro depuis lequel vous avez envoyé le paiement
                  </p>
                </div>

                <Button
                  className="w-full"
                  onClick={handleMobileMoneySubmit}
                  disabled={isProcessing || !senderPhone.trim()}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    'Confirmer le paiement'
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step: Submitted */}
          {step === 'submitted' && (
            <motion.div
              key="submitted"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="py-8 flex flex-col items-center justify-center text-center"
            >
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Paiement soumis !</h3>
              <p className="text-muted-foreground text-sm mb-6">
                Votre paiement sera validé par notre équipe sous peu. Vous recevrez une notification une fois confirmé.
              </p>
              <Button onClick={handleClose}>
                Fermer
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};