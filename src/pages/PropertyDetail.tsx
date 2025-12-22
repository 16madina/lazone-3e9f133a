import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import 'swiper/css/pagination';
import { 
  ArrowLeft, 
  Heart, 
  Share2, 
  Bed, 
  Bath, 
  Maximize, 
  MapPin, 
  Phone, 
  MessageCircle,
  Calendar,
  Check,
  BadgeCheck,
  Loader2,
  Flag,
  Ban,
  ChevronRight as ChevronRightIcon,
  Plus,
  Pencil
} from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { ImageGallery } from '@/components/property/ImageGallery';
import { ReportDialog } from '@/components/property/ReportDialog';
import { AppointmentDialog } from '@/components/appointment/AppointmentDialog';
import { ReservationDialog } from '@/components/appointment/ReservationDialog';
import { useAppMode } from '@/hooks/useAppMode';
import { supabase } from '@/integrations/supabase/client';
import { formatPriceWithCurrency } from '@/data/currencies';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useShare } from '@/hooks/useNativePlugins';

interface PropertyDetail {
  id: string;
  title: string;
  price: number;
  type: 'sale' | 'rent';
  propertyType: 'house' | 'apartment' | 'land' | 'commercial';
  address: string;
  city: string;
  country: string | null;
  bedrooms: number;
  bathrooms: number;
  area: number;
  images: string[];
  description: string;
  features: string[];
  userId: string;
  whatsappEnabled: boolean;
  listingType: 'long_term' | 'short_term';
  pricePerNight: number | null;
  minimumStay: number;
  // Discount tiers
  discount3Nights: number | null;
  discount5Nights: number | null;
  discount7Nights: number | null;
  discount14Nights: number | null;
  discount30Nights: number | null;
}

interface OtherProperty {
  id: string;
  title: string;
  price: number;
  country: string | null;
  image: string;
}

const PropertyDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { shareProperty } = useShare();
  const { appMode } = useAppMode();
  const [showGallery, setShowGallery] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [swiperRef, setSwiperRef] = useState<SwiperType | null>(null);
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [ownerInfo, setOwnerInfo] = useState<{ full_name: string | null; phone: string | null; avatar_url: string | null; email_verified: boolean | null } | null>(null);
  const [ownerListingsCount, setOwnerListingsCount] = useState(0);
  const [otherProperties, setOtherProperties] = useState<OtherProperty[]>([]);
  
  const favorite = isFavorite(id || '');

  useEffect(() => {
    const fetchProperty = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        
        // Fetch property with images
        const { data: propertyData, error: propertyError } = await supabase
          .from('properties')
          .select(`
            *,
            property_images (
              url,
              is_primary,
              display_order
            )
          `)
          .eq('id', id)
          .maybeSingle();

        if (propertyError) throw propertyError;
        
        if (!propertyData) {
          setProperty(null);
          setLoading(false);
          return;
        }

        // Sort images: primary first, then by display_order
        const sortedImages = (propertyData.property_images || [])
          .sort((a: any, b: any) => {
            if (a.is_primary && !b.is_primary) return -1;
            if (!a.is_primary && b.is_primary) return 1;
            return (a.display_order || 0) - (b.display_order || 0);
          })
          .map((img: any) => img.url);

        const formattedProperty: PropertyDetail = {
          id: propertyData.id,
          title: propertyData.title,
          price: Number(propertyData.price),
          type: propertyData.type as 'sale' | 'rent',
          propertyType: propertyData.property_type as 'house' | 'apartment' | 'land' | 'commercial',
          address: propertyData.address,
          city: propertyData.city,
          country: propertyData.country,
          bedrooms: propertyData.bedrooms || 0,
          bathrooms: propertyData.bathrooms || 0,
          area: Number(propertyData.area),
          images: sortedImages.length > 0 ? sortedImages : ['/placeholder.svg'],
          description: propertyData.description || '',
          features: propertyData.features || [],
          userId: propertyData.user_id,
          whatsappEnabled: propertyData.whatsapp_enabled || false,
          listingType: propertyData.listing_type as 'long_term' | 'short_term',
          pricePerNight: propertyData.price_per_night ? Number(propertyData.price_per_night) : null,
          minimumStay: propertyData.minimum_stay || 1,
          discount3Nights: propertyData.discount_3_nights ? Number(propertyData.discount_3_nights) : null,
          discount5Nights: propertyData.discount_5_nights ? Number(propertyData.discount_5_nights) : null,
          discount7Nights: propertyData.discount_7_nights ? Number(propertyData.discount_7_nights) : null,
          discount14Nights: propertyData.discount_14_nights ? Number(propertyData.discount_14_nights) : null,
          discount30Nights: propertyData.discount_30_nights ? Number(propertyData.discount_30_nights) : null,
        };

        setProperty(formattedProperty);

        // Fetch owner info
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, phone, avatar_url, email_verified')
          .eq('user_id', propertyData.user_id)
          .maybeSingle();

        if (profileData) {
          setOwnerInfo(profileData);
        }

        // Fetch owner's listings count
        const { count } = await supabase
          .from('properties')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', propertyData.user_id)
          .eq('is_active', true);

        setOwnerListingsCount(count || 0);

        // Fetch other properties from same owner
        const { data: otherProps } = await supabase
          .from('properties')
          .select(`
            id,
            title,
            price,
            country,
            property_images (url, is_primary)
          `)
          .eq('user_id', propertyData.user_id)
          .eq('is_active', true)
          .neq('id', id)
          .limit(5);

        if (otherProps) {
          setOtherProperties(otherProps.map((p: any) => ({
            id: p.id,
            title: p.title,
            price: p.price,
            country: p.country,
            image: p.property_images?.find((img: any) => img.is_primary)?.url || p.property_images?.[0]?.url || '/placeholder.svg'
          })));
        }
      } catch (err) {
        console.error('Error fetching property:', err);
        setProperty(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [id]);

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="page-container flex items-center justify-center min-h-screen">
        <div className="glass-card p-8 text-center">
          <p className="text-4xl mb-4">🏠</p>
          <p className="text-muted-foreground">Propriété non trouvée</p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/')}
            className="mt-4 gradient-primary px-6 py-2 rounded-xl text-primary-foreground"
          >
            Retour à l'accueil
          </motion.button>
        </div>
      </div>
    );
  }

  const formatPrice = (price: number, type: 'sale' | 'rent', country: string | null, isShortTerm?: boolean) => {
    const formattedPrice = formatPriceWithCurrency(price, country);
    if (isShortTerm) {
      return `${formattedPrice}/nuit`;
    }
    if (type === 'rent') {
      return `${formattedPrice}/mois`;
    }
    return formattedPrice;
  };

  // Déterminer si c'est une propriété de type résidence basé sur son listing_type réel
  // On n'utilise plus isResidenceMode car ça causait des erreurs quand on cliquait sur 
  // une propriété long_term affichée par erreur en mode résidence
  const isResidenceProperty = property.listingType === 'short_term';
  const displayPrice = isResidenceProperty && property.pricePerNight 
    ? property.pricePerNight 
    : property.price;

  const formatShortPrice = (price: number, country: string | null) => {
    if (price >= 1000000000) {
      return `${(price / 1000000000).toFixed(0)}B FCFA`;
    } else if (price >= 1000000) {
      return `${(price / 1000000).toFixed(0)}M FCFA`;
    } else if (price >= 1000) {
      return `${(price / 1000).toFixed(0)}K FCFA`;
    }
    return formatPriceWithCurrency(price, country);
  };

  const maxThumbnails = 4;
  const hasMoreImages = property.images.length > maxThumbnails;
  const visibleThumbnails = hasMoreImages ? property.images.slice(0, maxThumbnails) : property.images;
  const remainingCount = property.images.length - maxThumbnails;

  const handleWhatsAppContact = () => {
    if (ownerInfo?.phone) {
      const phone = ownerInfo.phone.replace(/\s/g, '').replace(/^\+/, '');
      const message = encodeURIComponent(`Bonjour, je suis intéressé par votre annonce "${property.title}"`);
      window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    }
  };

  const handleCall = () => {
    if (ownerInfo?.phone) {
      window.location.href = `tel:${ownerInfo.phone}`;
    } else {
      toast({
        title: 'Numéro non disponible',
        description: 'Le vendeur n\'a pas renseigné son numéro de téléphone.',
        variant: 'destructive',
      });
    }
  };

  const handleContactSeller = () => {
    if (!user) {
      toast({
        title: 'Connexion requise',
        description: 'Veuillez vous connecter pour contacter le vendeur.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }
    // Navigate to messages with this property context
    navigate('/messages', { state: { recipientId: property.userId, propertyId: property.id } });
  };

  const handleScheduleVisit = () => {
    if (!user) {
      toast({
        title: 'Connexion requise',
        description: 'Veuillez vous connecter pour prendre rendez-vous.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }
    // Dialog will handle the rest
  };

  return (
    <div className="min-h-screen pb-32">
      {/* Header Image Carousel */}
      <div className="relative h-80">
        <Swiper
          modules={[Pagination]}
          spaceBetween={0}
          slidesPerView={1}
          onSwiper={setSwiperRef}
          onSlideChange={(swiper) => setCurrentImageIndex(swiper.activeIndex)}
          className="h-full"
        >
          {property.images.map((img, idx) => (
            <SwiperSlide key={idx}>
              <img
                src={img}
                alt={`${property.title} - ${idx + 1}`}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setShowGallery(true)}
                onError={(e) => {
                  e.currentTarget.src = '/placeholder.svg';
                }}
              />
            </SwiperSlide>
          ))}
        </Swiper>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none" />
        
        {/* Header Actions */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute left-4 right-4 flex justify-between z-10"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
        >
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="glass w-10 h-10 rounded-full flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          
          <div className="flex gap-2">
            {/* Edit button for owner */}
            {user && user.id === property.userId && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate(`/property/${property.id}/edit`)}
                className="glass w-10 h-10 rounded-full flex items-center justify-center bg-primary/20"
              >
                <Pencil className="w-5 h-5 text-primary" />
              </motion.button>
            )}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => shareProperty({
                id: property.id,
                title: property.title,
                price: property.price,
                city: property.city
              })}
              className="glass w-10 h-10 rounded-full flex items-center justify-center"
            >
              <Share2 className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => toggleFavorite(property.id)}
              className="glass w-10 h-10 rounded-full flex items-center justify-center"
            >
              <Heart className={`w-5 h-5 ${favorite ? 'fill-destructive text-destructive' : ''}`} />
            </motion.button>
          </div>
        </motion.div>

        {/* Thumbnails */}
        {property.images.length > 1 && (
          <div className="absolute bottom-4 left-4 flex gap-2 z-20">
            {visibleThumbnails.map((img, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentImageIndex(idx);
                  swiperRef?.slideTo(idx);
                }}
                className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all shadow-lg ${
                  idx === currentImageIndex 
                    ? 'border-primary' 
                    : 'border-white/50'
                }`}
              >
                <img 
                  src={img} 
                  alt="" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder.svg';
                  }}
                />
              </button>
            ))}
            {hasMoreImages && (
              <button
                onClick={() => setShowGallery(true)}
                className="w-16 h-16 rounded-lg overflow-hidden border-2 border-white/50 relative shadow-lg"
              >
                <img 
                  src={property.images[maxThumbnails]} 
                  alt="" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder.svg';
                  }}
                />
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white font-semibold text-sm flex items-center">
                    <Plus className="w-3 h-3" />{remainingCount}
                  </span>
                </div>
              </button>
            )}
          </div>
        )}

        {/* Image Counter */}
        <div className="absolute bottom-4 right-4 glass px-3 py-1.5 rounded-full text-sm font-medium z-20">
          {currentImageIndex + 1}/{property.images.length}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 -mt-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-5 mb-4"
        >
          <h1 className="font-display text-xl font-bold mb-2">{property.title}</h1>
          <p className="gradient-text font-display font-bold text-2xl mb-3">
            {formatPrice(displayPrice, property.type, property.country, isResidenceProperty)}
          </p>
          
          <div className="flex items-center gap-2 text-muted-foreground mb-4">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">{property.address}, {property.city}</span>
          </div>

          {property.propertyType !== 'land' && (
            <div className="flex items-center gap-6">
              {property.bedrooms > 0 && (
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl glass">
                    <Bed className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{property.bedrooms}</p>
                    <p className="text-xs text-muted-foreground">Chambres</p>
                  </div>
                </div>
              )}
              {property.bathrooms > 0 && (
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl glass">
                    <Bath className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <p className="font-semibold">{property.bathrooms}</p>
                    <p className="text-xs text-muted-foreground">S. de bain</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl glass">
                  <Maximize className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="font-semibold">{property.area}</p>
                  <p className="text-xs text-muted-foreground">m²</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Discount Packages - Only for short-term */}
        {isResidenceProperty && (property.discount3Nights || property.discount5Nights || property.discount7Nights || property.discount14Nights || property.discount30Nights) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass-card p-5 mb-4"
          >
            <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
              🏷️ Forfaits disponibles
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {property.discount3Nights && (
                <div className="p-3 bg-primary/10 rounded-xl text-center">
                  <p className="text-xs text-muted-foreground">3+ nuits</p>
                  <p className="font-bold text-primary">-{property.discount3Nights}%</p>
                  <p className="text-xs">{formatPriceWithCurrency(Math.round((property.pricePerNight || property.price) * (1 - property.discount3Nights / 100)), property.country)}/nuit</p>
                </div>
              )}
              {property.discount5Nights && (
                <div className="p-3 bg-primary/10 rounded-xl text-center">
                  <p className="text-xs text-muted-foreground">5+ nuits</p>
                  <p className="font-bold text-primary">-{property.discount5Nights}%</p>
                  <p className="text-xs">{formatPriceWithCurrency(Math.round((property.pricePerNight || property.price) * (1 - property.discount5Nights / 100)), property.country)}/nuit</p>
                </div>
              )}
              {property.discount7Nights && (
                <div className="p-3 bg-primary/10 rounded-xl text-center">
                  <p className="text-xs text-muted-foreground">7+ nuits</p>
                  <p className="font-bold text-primary">-{property.discount7Nights}%</p>
                  <p className="text-xs">{formatPriceWithCurrency(Math.round((property.pricePerNight || property.price) * (1 - property.discount7Nights / 100)), property.country)}/nuit</p>
                </div>
              )}
              {property.discount14Nights && (
                <div className="p-3 bg-primary/10 rounded-xl text-center">
                  <p className="text-xs text-muted-foreground">14+ nuits</p>
                  <p className="font-bold text-primary">-{property.discount14Nights}%</p>
                  <p className="text-xs">{formatPriceWithCurrency(Math.round((property.pricePerNight || property.price) * (1 - property.discount14Nights / 100)), property.country)}/nuit</p>
                </div>
              )}
              {property.discount30Nights && (
                <div className="p-3 bg-primary/10 rounded-xl text-center">
                  <p className="text-xs text-muted-foreground">30+ nuits</p>
                  <p className="font-bold text-primary">-{property.discount30Nights}%</p>
                  <p className="text-xs">{formatPriceWithCurrency(Math.round((property.pricePerNight || property.price) * (1 - property.discount30Nights / 100)), property.country)}/nuit</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Description */}
        {property.description && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-5 mb-4"
          >
            <h3 className="font-display font-semibold mb-3">Description</h3>
            <p className="text-muted-foreground leading-relaxed">{property.description}</p>
          </motion.div>
        )}

        {/* Features & Documents */}
        {property.features.length > 0 && (() => {
          // Separate amenities from documents
          const documentLabels = [
            'ACD (Attestation de Cession de Droits)',
            'Titre Foncier',
            'Permis de construire',
            'Certificat d\'urbanisme',
            'Plan cadastral',
            'Attestation de propriété'
          ];
          
          const amenities = property.features.filter(f => !documentLabels.includes(f));
          const documents = property.features.filter(f => documentLabels.includes(f));
          
          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-5 mb-4"
            >
              <div className="grid grid-cols-2 gap-6">
                {/* Amenities Column */}
                {amenities.length > 0 && (
                  <div>
                    <h3 className="font-display font-semibold mb-3">Caractéristiques</h3>
                    <div className="space-y-2">
                      {amenities.map((feature) => (
                        <div key={feature} className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Documents Column */}
                {documents.length > 0 && (
                  <div>
                    <h3 className="font-display font-semibold mb-3">Documents</h3>
                    <div className="space-y-2">
                      {documents.map((doc) => (
                        <div key={doc} className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="text-sm">{doc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })()}

        {/* Owner/Agent Section */}
        {ownerInfo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-5 mb-4"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <img
                  src={ownerInfo.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop'}
                  alt={ownerInfo.full_name || 'Propriétaire'}
                  className="w-12 h-12 rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop';
                  }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{ownerInfo.full_name || 'Propriétaire'}</p>
                    {ownerInfo.email_verified && (
                      <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                        <BadgeCheck className="w-3 h-3" />
                        Vérifié
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{ownerListingsCount} annonce{ownerListingsCount > 1 ? 's' : ''}</p>
                </div>
              </div>
              <button 
                onClick={() => navigate(`/user/${property.userId}`)}
                className="px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors"
              >
                Voir profil
              </button>
            </div>

            {/* Contact Buttons */}
            <div className="space-y-3">
              <button 
                onClick={handleContactSeller}
                className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-medium flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                Contacter le {isResidenceProperty ? 'propriétaire' : 'vendeur'}
              </button>
              
              {isResidenceProperty ? (
                <button 
                  onClick={() => navigate(`/reservation/${property.id}`)}
                  className="w-full py-3 rounded-xl border border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Calendar className="w-5 h-5" />
                  Demander une réservation
                </button>
              ) : (
                <AppointmentDialog
                  propertyId={property.id}
                  ownerId={property.userId}
                  propertyTitle={property.title}
                  trigger={
                    <button 
                      onClick={handleScheduleVisit}
                      className="w-full py-3 rounded-xl border border-border hover:bg-muted transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      <Calendar className="w-5 h-5" />
                      Prendre rendez-vous pour une visite
                    </button>
                  }
                />
              )}
              
              <button 
                onClick={handleCall}
                className="w-full py-3 rounded-xl border border-border hover:bg-muted transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Phone className="w-5 h-5" />
                Appeler le vendeur
              </button>
              
              {property.whatsappEnabled && ownerInfo?.phone && (
                <button 
                  onClick={handleWhatsAppContact}
                  className="w-full py-3 rounded-xl border border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-5 h-5" />
                  Contacter via WhatsApp
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Report and Block Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-center gap-8 py-4 mb-4"
        >
          <ReportDialog 
            propertyId={property.id} 
            trigger={
              <button className="flex items-center gap-2 text-destructive hover:text-destructive/80 transition-colors">
                <Flag className="w-4 h-4" />
                <span className="text-sm font-medium">Signaler l'annonce</span>
              </button>
            }
          />
          <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <Ban className="w-4 h-4" />
            <span className="text-sm font-medium">Bloquer</span>
          </button>
        </motion.div>

        {/* Other Properties from Same Owner */}
        {otherProperties.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold">Autres annonces</h3>
              <button className="text-primary text-sm font-medium flex items-center gap-1">
                Voir tout
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
              {otherProperties.map((prop) => (
                <button
                  key={prop.id}
                  onClick={() => navigate(`/property/${prop.id}`)}
                  className="flex-shrink-0 w-28"
                >
                  <div className="w-28 h-20 rounded-xl overflow-hidden mb-2">
                    <img 
                      src={prop.image} 
                      alt={prop.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder.svg';
                      }}
                    />
                  </div>
                  <p className="text-xs font-medium truncate">{prop.title}</p>
                  <p className="text-xs text-primary font-semibold">{formatShortPrice(prop.price, prop.country)}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Image Gallery Modal */}
      <AnimatePresence>
        {showGallery && (
          <ImageGallery
            images={property.images}
            initialIndex={currentImageIndex}
            onClose={() => setShowGallery(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PropertyDetailPage;
