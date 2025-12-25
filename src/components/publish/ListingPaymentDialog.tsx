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
import { Loader2, CreditCard, AlertCircle, Check, Phone, Clock, Copy } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePaymentNumbers } from '@/hooks/usePaymentNumbers';

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
  const { activeNumbers, settings, loading: loadingNumbers } = usePaymentNumbers();
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [step, setStep] = useState<'info' | 'payment' | 'pending'>('info');

  const formatPrice = (amount: number, symbol: string) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' ' + symbol;
  };

  const handleProceedToPayment = () => {
    setStep('payment');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copié !',
      description: 'Numéro copié dans le presse-papier',
    });
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
      // Create a PENDING payment record (will be validated by admin)
      const { data: payment, error: paymentError } = await supabase
        .from('listing_payments')
        .insert({
          user_id: user.id,
          amount: price.amount,
          currency: price.currency,
          status: 'pending', // Pending until admin validates
          payment_method: 'mobile_money',
          transaction_ref: `LZ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
    if (!loading) {
      onOpenChange(false);
      // Reset after a delay to allow animation
      setTimeout(() => {
        setStep('info');
        setPhoneNumber('');
      }, 300);
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
                {settings?.instructions || 'Effectuez un transfert vers l\'un de nos numéros puis confirmez'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-primary/10 p-3 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Montant à envoyer</p>
                <p className="text-2xl font-bold text-primary">
                  {formatPrice(price.amount, price.symbol)}
                </p>
              </div>

              {/* Payment numbers */}
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
                onClick={() => setStep('info')} 
                disabled={loading}
                className="w-full sm:w-auto"
              >
                Retour
              </Button>
              <Button 
                onClick={handleSubmitPayment} 
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
