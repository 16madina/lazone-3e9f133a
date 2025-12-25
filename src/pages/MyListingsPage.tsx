import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Plus, 
  Home, 
  MapPin, 
  Bed, 
  Bath, 
  Maximize,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  Calendar,
  Sparkles,
  Crown
} from 'lucide-react';
import { BlockedDatesManager } from '@/components/appointment/BlockedDatesManager';
import { useAuth } from '@/hooks/useAuth';
import { useAppMode } from '@/hooks/useAppMode';
import { useSponsoredListings } from '@/hooks/useSponsoredListings';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Property {
  id: string;
  title: string;
  price: number;
  price_per_night: number | null;
  address: string;
  city: string;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number;
  property_type: string;
  type: string;
  is_active: boolean;
  is_sponsored: boolean;
  sponsored_until: string | null;
  created_at: string;
  listing_type: string;
  property_images: { url: string; is_primary: boolean }[];
}

const MyListingsPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { appMode, isResidence } = useAppMode();
  const { 
    sponsoredQuota, 
    sponsoredUsed, 
    sponsoredRemaining, 
    subscriptionType,
    sponsorProperty, 
    unsponsorProperty,
    refreshSponsoredData 
  } = useSponsoredListings();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  const listingType = isResidence ? 'short_term' : 'long_term';

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    
    if (user) {
      fetchProperties();
    }
  }, [user, authLoading, listingType]);

  const fetchProperties = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          property_images (url, is_primary)
        `)
        .eq('user_id', user.id)
        .eq('listing_type', listingType)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger vos annonces.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePropertyStatus = async (propertyId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ is_active: !currentStatus })
        .eq('id', propertyId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setProperties(prev => 
        prev.map(p => 
          p.id === propertyId ? { ...p, is_active: !currentStatus } : p
        )
      );

      toast({
        title: currentStatus ? 'Annonce désactivée' : 'Annonce activée',
        description: currentStatus 
          ? 'Votre annonce n\'est plus visible.' 
          : 'Votre annonce est maintenant visible.',
      });
    } catch (error) {
      console.error('Error toggling property status:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier le statut.',
        variant: 'destructive',
      });
    }
  };

  const deleteProperty = async (propertyId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?')) return;

    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setProperties(prev => prev.filter(p => p.id !== propertyId));

      toast({
        title: 'Annonce supprimée',
        description: 'Votre annonce a été supprimée avec succès.',
      });
    } catch (error) {
      console.error('Error deleting property:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer l\'annonce.',
        variant: 'destructive',
      });
    }
  };

  const handleSponsor = async (property: Property) => {
    if (property.is_sponsored && property.sponsored_until && new Date(property.sponsored_until) > new Date()) {
      // Already sponsored - unsponsor
      const success = await unsponsorProperty(property.id);
      if (success) {
        setProperties(prev => 
          prev.map(p => 
            p.id === property.id ? { ...p, is_sponsored: false, sponsored_until: null } : p
          )
        );
      }
    } else {
      // Sponsor the property
      const success = await sponsorProperty(property.id);
      if (success) {
        const sponsoredUntil = new Date();
        sponsoredUntil.setDate(sponsoredUntil.getDate() + 30);
        setProperties(prev => 
          prev.map(p => 
            p.id === property.id ? { ...p, is_sponsored: true, sponsored_until: sponsoredUntil.toISOString() } : p
          )
        );
      }
    }
  };

  const isPropertySponsored = (property: Property) => {
    return property.is_sponsored && property.sponsored_until && new Date(property.sponsored_until) > new Date();
  };

  const getPrimaryImage = (images: { url: string; is_primary: boolean }[]) => {
    const primary = images?.find(img => img.is_primary);
    return primary?.url || images?.[0]?.url || '/placeholder.svg';
  };

  const formatPrice = (property: Property) => {
    const price = isResidence && property.price_per_night 
      ? property.price_per_night 
      : property.price;
    const formatted = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0,
    }).format(price);
    return isResidence ? `${formatted}/nuit` : formatted;
  };

  const pageTitle = isResidence ? 'Mes Séjours' : 'Mes Annonces';
  const emptyTitle = isResidence ? 'Aucun séjour' : 'Aucune annonce';
  const emptyDescription = isResidence 
    ? 'Vous n\'avez pas encore publié de séjour court terme.'
    : 'Vous n\'avez pas encore publié d\'annonce.';
  const publishLabel = isResidence ? 'Publier un séjour' : 'Publier une annonce';
  const countLabel = isResidence ? 'séjour' : 'annonce';

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-32">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary via-primary to-primary/80 text-primary-foreground">
        <div className="flex items-center gap-4 px-4 py-4">
          <button 
            onClick={() => navigate('/profile')}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">{pageTitle}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {properties.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Home className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-2">{emptyTitle}</h2>
            <p className="text-muted-foreground mb-6">
              {emptyDescription}
            </p>
            <button
              onClick={() => navigate('/publish')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium"
            >
              <Plus className="w-5 h-5" />
              {publishLabel}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Sponsored Quota Banner */}
            {subscriptionType && (
              <div className={`p-3 rounded-xl ${
                subscriptionType === 'premium' 
                  ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20' 
                  : 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <Crown className={`w-4 h-4 ${subscriptionType === 'premium' ? 'text-amber-500' : 'text-purple-500'}`} />
                  <span className="text-sm font-medium">
                    Annonces sponsorisées
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {sponsoredRemaining} sur {sponsoredQuota} disponibles ce mois
                </p>
                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${
                      subscriptionType === 'premium' 
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500' 
                        : 'bg-gradient-to-r from-purple-500 to-pink-500'
                    }`}
                    style={{ width: `${sponsoredQuota > 0 ? ((sponsoredQuota - sponsoredRemaining) / sponsoredQuota) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {properties.length} {countLabel}{properties.length > 1 ? 's' : ''}
              </p>
              <button
                onClick={() => navigate('/publish')}
                className="inline-flex items-center gap-1 text-sm text-primary font-medium"
              >
                <Plus className="w-4 h-4" />
                {isResidence ? 'Nouveau séjour' : 'Nouvelle annonce'}
              </button>
            </div>

            {/* Property List */}
            {properties.map((property) => (
              <div
                key={property.id}
                className={`bg-card rounded-xl shadow-sm overflow-hidden ${
                  isPropertySponsored(property) ? 'ring-2 ring-amber-500/50' : ''
                }`}
              >
                <div className="flex">
                  {/* Image */}
                  <div className="w-32 h-32 flex-shrink-0 relative">
                    <img
                      src={getPrimaryImage(property.property_images)}
                      alt={property.title}
                      className="w-full h-full object-cover"
                    />
                    {isPropertySponsored(property) && (
                      <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-amber-500 rounded-full">
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">
                          {property.title}
                        </h3>
                        <p className="text-primary font-bold text-sm mt-0.5">
                          {formatPrice(property)}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        property.is_active 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {property.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{property.city}</span>
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {property.bedrooms !== null && (
                        <span className="flex items-center gap-1">
                          <Bed className="w-3 h-3" />
                          {property.bedrooms}
                        </span>
                      )}
                      {property.bathrooms !== null && (
                        <span className="flex items-center gap-1">
                          <Bath className="w-3 h-3" />
                          {property.bathrooms}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Maximize className="w-3 h-3" />
                        {property.area}m²
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => navigate(`/property/${property.id}`)}
                        className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                        title="Voir"
                      >
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </button>
                      {isResidence && (
                        <BlockedDatesManager
                          propertyId={property.id}
                          propertyTitle={property.title}
                          trigger={
                            <button
                              className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                              title="Gérer les disponibilités"
                            >
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                            </button>
                          }
                        />
                      )}
                      {/* Sponsor Button */}
                      {subscriptionType && property.is_active && (
                        <button
                          onClick={() => handleSponsor(property)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isPropertySponsored(property)
                              ? 'bg-amber-100 hover:bg-amber-200'
                              : sponsoredRemaining > 0
                                ? 'bg-amber-50 hover:bg-amber-100'
                                : 'bg-muted opacity-50 cursor-not-allowed'
                          }`}
                          title={
                            isPropertySponsored(property) 
                              ? 'Annuler le sponsoring' 
                              : sponsoredRemaining > 0 
                                ? 'Sponsoriser cette annonce' 
                                : 'Quota de sponsoring atteint'
                          }
                          disabled={!isPropertySponsored(property) && sponsoredRemaining === 0}
                        >
                          <Sparkles className={`w-4 h-4 ${
                            isPropertySponsored(property) ? 'text-amber-600' : 'text-amber-500'
                          }`} />
                        </button>
                      )}
                      <button
                        onClick={() => togglePropertyStatus(property.id, property.is_active)}
                        className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                        title={property.is_active ? 'Désactiver' : 'Activer'}
                      >
                        {property.is_active ? (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Eye className="w-4 h-4 text-green-600" />
                        )}
                      </button>
                      <button
                        onClick={() => deleteProperty(property.id)}
                        className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyListingsPage;
