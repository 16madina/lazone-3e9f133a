import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Award, Star, Home, Users, Shield, Crown, Gem, Loader2, CheckCircle2, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import confetti from 'canvas-confetti';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  requiredListings: number;
  requiredReviews: number;
  requiredRating: number;
}

const badges: Badge[] = [
  {
    id: 'bronze',
    name: 'Bronze',
    description: 'Vendeur débutant',
    icon: Award,
    color: 'text-orange-700',
    bgColor: 'bg-gradient-to-br from-orange-100 to-orange-200',
    borderColor: 'border-orange-300',
    requiredListings: 1,
    requiredReviews: 0,
    requiredRating: 0,
  },
  {
    id: 'silver',
    name: 'Argent',
    description: 'Vendeur confirmé',
    icon: Shield,
    color: 'text-slate-600',
    bgColor: 'bg-gradient-to-br from-slate-100 to-slate-200',
    borderColor: 'border-slate-300',
    requiredListings: 3,
    requiredReviews: 2,
    requiredRating: 3,
  },
  {
    id: 'gold',
    name: 'Or',
    description: 'Vendeur expérimenté',
    icon: Star,
    color: 'text-yellow-600',
    bgColor: 'bg-gradient-to-br from-yellow-100 to-yellow-200',
    borderColor: 'border-yellow-400',
    requiredListings: 5,
    requiredReviews: 5,
    requiredRating: 4,
  },
  {
    id: 'platinum',
    name: 'Platine',
    description: 'Vendeur expert',
    icon: Crown,
    color: 'text-cyan-600',
    bgColor: 'bg-gradient-to-br from-cyan-100 to-cyan-200',
    borderColor: 'border-cyan-400',
    requiredListings: 10,
    requiredReviews: 10,
    requiredRating: 4.5,
  },
  {
    id: 'diamond',
    name: 'Diamant',
    description: 'Vendeur élite',
    icon: Gem,
    color: 'text-purple-600',
    bgColor: 'bg-gradient-to-br from-purple-100 to-purple-200',
    borderColor: 'border-purple-400',
    requiredListings: 20,
    requiredReviews: 20,
    requiredRating: 4.8,
  },
];

const VendorBadgesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    listingsCount: 0,
    reviewsCount: 0,
    averageRating: 0,
  });

  const previousBadgeRef = useRef<string | null>(null);

  // Function to trigger confetti celebration
  const triggerConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      // Shoot confetti from both sides
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#1E90FF']
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#1E90FF']
      });
    }, 250);
  };

  useEffect(() => {
    if (user) {
      fetchUserStats();
    }
  }, [user]);

  // Check for badge upgrade and trigger confetti
  useEffect(() => {
    if (loading) return;
    
    const currentBadge = getCurrentBadge();
    const currentBadgeId = currentBadge?.id || null;
    const storedBadge = localStorage.getItem(`badge_${user?.id}`);
    
    // If this is the first time, just store the badge
    if (storedBadge === null && user) {
      localStorage.setItem(`badge_${user.id}`, currentBadgeId || 'none');
      return;
    }
    
    // If badge has been upgraded, trigger confetti
    if (currentBadgeId && storedBadge !== currentBadgeId && user) {
      const badgeOrder = ['none', 'bronze', 'silver', 'gold', 'platinum', 'diamond'];
      const oldIndex = badgeOrder.indexOf(storedBadge || 'none');
      const newIndex = badgeOrder.indexOf(currentBadgeId);
      
      if (newIndex > oldIndex) {
        triggerConfetti();
      }
      localStorage.setItem(`badge_${user.id}`, currentBadgeId);
    }
  }, [loading, stats, user]);

  const fetchUserStats = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch listings count
      const { count: listingsCount } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Fetch reviews
      const { data: reviews } = await supabase
        .from('user_reviews')
        .select('rating')
        .eq('reviewed_user_id', user.id);

      const reviewsCount = reviews?.length || 0;
      const averageRating = reviewsCount > 0 
        ? reviews!.reduce((acc, r) => acc + r.rating, 0) / reviewsCount 
        : 0;

      setStats({
        listingsCount: listingsCount || 0,
        reviewsCount,
        averageRating: Math.round(averageRating * 10) / 10,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentBadge = () => {
    let currentBadge = null;
    for (const badge of badges) {
      if (
        stats.listingsCount >= badge.requiredListings &&
        stats.reviewsCount >= badge.requiredReviews &&
        (badge.requiredRating === 0 || stats.averageRating >= badge.requiredRating)
      ) {
        currentBadge = badge;
      }
    }
    return currentBadge;
  };

  const getNextBadge = () => {
    const currentBadge = getCurrentBadge();
    if (!currentBadge) return badges[0];
    const currentIndex = badges.findIndex(b => b.id === currentBadge.id);
    return badges[currentIndex + 1] || null;
  };

  const isBadgeUnlocked = (badge: Badge) => {
    return (
      stats.listingsCount >= badge.requiredListings &&
      stats.reviewsCount >= badge.requiredReviews &&
      (badge.requiredRating === 0 || stats.averageRating >= badge.requiredRating)
    );
  };

  const getProgressToNextBadge = () => {
    const nextBadge = getNextBadge();
    if (!nextBadge) return { listings: 100, reviews: 100, rating: 100 };

    return {
      listings: Math.min(100, (stats.listingsCount / nextBadge.requiredListings) * 100),
      reviews: nextBadge.requiredReviews === 0 ? 100 : Math.min(100, (stats.reviewsCount / nextBadge.requiredReviews) * 100),
      rating: nextBadge.requiredRating === 0 ? 100 : Math.min(100, (stats.averageRating / nextBadge.requiredRating) * 100),
    };
  };

  const currentBadge = getCurrentBadge();
  const nextBadge = getNextBadge();
  const progress = getProgressToNextBadge();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-32">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary via-primary to-primary/80 text-primary-foreground pt-[var(--app-sat)]">
        <div className="flex items-center gap-4 px-4 py-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Badges vendeur</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Current Badge Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-6 text-center"
        >
          {currentBadge ? (
            <>
              <div className={`w-24 h-24 mx-auto rounded-full ${currentBadge.bgColor} ${currentBadge.borderColor} border-4 flex items-center justify-center mb-4`}>
                <currentBadge.icon className={`w-12 h-12 ${currentBadge.color}`} />
              </div>
              <h2 className="text-2xl font-bold mb-1">Badge {currentBadge.name}</h2>
              <p className="text-muted-foreground">{currentBadge.description}</p>
            </>
          ) : (
            <>
              <div className="w-24 h-24 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                <Award className="w-12 h-12 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold mb-1">Aucun badge</h2>
              <p className="text-muted-foreground">Publiez votre première annonce pour obtenir un badge</p>
            </>
          )}
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-xl p-4 text-center">
            <Home className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{stats.listingsCount}</p>
            <p className="text-xs text-muted-foreground">Annonces</p>
          </div>
          <div className="bg-card rounded-xl p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{stats.reviewsCount}</p>
            <p className="text-xs text-muted-foreground">Avis reçus</p>
          </div>
          <div className="bg-card rounded-xl p-4 text-center">
            <Star className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{stats.averageRating || '-'}</p>
            <p className="text-xs text-muted-foreground">Note moyenne</p>
          </div>
        </div>

        {/* Progress to Next Badge */}
        {nextBadge && (
          <div className="bg-card rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-full ${nextBadge.bgColor} ${nextBadge.borderColor} border-2 flex items-center justify-center`}>
                <nextBadge.icon className={`w-6 h-6 ${nextBadge.color}`} />
              </div>
              <div>
                <h3 className="font-semibold">Prochain : Badge {nextBadge.name}</h3>
                <p className="text-sm text-muted-foreground">{nextBadge.description}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Annonces</span>
                  <span className="font-medium">{stats.listingsCount}/{nextBadge.requiredListings}</span>
                </div>
                <Progress value={progress.listings} className="h-2" />
              </div>
              
              {nextBadge.requiredReviews > 0 && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Avis reçus</span>
                    <span className="font-medium">{stats.reviewsCount}/{nextBadge.requiredReviews}</span>
                  </div>
                  <Progress value={progress.reviews} className="h-2" />
                </div>
              )}
              
              {nextBadge.requiredRating > 0 && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Note moyenne</span>
                    <span className="font-medium">{stats.averageRating}/{nextBadge.requiredRating}</span>
                  </div>
                  <Progress value={progress.rating} className="h-2" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* All Badges */}
        <div>
          <h3 className="font-semibold mb-4 px-1">Tous les badges</h3>
          <div className="space-y-3">
            {badges.map((badge, index) => {
              const unlocked = isBadgeUnlocked(badge);
              const isCurrentBadge = currentBadge?.id === badge.id;
              
              return (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`bg-card rounded-xl p-4 flex items-center gap-4 ${
                    isCurrentBadge ? 'ring-2 ring-primary ring-offset-2' : ''
                  } ${!unlocked ? 'opacity-60' : ''}`}
                >
                  <div className={`w-14 h-14 rounded-full ${badge.bgColor} ${badge.borderColor} border-2 flex items-center justify-center relative`}>
                    <badge.icon className={`w-7 h-7 ${badge.color}`} />
                    {unlocked && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                    )}
                    {!unlocked && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-muted rounded-full flex items-center justify-center">
                        <Lock className="w-3 h-3 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{badge.name}</h4>
                      {isCurrentBadge && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          Actuel
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{badge.description}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-xs bg-muted px-2 py-1 rounded-full flex items-center gap-1">
                        <Home className="w-3 h-3" />
                        {badge.requiredListings} annonces
                      </span>
                      {badge.requiredReviews > 0 && (
                        <span className="text-xs bg-muted px-2 py-1 rounded-full flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {badge.requiredReviews} avis
                        </span>
                      )}
                      {badge.requiredRating > 0 && (
                        <span className="text-xs bg-muted px-2 py-1 rounded-full flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          {badge.requiredRating}+ note
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Info */}
        <div className="bg-primary/5 rounded-2xl p-4">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Comment ça marche ?
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Les badges vendeur récompensent votre activité sur LaZone. Plus vous publiez d'annonces 
            et recevez de bons avis, plus votre badge est prestigieux. Les badges sont affichés sur 
            votre profil et donnent confiance aux acheteurs potentiels.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VendorBadgesPage;
