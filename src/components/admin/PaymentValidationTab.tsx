import { useState, useEffect } from 'react';
import { 
  Loader2, 
  Check, 
  X, 
  Clock, 
  Phone, 
  User, 
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Settings,
  Home,
  Building
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import PaymentNumbersSettings from './PaymentNumbersSettings';

interface Payment {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  transaction_ref: string | null;
  created_at: string;
  completed_at: string | null;
  sender_phone: string | null;
  listing_type: string | null;
  property_id: string | null;
  user_name: string | null;
  user_phone: string | null;
  user_email: string | null;
}

const PaymentValidationTab = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'reject';
    payment: Payment;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [modeFilter, setModeFilter] = useState<'all' | 'short_term' | 'long_term'>('all');

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data: paymentsData, error } = await supabase
        .from('listing_payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user details for each payment
      const paymentsWithUsers = await Promise.all(
        (paymentsData || []).map(async (payment) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, phone')
            .eq('user_id', payment.user_id)
            .single();

          // Get email from a separate query since it's in auth.users
          const { data: authData } = await supabase
            .rpc('get_user_email_by_phone', { phone_number: profile?.phone || '' });

          return {
            ...payment,
            user_name: profile?.full_name || 'Utilisateur',
            user_phone: profile?.phone || null,
            user_email: authData || null,
          };
        })
      );

      setPayments(paymentsWithUsers);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les paiements',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleApprove = async (payment: Payment) => {
    setProcessingId(payment.id);
    try {
      // Update payment status
      const { error: updateError } = await supabase
        .from('listing_payments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      if (updateError) throw updateError;

      // If payment has an associated property, activate it
      if (payment.property_id) {
        const { error: propertyError } = await supabase
          .from('properties')
          .update({ is_active: true })
          .eq('id', payment.property_id);

        if (propertyError) {
          console.error('Error activating property:', propertyError);
        } else {
          console.log('Property activated:', payment.property_id);
        }
      }

      // Create notification for user
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: payment.user_id,
          actor_id: user?.id || payment.user_id,
          type: 'payment_approved',
          entity_id: payment.property_id || payment.id, // Link to property if available
        });

      if (notifError) console.error('Notification error:', notifError);

      toast({
        title: 'Paiement validé',
        description: payment.property_id 
          ? `Le paiement de ${payment.user_name} a été approuvé et l'annonce est maintenant active`
          : `Le paiement de ${payment.user_name} a été approuvé`,
      });

      // Refresh list
      fetchPayments();
    } catch (error) {
      console.error('Error approving payment:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de valider le paiement',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
      setConfirmAction(null);
    }
  };

  const handleReject = async (payment: Payment) => {
    setProcessingId(payment.id);
    try {
      // Update payment status
      const { error: updateError } = await supabase
        .from('listing_payments')
        .update({
          status: 'rejected',
        })
        .eq('id', payment.id);

      if (updateError) throw updateError;

      // Create notification for user with rejection reason
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: payment.user_id,
          actor_id: user?.id || payment.user_id,
          type: 'payment_rejected',
          entity_id: payment.id,
        });

      if (notifError) console.error('Notification error:', notifError);

      toast({
        title: 'Paiement rejeté',
        description: `Le paiement de ${payment.user_name} a été rejeté`,
      });

      // Refresh list
      fetchPayments();
    } catch (error) {
      console.error('Error rejecting payment:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de rejeter le paiement',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
      setConfirmAction(null);
      setRejectReason('');
    }
  };

  const formatPrice = (amount: number, currency: string) => {
    const symbol = currency === 'XOF' || currency === 'XAF' ? 'FCFA' : currency;
    return new Intl.NumberFormat('fr-FR').format(amount) + ' ' + symbol;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
            <Clock className="w-3 h-3 mr-1" />
            En attente
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Validé
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            Rejeté
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getListingTypeBadge = (listingType: string | null) => {
    if (listingType === 'short_term') {
      return (
        <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30">
          <Home className="w-3 h-3 mr-1" />
          Résidence
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
        <Building className="w-3 h-3 mr-1" />
        Immobilier
      </Badge>
    );
  };

  const PaymentCard = ({ payment }: { payment: Payment }) => (
    <div className="bg-card border rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{payment.user_name}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {format(new Date(payment.created_at), 'dd MMM yyyy à HH:mm', {
                locale: fr,
              })}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {getStatusBadge(payment.status)}
          {getListingTypeBadge(payment.listing_type)}
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-muted/50 p-2 rounded-lg">
          <p className="text-muted-foreground text-xs">Montant</p>
          <p className="font-semibold text-primary">
            {formatPrice(payment.amount, payment.currency)}
          </p>
        </div>
        {payment.sender_phone && (
          <div className="bg-green-500/10 p-2 rounded-lg border border-green-500/30">
            <p className="text-green-700 text-xs font-medium">N° expéditeur</p>
            <p className="font-medium flex items-center gap-1 text-green-800">
              <Phone className="w-3 h-3" />
              {payment.sender_phone}
            </p>
          </div>
        )}
        {payment.user_phone && !payment.sender_phone && (
          <div className="bg-muted/50 p-2 rounded-lg">
            <p className="text-muted-foreground text-xs">Téléphone profil</p>
            <p className="font-medium flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {payment.user_phone}
            </p>
          </div>
        )}
      </div>

      {/* Show profile phone if sender phone is different */}
      {payment.sender_phone && payment.user_phone && payment.sender_phone !== payment.user_phone && (
        <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
          Téléphone profil: {payment.user_phone}
        </div>
      )}

      {payment.transaction_ref && (
        <div className="text-xs text-muted-foreground">
          Réf: {payment.transaction_ref}
        </div>
      )}

      {/* Actions for pending payments */}
      {payment.status === 'pending' && (
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => setConfirmAction({ type: 'reject', payment })}
            disabled={processingId === payment.id}
          >
            <X className="w-4 h-4 mr-1" />
            Rejeter
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={() => setConfirmAction({ type: 'approve', payment })}
            disabled={processingId === payment.id}
          >
            {processingId === payment.id ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-1" />
            )}
            Valider
          </Button>
        </div>
      )}
    </div>
  );

  const getFilteredPayments = (status: string) => {
    return payments.filter(p => {
      const statusMatch = p.status === status;
      const modeMatch = modeFilter === 'all' || p.listing_type === modeFilter;
      return statusMatch && modeMatch;
    });
  };

  const pendingCount = getFilteredPayments('pending').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Validation des paiements</h3>
          <p className="text-sm text-muted-foreground">
            Validez les paiements reçus par transfert ou Mobile Money
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchPayments}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Mode Filter */}
      <div className="flex gap-2">
        <Button
          variant={modeFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setModeFilter('all')}
        >
          Tous
        </Button>
        <Button
          variant={modeFilter === 'short_term' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setModeFilter('short_term')}
          className={modeFilter === 'short_term' ? 'bg-purple-600 hover:bg-purple-700' : ''}
        >
          <Home className="w-3 h-3 mr-1" />
          Résidence
        </Button>
        <Button
          variant={modeFilter === 'long_term' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setModeFilter('long_term')}
          className={modeFilter === 'long_term' ? 'bg-blue-600 hover:bg-blue-700' : ''}
        >
          <Building className="w-3 h-3 mr-1" />
          Immobilier
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending" className="text-xs relative">
            <Clock className="w-3 h-3 mr-1" />
            En attente
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Validés
          </TabsTrigger>
          <TabsTrigger value="rejected" className="text-xs">
            <XCircle className="w-3 h-3 mr-1" />
            Rejetés
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs">
            <Settings className="w-3 h-3 mr-1" />
            Config
          </TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-4">
          <PaymentNumbersSettings />
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : getFilteredPayments('pending').length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucun paiement en attente {modeFilter !== 'all' ? `(${modeFilter === 'short_term' ? 'Résidence' : 'Immobilier'})` : ''}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {getFilteredPayments('pending').map((payment) => (
                <PaymentCard key={payment.id} payment={payment} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Completed Tab */}
        <TabsContent value="completed" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : getFilteredPayments('completed').length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucun paiement validé {modeFilter !== 'all' ? `(${modeFilter === 'short_term' ? 'Résidence' : 'Immobilier'})` : ''}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {getFilteredPayments('completed').map((payment) => (
                <PaymentCard key={payment.id} payment={payment} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Rejected Tab */}
        <TabsContent value="rejected" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : getFilteredPayments('rejected').length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucun paiement rejeté {modeFilter !== 'all' ? `(${modeFilter === 'short_term' ? 'Résidence' : 'Immobilier'})` : ''}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {getFilteredPayments('rejected').map((payment) => (
                <PaymentCard key={payment.id} payment={payment} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'approve'
                ? 'Confirmer la validation'
                : 'Confirmer le rejet'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'approve' ? (
                <>
                  Êtes-vous sûr d'avoir reçu le paiement de{' '}
                  <strong>
                    {formatPrice(
                      confirmAction.payment.amount,
                      confirmAction.payment.currency
                    )}
                  </strong>{' '}
                  de la part de <strong>{confirmAction.payment.user_name}</strong> ?
                </>
              ) : (
                <>
                  Cette action rejettera le paiement de{' '}
                  <strong>{confirmAction?.payment.user_name}</strong>. L'utilisateur
                  sera notifié.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {confirmAction?.type === 'reject' && (
            <div className="space-y-2">
              <Label htmlFor="reason">Raison du rejet (optionnel)</Label>
              <Textarea
                id="reason"
                placeholder="Ex: Paiement non reçu, montant incorrect..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!processingId}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                confirmAction?.type === 'approve'
                  ? handleApprove(confirmAction.payment)
                  : handleReject(confirmAction!.payment)
              }
              disabled={!!processingId}
              className={
                confirmAction?.type === 'approve'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-destructive hover:bg-destructive/90'
              }
            >
              {processingId ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : confirmAction?.type === 'approve' ? (
                <Check className="w-4 h-4 mr-2" />
              ) : (
                <X className="w-4 h-4 mr-2" />
              )}
              {confirmAction?.type === 'approve' ? 'Valider' : 'Rejeter'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PaymentValidationTab;
