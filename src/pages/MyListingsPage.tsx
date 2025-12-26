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
  Loader2,
  Sparkles,
  Crown,
  Star,
  TrendingUp,
  Zap,
  Gift,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAppMode } from '@/hooks/useAppMode';
import { useSponsoredListings } from '@/hooks/useSponsoredListings';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format, differenceInHours } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const listingType = isResidence ? 'short_term' : 'long_term';

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    
    if (user) {
      console.log('[MyListingsPage] User authenticated, fetching properties for:', listingType);
      fetchProperties();
    }
  }, [user, authLoading, listingType]);
  
  // Debug: Log sponsored data when it changes
  useEffect(() => {
    console.log('[MyListingsPage] Sponsored data:', {
      subscriptionType,
      sponsoredQuota,
      sponsoredUsed,
      sponsoredRemaining,
      sponsoredLoading
    });
  }, [subscriptionType, sponsoredQuota, sponsoredUsed, sponsoredRemaining, sponsoredLoading]);

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

  const handleSponsorClick = (property: Property) => {
    if (isPropertySponsored(property)) {
      toast({
        title: 'Déjà sponsorisée',
        description: 'Cette annonce est sponsorisée jusqu\'à ' + format(new Date(property.sponsored_until!), 'dd MMM yyyy à HH:mm', { locale: fr }),
      });
      return;
    }
    
    if (!subscriptionType) {
      navigate('/credits');
      return;
    }
    
    if (sponsoredRemaining === 0) {
      toast({
        title: 'Quota atteint',
        description: 'Vous avez utilisé tous vos sponsorings ce mois-ci.',
        variant: 'destructive',
      });
      return;
    }
    
    setSelectedProperty(property);
    setShowConfirmDialog(true);
  };

  const confirmSponsor = async () => {
    if (!selectedProperty) return;
    
    const success = await sponsorProperty(selectedProperty.id);
    if (success) {
      const sponsoredUntil = new Date();
      sponsoredUntil.setDate(sponsoredUntil.getDate() + 3);
      setProperties(prev => 
        prev.map(p => 
          p.id === selectedProperty.id ? { ...p, is_sponsored: true, sponsored_until: sponsoredUntil.toISOString() } : p
        )
      );
    }
    
    setShowConfirmDialog(false);
    setSelectedProperty(null);
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

  const pageTitle = 'Sponsoring';
  const emptyTitle = isResidence ? 'Aucun séjour' : 'Aucune annonce';
  const emptyDescription = isResidence 
    ? 'Vous n\'avez pas encore publié de séjour court terme.'
    : 'Vous n\'avez pas encore publié d\'annonce à sponsoriser.';

  // Count sponsored properties
  const sponsoredCount = properties.filter(p => isPropertySponsored(p)).length;
  // Only show active properties for sponsoring
  const activeProperties = properties.filter(p => p.is_active);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-32">
      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-sm mx-4">
          <AlertDialogHeader>
            <div className="flex items-center justify-center mb-2">
              <div className="p-3 bg-amber-100 rounded-full">
                <Sparkles className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <AlertDialogTitle className="text-center">
              Confirmer le sponsoring
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-3">
              <p>
                Vous êtes sur le point de sponsoriser :
              </p>
              {selectedProperty && (
                <div className="p-3 bg-muted rounded-xl">
                  <p className="font-semibold text-foreground">{selectedProperty.title}</p>
                  <p className="text-xs text-muted-foreground">{selectedProperty.city}</p>
                </div>
              )}
              <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl text-left">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  <strong>Attention :</strong> Une fois confirmé, vous ne pourrez pas changer d'annonce. 
                  Le sponsoring sera actif pendant <strong>3 jours</strong>.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Il vous restera {sponsoredRemaining - 1} sponsoring{sponsoredRemaining - 1 > 1 ? 's' : ''} ce mois-ci.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction 
              onClick={confirmSponsor}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Confirmer le sponsoring
            </AlertDialogAction>
            <AlertDialogCancel className="w-full">
              Annuler
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-4 px-4 py-4">
          <button 
            onClick={() => navigate('/profile')}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              {pageTitle}
            </h1>
            <p className="text-xs text-white/80">
              {sponsoredCount} annonce{sponsoredCount > 1 ? 's' : ''} sponsorisée{sponsoredCount > 1 ? 's' : ''}
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
                    <h3 className="font-bold text-sm">Abonnement {subscriptionType === 'premium' ? 'Premium' : 'Pro'}</h3>
                    <p className="text-xs text-muted-foreground">Sponsorings disponibles</p>
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
            // Non-subscriber CTA - Message explicatif
            <div className="bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 p-4 rounded-2xl text-white">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Gift className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold mb-1">Aucun abonnement actif</h3>
                  <p className="text-xs text-white/80 mb-2">
                    Vous n'avez pas d'abonnement Pro ou Premium actif. Le sponsoring permet de :
                  </p>
                  <ul className="text-xs text-white/80 mb-3 space-y-1 list-disc list-inside">
                    <li>Afficher vos annonces en première page</li>
                    <li>Obtenir jusqu'à +50% de visibilité</li>
                    <li>Être mis en avant pendant 3 jours</li>
                  </ul>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => navigate('/credits')}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-purple-600 rounded-xl text-sm font-semibold hover:bg-white/90 transition-colors"
                    >
                      <Crown className="w-4 h-4" />
                      S'abonner maintenant
                    </button>
                    <p className="text-[10px] text-white/60 text-center">
                      Pro: 1 sponsoring/mois • Premium: 2 sponsorings/mois
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {activeProperties.length === 0 ? (
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
              Publier une annonce
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {activeProperties.length} annonce{activeProperties.length > 1 ? 's' : ''} disponible{activeProperties.length > 1 ? 's' : ''}
            </p>

            {/* Property List */}
            {activeProperties.map((property, index) => {
              const isSponsored = isPropertySponsored(property);
              const timeRemaining = getSponsoredTimeRemaining(property);
              const canSponsor = subscriptionType && sponsoredRemaining > 0 && !isSponsored;
              
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
                    <div className="w-28 h-28 flex-shrink-0 relative">
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
                    <div className="flex-1 p-3 flex flex-col">
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm line-clamp-1">
                          {property.title}
                        </h3>
                        <p className="text-primary font-bold text-sm mt-0.5">
                          {formatPrice(property)}
                        </p>
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{property.city}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
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
                      </div>

                      {/* Sponsor Button */}
                      <div className="mt-2">
                        <button
                          onClick={() => handleSponsorClick(property)}
                          disabled={isSponsored}
                          className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                            isSponsored
                              ? 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 cursor-default'
                              : canSponsor
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 active:scale-95'
                                : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {isSponsored 
                            ? `Sponsorisée • ${timeRemaining}` 
                            : canSponsor 
                              ? 'Sponsoriser cette annonce'
                              : !subscriptionType 
                                ? 'Abonnement requis'
                                : 'Quota atteint'
                          }
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