import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, 
  Loader2, 
  Home, 
  Bed, 
  Bath, 
  Maximize, 
  Eye,
  Trash2,
  CreditCard,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAppMode } from '@/hooks/useAppMode';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

interface PendingProperty {
  id: string;
  title: string;
  price: number;
  price_per_night?: number | null;
  listing_type?: string;
  address: string;
  city: string;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number;
  property_type: string;
  type: string;
  is_active: boolean;
  created_at: string;
  property_images: { url: string; is_primary: boolean }[];
  payment_status: string;
  payment_created_at: string;
}

export const PendingListingsSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isResidence } = useAppMode();
  const [pendingProperties, setPendingProperties] = useState<PendingProperty[]>([]);
  const [loading, setLoading] = useState(true);

  const listingType = isResidence ? 'short_term' : 'long_term';

  useEffect(() => {
    if (user) {
      fetchPendingProperties();
    }
  }, [user, listingType]);

  const fetchPendingProperties = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Get pending payments with their associated properties
      const { data: payments, error: paymentsError } = await supabase
        .from('listing_payments')
        .select('property_id, status, created_at')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .eq('listing_type', listingType)
        .not('property_id', 'is', null);

      if (paymentsError) throw paymentsError;

      if (!payments || payments.length === 0) {
        setPendingProperties([]);
        setLoading(false);
        return;
      }

      const propertyIds = payments.map(p => p.property_id).filter(Boolean) as string[];

      // Get properties that are inactive and have pending payments
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select(`
          *,
          property_images (url, is_primary)
        `)
        .in('id', propertyIds)
        .eq('is_active', false)
        .eq('listing_type', listingType);

      if (propertiesError) throw propertiesError;

      // Merge payment info with properties
      const pendingWithPayments: PendingProperty[] = (properties || []).map(prop => {
        const payment = payments.find(p => p.property_id === prop.id);
        return {
          ...prop,
          payment_status: payment?.status || 'pending',
          payment_created_at: payment?.created_at || prop.created_at
        };
      });

      setPendingProperties(pendingWithPayments);
    } catch (error) {
      console.error('Error fetching pending properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteProperty = async (propertyId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette annonce en attente ?')) return;

    try {
      // Delete associated payment first
      await supabase
        .from('listing_payments')
        .delete()
        .eq('property_id', propertyId)
        .eq('user_id', user?.id);

      // Delete property images from storage
      const { data: images } = await supabase
        .from('property_images')
        .select('url')
        .eq('property_id', propertyId);

      // Delete property
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setPendingProperties(prev => prev.filter(p => p.id !== propertyId));

      toast({
        title: 'Annonce supprimée',
        description: 'L\'annonce en attente a été supprimée.',
      });
    } catch (error) {
      console.error('Error deleting pending property:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer l\'annonce.',
        variant: 'destructive',
      });
    }
  };

  const getPrimaryImage = (images: { url: string; is_primary: boolean }[]) => {
    const primary = images?.find(img => img.is_primary);
    return primary?.url || images?.[0]?.url || '/placeholder.svg';
  };

  const formatPrice = (property: PendingProperty) => {
    const isShortTerm = property.listing_type
      ? property.listing_type === 'short_term'
      : isResidence;

    const rawPrice = isShortTerm
      ? (property.price_per_night ?? property.price)
      : property.price;

    const safePrice = typeof rawPrice === 'string' ? Number(rawPrice) : rawPrice;

    const formatted = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0,
    }).format(Number.isFinite(safePrice as number) ? (safePrice as number) : 0);

    return isShortTerm ? `${formatted}/nuit` : formatted;
  };

  if (loading) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-amber-700 dark:text-amber-400">En attente de validation</h3>
        </div>
        <div className="text-center py-4">
          <Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (pendingProperties.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-5 h-5 text-amber-500" />
        <h3 className="font-semibold text-amber-700 dark:text-amber-400">
          En attente de validation ({pendingProperties.length})
        </h3>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Ces annonces seront publiées automatiquement une fois votre paiement validé par notre équipe.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {pendingProperties.map((property) => (
          <div
            key={property.id}
            className="bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/50 rounded-xl overflow-hidden"
          >
            <div className="flex">
              <div className="w-24 h-24 flex-shrink-0 relative">
                <img
                  src={getPrimaryImage(property.property_images)}
                  alt={property.title}
                  className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-amber-500/20" />
              </div>
              <div className="flex-1 p-2">
                <div className="flex items-start justify-between gap-1">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{property.title}</h3>
                    <p className="text-primary font-bold text-sm">{formatPrice(property)}</p>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center gap-1">
                    <CreditCard className="w-3 h-3" />
                    Paiement en attente
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Bed className="w-3 h-3" />
                    {property.bedrooms || 0}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Bath className="w-3 h-3" />
                    {property.bathrooms || 0}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Maximize className="w-3 h-3" />
                    {property.area}m²
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[10px] text-muted-foreground">
                    Soumis le {format(new Date(property.payment_created_at), "d MMM yyyy", { locale: fr })}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigate(`/property/${property.id}`)}
                      className="p-1 rounded bg-muted"
                      title="Voir l'aperçu"
                    >
                      <Eye className="w-3 h-3 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => deleteProperty(property.id)}
                      className="p-1 rounded bg-red-50 dark:bg-red-900/20"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
