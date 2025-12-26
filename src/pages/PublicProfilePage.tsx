import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, BadgeCheck, MapPin, Calendar, 
  Building2, Star, MessageCircle, UserPlus, UserMinus, Users, Loader2,
  Home, Hotel, Crown
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { CompactPropertyCard } from '@/components/property/CompactPropertyCard';
import { ReviewCard } from '@/components/review/ReviewCard';
import { ReviewForm } from '@/components/review/ReviewForm';
import { useAuth } from '@/hooks/useAuth';
import { africanCountries } from '@/data/africanCountries';
import { Property } from '@/hooks/useProperties';
import { toast } from '@/hooks/use-toast';
import { VendorBadge, BadgeLevel } from '@/components/VendorBadge';
import { UserTypeBadge } from '@/components/UserTypeBadge';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  email_verified: boolean | null;
  country: string | null;
  created_at: string;
  user_type: 'particulier' | 'proprietaire' | 'demarcheur' | 'agence' | null;
  agency_name: string | null;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_id: string;
  reviewer: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

type ProfileTab = 'immobilier' | 'residence' | 'notes';

const PublicProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [immobilierProperties, setImmobilierProperties] = useState<Property[]>([]);
  const [residenceProperties, setResidenceProperties] = useState<Property[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [userBadge, setUserBadge] = useState<BadgeLevel>('none');
  const [activeTab, setActiveTab] = useState<ProfileTab>('immobilier');
  const [userSubscription, setUserSubscription] = useState<{ subscription_type: string } | null>(null);

  useEffect(() => {
    if (userId) {
      fetchProfile();
      fetchUserProperties();
      fetchReviews();
      fetchFollowersCount();
      fetchUserBadge();
      fetchUserSubscription();
    }
  }, [userId]);

  useEffect(() => {
    if (user && userId) {
      checkIfFollowing();
      const existing = reviews.find(r => r.reviewer_id === user.id);
      setUserReview(existing || null);
    }
  }, [user, userId, reviews]);

  const fetchProfile = async () => {
    try {
      // Only select non-sensitive public profile fields
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, avatar_url, email_verified, country, created_at, user_type, agency_name')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          property_images(url, is_primary, display_order)
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const transformedProperties: Property[] = (data || []).map((p: any) => {
        const sortedImages = (p.property_images || [])
          .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
          .map((img: any) => img.url);
        
        return {
          id: p.id,
          title: p.title,
          price: p.price,
          pricePerNight: p.price_per_night || null,
          minimumStay: p.minimum_stay || null,
          type: p.type as 'sale' | 'rent',
          propertyType: p.property_type as 'house' | 'apartment' | 'land' | 'commercial',
          listingType: (p.listing_type || 'long_term') as 'long_term' | 'short_term',
          address: p.address,
          city: p.city,
          country: p.country,
          bedrooms: p.bedrooms || 0,
          bathrooms: p.bathrooms || 0,
          area: p.area,
          images: sortedImages.length > 0 ? sortedImages : ['https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800'],
          description: p.description || '',
          features: p.features || [],
          lat: p.lat,
          lng: p.lng,
          createdAt: p.created_at,
          userId: p.user_id,
        };
      });
      
      // Séparer les annonces par mode
      const immobilier = transformedProperties.filter(p => p.listingType === 'long_term');
      const residence = transformedProperties.filter(p => p.listingType === 'short_term');
      
      setImmobilierProperties(immobilier);
      setResidenceProperties(residence);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setPropertiesLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('user_reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          reviewer_id
        `)
        .eq('reviewed_user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch reviewer profiles separately
      const reviewerIds = [...new Set((data || []).map(r => r.reviewer_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', reviewerIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const reviewsWithProfiles: Review[] = (data || []).map(r => ({
        ...r,
        reviewer: profileMap.get(r.reviewer_id) || null
      }));

      setReviews(reviewsWithProfiles);

      // Calculate average rating
      if (reviewsWithProfiles.length > 0) {
        const avg = reviewsWithProfiles.reduce((sum, r) => sum + r.rating, 0) / reviewsWithProfiles.length;
        setAverageRating(Math.round(avg * 10) / 10);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const fetchFollowersCount = async () => {
    try {
      const { count } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);
      setFollowersCount(count || 0);
    } catch (error) {
      console.error('Error fetching followers count:', error);
    }
  };

  const fetchUserBadge = async () => {
    try {
      const { data } = await supabase
        .from('user_badges')
        .select('badge_level')
        .eq('user_id', userId)
        .maybeSingle();
      setUserBadge((data?.badge_level as BadgeLevel) || 'none');
    } catch (error) {
      console.error('Error fetching user badge:', error);
    }
  };

  const fetchUserSubscription = async () => {
    try {
      const { data } = await supabase
        .from('user_subscriptions')
        .select('subscription_type')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();
      setUserSubscription(data);
    } catch (error) {
      console.error('Error fetching user subscription:', error);
    }
  };

  const checkIfFollowing = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .maybeSingle();
      setIsFollowing(!!data);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleFollow = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    setFollowLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);

        if (error) throw error;
        setIsFollowing(false);
        setFollowersCount(prev => prev - 1);
        toast({ title: 'Vous ne suivez plus cet utilisateur' });
      } else {
        // Follow
        const { error } = await supabase
          .from('user_follows')
          .insert({
            follower_id: user.id,
            following_id: userId
          });

        if (error) throw error;
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
        toast({ title: 'Vous suivez maintenant cet utilisateur' });
      }
    } catch (error: any) {
      console.error('Error toggling follow:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue',
        variant: 'destructive'
      });
    } finally {
      setFollowLoading(false);
    }
  };

  const getCountryName = (code: string | null) => {
    if (!code) return null;
    return africanCountries.find(c => c.code === code)?.name || code;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric'
    });
  };

  const handleContactUser = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    navigate('/messages', { state: { recipientId: userId } });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="bg-card border-b border-border p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="w-10 h-10 rounded-full" />
            <Skeleton className="h-6 w-32" />
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="w-24 h-24 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background pb-24 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Profil introuvable</p>
          <Button onClick={() => navigate(-1)} className="mt-4">
            Retour
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-4 p-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display font-semibold text-lg">Profil</h1>
        </div>
      </div>

      {/* Profile Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4"
      >
        <div className="glass-card p-6">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative">
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-background shadow-lg">
                <img
                  src={profile.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop'}
                  alt={profile.full_name || 'Utilisateur'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop';
                  }}
                />
                
                {/* Premium/Pro Diagonal Ribbon Badge */}
                {userSubscription && (
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className={`absolute top-[10px] -left-[26px] w-[90px] text-center py-[2px] text-[7px] font-bold text-white uppercase tracking-wider shadow-md transform -rotate-45 ${
                      userSubscription.subscription_type.includes('premium') 
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500' 
                        : 'bg-gradient-to-r from-purple-500 to-pink-500'
                    }`}>
                      {userSubscription.subscription_type.includes('premium') ? 'Premium' : 'Pro'}
                    </div>
                  </div>
                )}
              </div>
              
              {profile.email_verified && (
                <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1">
                  <BadgeCheck className="w-5 h-5 text-primary-foreground" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display font-bold text-xl">
                  {profile.full_name || 'Utilisateur'}
                </h2>
                {userBadge !== 'none' && (
                  <VendorBadge level={userBadge} size="md" />
                )}
                {profile.email_verified && (
                  <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                    <BadgeCheck className="w-3 h-3" />
                    Vérifié
                  </span>
                )}
              </div>

              {/* User Type Badge */}
              {profile.user_type && profile.user_type !== 'particulier' && (
                <div className="mt-2">
                  <UserTypeBadge 
                    userType={profile.user_type} 
                    agencyName={profile.agency_name}
                    size="md"
                  />
                </div>
              )}

              <div className="mt-2 space-y-1">
                {profile.country && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {getCountryName(profile.country)}
                  </p>
                )}
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Membre depuis {formatDate(profile.created_at)}
                </p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Building2 className="w-4 h-4" />
                  {immobilierProperties.length + residenceProperties.length} annonce{(immobilierProperties.length + residenceProperties.length) > 1 ? 's' : ''} active{(immobilierProperties.length + residenceProperties.length) > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-3 mt-6 pt-6 border-t border-border">
            <div className="text-center">
              <p className="font-display font-bold text-xl text-primary">{immobilierProperties.length + residenceProperties.length}</p>
              <p className="text-[10px] text-muted-foreground">Annonces</p>
            </div>
            <button 
              onClick={() => navigate(`/followers/${userId}?tab=followers`)}
              className="text-center hover:bg-muted/50 rounded-lg transition-colors py-1"
            >
              <p className="font-display font-bold text-xl text-primary">{followersCount}</p>
              <p className="text-[10px] text-muted-foreground">Followers</p>
            </button>
            <div className="text-center">
              <p className="font-display font-bold text-xl text-primary">{reviews.length}</p>
              <p className="text-[10px] text-muted-foreground">Avis</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Star className="w-4 h-4 text-primary fill-primary" />
                <span className="font-display font-bold text-xl">{averageRating || '-'}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Note</p>
            </div>
          </div>

          {/* Action Buttons */}
          {user?.id !== userId && (
            <div className="flex gap-3 mt-6">
              <Button 
                onClick={handleFollow}
                disabled={followLoading}
                variant={isFollowing ? "outline" : "default"}
                className={`flex-1 ${!isFollowing ? 'gradient-primary' : ''}`}
              >
                {followLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : isFollowing ? (
                  <UserMinus className="w-4 h-4 mr-2" />
                ) : (
                  <UserPlus className="w-4 h-4 mr-2" />
                )}
                {isFollowing ? 'Ne plus suivre' : 'Suivre'}
              </Button>
              <Button 
                onClick={handleContactUser}
                variant="outline"
                className="flex-1"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Contacter
              </Button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 bg-muted/50 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('immobilier')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'immobilier'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Immobilier</span>
            <span className="text-xs opacity-70">({immobilierProperties.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('residence')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'residence'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Hotel className="w-4 h-4" />
            <span>Résidence</span>
            <span className="text-xs opacity-70">({residenceProperties.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'notes'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Star className="w-4 h-4" />
            <span>Notes</span>
            <span className="text-xs opacity-70">({reviews.length})</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 pb-4">
        {/* Immobilier Tab */}
        {activeTab === 'immobilier' && (
          <div>
            {propertiesLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
            ) : immobilierProperties.length > 0 ? (
              <div className="space-y-3">
                {immobilierProperties.map((property) => (
                  <CompactPropertyCard
                    key={property.id}
                    property={property}
                  />
                ))}
              </div>
            ) : (
              <div className="glass-card p-8 text-center">
                <Home className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Aucune annonce immobilière</p>
              </div>
            )}
          </div>
        )}

        {/* Residence Tab */}
        {activeTab === 'residence' && (
          <div>
            {propertiesLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
            ) : residenceProperties.length > 0 ? (
              <div className="space-y-3">
                {residenceProperties.map((property) => (
                  <CompactPropertyCard
                    key={property.id}
                    property={property}
                  />
                ))}
              </div>
            ) : (
              <div className="glass-card p-8 text-center">
                <Hotel className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Aucun séjour disponible</p>
              </div>
            )}
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div>
            {/* Review Form (only for logged in users who aren't viewing their own profile) */}
            {user && user.id !== userId && (
              <div className="mb-4">
                <ReviewForm
                  reviewedUserId={userId!}
                  currentUserId={user.id}
                  existingReview={userReview}
                  onReviewSubmitted={fetchReviews}
                />
              </div>
            )}

            {reviewsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
            ) : reviews.length > 0 ? (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            ) : (
              <div className="glass-card p-6 text-center">
                <Star className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground text-sm">Aucun avis pour le moment</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicProfilePage;