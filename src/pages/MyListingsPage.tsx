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
  Crown,
  Star,
  TrendingUp,
  Zap,
  Gift
} from 'lucide-react';
import { BlockedDatesManager } from '@/components/appointment/BlockedDatesManager';
import { useAuth } from '@/hooks/useAuth';
import { useAppMode } from '@/hooks/useAppMode';
import { useSponsoredListings } from '@/hooks/useSponsoredListings';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format, differenceInHours } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from 'framer-motion';

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
    refreshSponsoredData,
    loading: sponsoredLoading
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
    if (isPropertySponsored(property)) {
      toast({
        title: 'Déjà sponsorisée',
        description: 'Cette annonce est sponsorisée jusqu\'à ' + format(new Date(property.sponsored_until!), 'dd MMM yyyy à HH:mm', { locale: fr }),
      });
      return;
    }
    
    const success = await sponsorProperty(property.id);
    if (success) {
      const sponsoredUntil = new Date();
      sponsoredUntil.setDate(sponsoredUntil.getDate() + 3);
      setProperties(prev => 
        prev.map(p => 
          p.id === property.id ? { ...p, is_sponsored: true, sponsored_until: sponsoredUntil.toISOString() } : p
        )
      );
    }
  };

  const isPropertySponsored = (property: Property) => {
    return property.is_sponsored && property.sponsored_until && new Date(property.sponsored_until) > new Date();
  };

  const getSponsoredTimeRemaining = (property: Property) => {
    if (!property.sponsored_until) return null;
    const hours = differenceInHours(new Date(property.sponsored_until), new Date());
    if (hours <= 0) return null;
    if (hours < 24) return `${hours}h restantes`;
    const days = Math.floor(hours / 24);
    return `${days}j ${hours % 24}h`;
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

  // Count sponsored properties
  const sponsoredCount = properties.filter(p => isPropertySponsored(p)).length;

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
      <div className="bg-gradient-to-r from-primary via-primary to-primary/80 text-primary-foreground pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-4 px-4 py-4">
          <button 
            onClick={() => navigate('/profile')}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{pageTitle}</h1>
            <p className="text-xs text-primary-foreground/80">
              {properties.length} {countLabel}{properties.length > 1 ? 's' : ''} • {sponsoredCount} sponsorisée{sponsoredCount > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-4">
        {/* Sponsoring Section */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl overflow-hidden"
        >
          {subscriptionType ? (
            // Subscriber banner
            <div className={`p-4 ${
              subscriptionType === 'premium' 
                ? 'bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-yellow-500/20 border border-amber-500/30' 
                : 'bg-gradient-to-br from-purple-500/20 via-pink-500/10 to-violet-500/20 border border-purple-500/30'
            } rounded-2xl`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl ${
                    subscriptionType === 'premium' ? 'bg-amber-500' : 'bg-purple-500'
                  }`}>
                    <Crown className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Sponsoring {subscriptionType === 'premium' ? 'Premium' : 'Pro'}</h3>
                    <p className="text-xs text-muted-foreground">Mettez vos annonces en avant</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-2xl font-bold ${
                    subscriptionType === 'premium' ? 'text-amber-600' : 'text-purple-600'
                  }`}>{sponsoredRemaining}</span>
                  <span className="text-xs text-muted-foreground">/{sponsoredQuota}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-background/50 rounded-full overflow-hidden mb-3">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${sponsoredQuota > 0 ? ((sponsoredQuota - sponsoredRemaining) / sponsoredQuota) * 100 : 0}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={`h-full ${
                    subscriptionType === 'premium' 
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500' 
                      : 'bg-gradient-to-r from-purple-500 to-pink-500'
                  }`}
                />
              </div>

              {/* Benefits */}
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center p-2 bg-background/30 rounded-xl">
                  <TrendingUp className="w-4 h-4 text-green-500 mb-1" />
                  <span className="text-[10px] text-center text-muted-foreground">+50% visibilité</span>
                </div>
                <div className="flex flex-col items-center p-2 bg-background/30 rounded-xl">
                  <Star className="w-4 h-4 text-amber-500 mb-1" />
                  <span className="text-[10px] text-center text-muted-foreground">En première page</span>
                </div>
                <div className="flex flex-col items-center p-2 bg-background/30 rounded-xl">
                  <Zap className="w-4 h-4 text-blue-500 mb-1" />
                  <span className="text-[10px] text-center text-muted-foreground">3 jours/sponsor</span>
                </div>
              </div>

              {sponsoredRemaining === 0 && (
                <p className="text-xs text-center text-muted-foreground mt-3 p-2 bg-background/30 rounded-lg">
                  Quota mensuel atteint. Renouvellement le mois prochain.
                </p>
              )}
            </div>
          ) : (
            // Non-subscriber CTA
            <div className="bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 p-4 rounded-2xl text-white">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Gift className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold mb-1">Boostez vos annonces !</h3>
                  <p className="text-xs text-white/80 mb-3">
                    Passez au Pro ou Premium pour sponsoriser vos annonces et obtenir jusqu'à 50% de visibilité en plus.
                  </p>
                  <button
                    onClick={() => navigate('/credits')}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-purple-600 rounded-xl text-sm font-semibold hover:bg-white/90 transition-colors"
                  >
                    <Crown className="w-4 h-4" />
                    Découvrir les offres
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>

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
            {/* Add new listing button */}
            <div className="flex items-center justify-end">
              <button
                onClick={() => navigate('/publish')}
                className="inline-flex items-center gap-1 text-sm text-primary font-medium"
              >
                <Plus className="w-4 h-4" />
                {isResidence ? 'Nouveau séjour' : 'Nouvelle annonce'}
              </button>
            </div>

            {/* Property List */}
            {properties.map((property, index) => {
              const isSponsored = isPropertySponsored(property);
              const timeRemaining = getSponsoredTimeRemaining(property);
              
              return (
                <motion.div
                  key={property.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-card rounded-xl shadow-sm overflow-hidden relative ${
                    isSponsored ? 'ring-2 ring-amber-400 shadow-amber-100' : ''
                  }`}
                >
                  {/* Sponsored ribbon */}
                  {isSponsored && (
                    <div className="absolute top-0 right-0 z-10">
                      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        SPONSORISÉE
                      </div>
                    </div>
                  )}

                  <div className="flex">
                    {/* Image */}
                    <div className="w-32 h-32 flex-shrink-0 relative">
                      <img
                        src={getPrimaryImage(property.property_images)}
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                      {isSponsored && timeRemaining && (
                        <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-black/70 rounded-full">
                          <span className="text-[10px] text-white font-medium">{timeRemaining}</span>
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
                        {property.is_active && (
                          <button
                            onClick={() => handleSponsor(property)}
                            disabled={!subscriptionType || (!isSponsored && sponsoredRemaining === 0)}
                            className={`p-1.5 rounded-lg transition-all ${
                              isSponsored
                                ? 'bg-gradient-to-r from-amber-100 to-orange-100 hover:from-amber-200 hover:to-orange-200'
                                : subscriptionType && sponsoredRemaining > 0
                                  ? 'bg-amber-50 hover:bg-amber-100 hover:scale-105'
                                  : 'bg-muted opacity-40 cursor-not-allowed'
                            }`}
                            title={
                              isSponsored
                                ? `Sponsorisée - ${timeRemaining}`
                                : !subscriptionType
                                  ? 'Abonnement requis'
                                  : sponsoredRemaining > 0
                                    ? 'Sponsoriser (3 jours)'
                                    : 'Quota atteint'
                            }
                          >
                            <Sparkles className={`w-4 h-4 ${
                              isSponsored 
                                ? 'text-amber-600' 
                                : subscriptionType && sponsoredRemaining > 0
                                  ? 'text-amber-500'
                                  : 'text-muted-foreground'
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
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyListingsPage;
