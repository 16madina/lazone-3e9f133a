import { useState } from 'react';
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
import { Loader2, CreditCard, AlertCircle, Check, Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ListingPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  price: { amount: number; currency: string; symbol: string };
  freeListings: number;
  currentListings: number;
  onPaymentComplete: () => void;
}

const ListingPaymentDialog = ({
  open,
  onOpenChange,
  price,
  freeListings,
  currentListings,
  onPaymentComplete,
}: ListingPaymentDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [step, setStep] = useState<'info' | 'payment' | 'success'>('info');

  const formatPrice = (amount: number, symbol: string) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' ' + symbol;
  };

  const handleProceedToPayment = () => {
    setStep('payment');
    setPaymentMethod('mobile_money');
  };

  const handleSubmitPayment = async () => {
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
      // Create a pending payment record
      const { data: payment, error: paymentError } = await supabase
        .from('listing_payments')
        .insert({
          user_id: user.id,
          amount: price.amount,
          currency: price.currency,
          status: 'completed', // For now, auto-complete. In production, integrate with payment provider
          payment_method: 'mobile_money',
          transaction_ref: `LZ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      setStep('success');
      
      toast({
        title: 'Paiement réussi !',
        description: 'Vous pouvez maintenant publier votre annonce',
      });

      // Wait a moment before closing
      setTimeout(() => {
        onPaymentComplete();
        onOpenChange(false);
        setStep('info');
        setPhoneNumber('');
        setPaymentMethod(null);
      }, 2000);
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: 'Erreur de paiement',
        description: 'Une erreur est survenue. Veuillez réessayer.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
      setStep('info');
      setPhoneNumber('');
      setPaymentMethod(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === 'info' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                Limite d'annonces atteinte
              </DialogTitle>
              <DialogDescription className="space-y-3 pt-2">
                <p>
                  Vous avez déjà publié <strong>{currentListings}</strong> annonces.
                  Les {freeListings} premières annonces sont gratuites.
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

        {step === 'payment' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-primary" />
                Paiement Mobile Money
              </DialogTitle>
              <DialogDescription>
                Entrez votre numéro de téléphone pour effectuer le paiement
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-primary/10 p-3 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Montant à payer</p>
                <p className="text-2xl font-bold text-primary">
                  {formatPrice(price.amount, price.symbol)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Numéro Mobile Money</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+229 XX XX XX XX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Vous recevrez une demande de paiement sur ce numéro
                </p>
              </div>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button 
                variant="outline" 
                onClick={() => setStep('info')} 
                disabled={loading}
                className="w-full sm:w-auto"
              >
                Retour
              </Button>
              <Button 
                onClick={handleSubmitPayment} 
                disabled={loading || !phoneNumber}
                className="w-full sm:w-auto"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Confirmer le paiement
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'success' && (
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Paiement réussi !</h3>
            <p className="text-muted-foreground">
              Vous pouvez maintenant publier votre annonce
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ListingPaymentDialog;
