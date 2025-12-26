import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Home, 
  Heart, 
  MessageCircle, 
  Calendar, 
  Eye,
  TrendingUp,
  Users,
  Star,
  Building2,
  Loader2,
  ChevronRight,
  Clock,
  MapPin,
  Ban,
  UserX
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format, isToday, isTomorrow, addDays, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { useProperties } from '@/hooks/useProperties';
import { useFavorites } from '@/hooks/useFavorites';
import { useMessages } from '@/hooks/useMessages';
import { useAppMode } from '@/hooks/useAppMode';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface DashboardStats {
  totalProperties: number;
  activeProperties: number;
  totalFavorites: number;
  totalMessages: number;
  unreadMessages: number;
  totalAppointments: number;
  pendingAppointments: number;
  totalViews: number;
  averageRating: number;
  totalReviews: number;
  followers: number;
  following: number;
}

interface Appointment {
  id: string;
  requested_date: string;
  requested_time: string;
  status: string;
  property: {
    id: string;
    title: string;
    city: string;
  } | null;
  requester: {
    full_name: string;
    avatar_url: string;
  } | null;
}

interface PropertyRanking {
  id: string;
  title: string;
  city: string;
  price: number;
  image: string;
  favoriteCount: number;
}

interface BlockedUser {
  id: string;
  blocked_user_id: string;
  created_at: string;
  profile: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

const DashboardPage = () => {
  const { user, profile } = useAuth();
  const { properties } = useProperties();
  const { favorites } = useFavorites();
  const { conversations, totalUnread } = useMessages();
  const { appMode, isResidence } = useAppMode();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [propertyRankings, setPropertyRankings] = useState<PropertyRanking[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);

  // Get unread conversations
  const unreadConversations = conversations.filter(c => c.unreadCount > 0);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const fetchStats = async () => {
      setLoading(true);
      try {
        // Get user's properties (already filtered for active in useProperties)
        const userProperties = properties.filter(p => p.userId === user.id);

        // Get appointments
        const { data: appointments } = await supabase
          .from('appointments')
          .select('id, status')
          .or(`owner_id.eq.${user.id},requester_id.eq.${user.id}`);

        const pendingAppointments = appointments?.filter(a => a.status === 'pending').length || 0;

        // Get upcoming appointments (next 7 days)
        const today = new Date();
        const nextWeek = addDays(today, 7);
        
        const { data: upcomingData } = await supabase
          .from('appointments')
          .select(`
            id,
            requested_date,
            requested_time,
            status,
            property_id,
            requester_id
          `)
          .or(`owner_id.eq.${user.id},requester_id.eq.${user.id}`)
          .gte('requested_date', format(today, 'yyyy-MM-dd'))
          .lte('requested_date', format(nextWeek, 'yyyy-MM-dd'))
          .in('status', ['pending', 'approved'])
          .order('requested_date', { ascending: true })
          .limit(5);

        // Fetch property and requester details for appointments
        if (upcomingData && upcomingData.length > 0) {
          const appointmentsWithDetails = await Promise.all(
            upcomingData.map(async (apt) => {
              const { data: propertyData } = await supabase
                .from('properties')
                .select('id, title, city')
                .eq('id', apt.property_id)
                .maybeSingle();

              const { data: requesterData } = await supabase
                .from('profiles')
                .select('full_name, avatar_url')
                .eq('user_id', apt.requester_id)
                .maybeSingle();

              return {
                ...apt,
                property: propertyData,
                requester: requesterData
              };
            })
          );
          setUpcomingAppointments(appointmentsWithDetails);
        }

        // Get property rankings by favorites count
        if (userProperties.length > 0) {
          const propertyIds = userProperties.map(p => p.id);
          
          const rankings: PropertyRanking[] = await Promise.all(
            userProperties.slice(0, 5).map(async (prop) => {
              const { count } = await supabase
                .from('favorites')
                .select('*', { count: 'exact', head: true })
                .eq('property_id', prop.id);

              return {
                id: prop.id,
                title: prop.title,
                city: prop.city,
                price: prop.price,
                image: prop.images[0] || '',
                favoriteCount: count || 0
              };
            })
          );

          // Sort by favorite count
          rankings.sort((a, b) => b.favoriteCount - a.favoriteCount);
          setPropertyRankings(rankings);
        }

        // Get reviews
        const { data: reviews } = await supabase
          .from('user_reviews')
          .select('rating')
          .eq('reviewed_user_id', user.id);

        const averageRating = reviews && reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0;

        // Get followers/following
        const { count: followersCount } = await supabase
          .from('user_follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', user.id);

        const { count: followingCount } = await supabase
          .from('user_follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', user.id);

        // Get messages count
        const { count: messagesCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

        setStats({
          totalProperties: userProperties.length,
          activeProperties: userProperties.length,
          totalFavorites: favorites.length,
          totalMessages: messagesCount || 0,
          unreadMessages: totalUnread,
          totalAppointments: appointments?.length || 0,
          pendingAppointments,
          totalViews: 0,
          averageRating,
          totalReviews: reviews?.length || 0,
          followers: followersCount || 0,
          following: followingCount || 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, properties, favorites, totalUnread, navigate]);

  // Fetch blocked users
  useEffect(() => {
    const fetchBlockedUsers = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('blocked_users')
        .select('id, blocked_user_id, created_at')
        .eq('user_id', user.id);
      
      if (data && data.length > 0) {
        // Fetch profiles for blocked users
        const blockedUserIds = data.map(b => b.blocked_user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', blockedUserIds);
        
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        
        const blockedWithProfiles: BlockedUser[] = data.map(b => ({
          ...b,
          profile: profileMap.get(b.blocked_user_id) || null
        }));
        
        setBlockedUsers(blockedWithProfiles);
      } else {
        setBlockedUsers([]);
      }
    };
    
    fetchBlockedUsers();
  }, [user]);

  const handleUnblockUser = async (blockedUserId: string, userName: string | null) => {
    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('user_id', user?.id)
        .eq('blocked_user_id', blockedUserId);
      
      if (error) throw error;
      
      setBlockedUsers(prev => prev.filter(b => b.blocked_user_id !== blockedUserId));
      toast({
        title: 'Utilisateur débloqué',
        description: `${userName || 'L\'utilisateur'} a été débloqué`,
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de débloquer l\'utilisateur',
        variant: 'destructive'
      });
    }
  };

  const formatAppointmentDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Aujourd'hui";
    if (isTomorrow(date)) return "Demain";
    return format(date, 'EEE d MMM', { locale: fr });
  };

  if (!user) return null;

  const statCards = [
    {
      icon: Building2,
      label: 'Mes annonces',
      value: stats?.totalProperties || 0,
      subValue: `${stats?.activeProperties || 0} actives`,
      color: 'bg-blue-500',
      link: '/my-listings'
    },
    {
      icon: Heart,
      label: 'Favoris',
      value: stats?.totalFavorites || 0,
      subValue: isResidence ? 'séjours sauvegardés' : 'propriétés sauvegardées',
      color: 'bg-red-500',
      link: '/profile'
    },
    {
      icon: MessageCircle,
      label: 'Messages',
      value: stats?.totalMessages || 0,
      subValue: `${stats?.unreadMessages || 0} non lus`,
      color: 'bg-green-500',
      link: '/messages'
    },
    {
      icon: Calendar,
      label: 'Rendez-vous',
      value: stats?.totalAppointments || 0,
      subValue: `${stats?.pendingAppointments || 0} en attente`,
      color: 'bg-orange-500',
      link: '/profile'
    },
    {
      icon: Star,
      label: 'Note moyenne',
      value: stats?.averageRating.toFixed(1) || '0.0',
      subValue: `${stats?.totalReviews || 0} avis`,
      color: 'bg-yellow-500',
      link: '/profile'
    },
    {
      icon: Users,
      label: 'Communauté',
      value: stats?.followers || 0,
      subValue: `${stats?.following || 0} abonnements`,
      color: 'bg-purple-500',
      link: '/followers'
    },
  ];

  return (
    <div className="min-h-screen pb-32 bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-4 px-4 py-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">
            Tableau de bord {isResidence ? 'Residence' : 'LaZone'}
          </h1>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        {/* Welcome Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <Home className="w-8 h-8 text-primary" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold">
                Bonjour, {profile?.full_name?.split(' ')[0] || 'Utilisateur'}!
              </h2>
              <p className="text-muted-foreground text-sm">
                Voici un aperçu de votre activité
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              {statCards.map((card, index) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link 
                    to={card.link}
                    className="glass-card p-4 block hover:shadow-lg transition-all"
                  >
                    <div className={`w-10 h-10 rounded-full ${card.color} flex items-center justify-center mb-3`}>
                      <card.icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-2xl font-bold">{card.value}</p>
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{card.subValue}</p>
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Unread Conversations */}
            {unreadConversations.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-primary" />
                    Messages non lus
                  </h3>
                  <Link to="/messages" className="text-sm text-primary flex items-center gap-1">
                    Voir tout <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="space-y-2">
                  {unreadConversations.slice(0, 3).map((conv) => (
                    <Link
                      key={conv.id}
                      to={`/messages?user=${conv.participantId}&property=${conv.propertyId}`}
                      className="glass-card p-3 flex items-center gap-3 hover:bg-primary/5 transition-colors"
                    >
                      <div className="relative">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={conv.participantAvatar || ''} />
                          <AvatarFallback>{conv.participantName?.charAt(0) || '?'}</AvatarFallback>
                        </Avatar>
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                          {conv.unreadCount}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{conv.participantName}</p>
                        <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Upcoming Appointments Calendar */}
            {upcomingAppointments.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Rendez-vous à venir
                  </h3>
                  <Link to="/profile" className="text-sm text-primary flex items-center gap-1">
                    Voir tout <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="space-y-2">
                  {upcomingAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="glass-card p-3 flex items-center gap-3"
                    >
                      <div className="w-14 h-14 rounded-lg bg-primary/10 flex flex-col items-center justify-center">
                        <span className="text-xs text-muted-foreground">
                          {formatAppointmentDate(apt.requested_date)}
                        </span>
                        <span className="text-lg font-bold text-primary">
                          {apt.requested_time.slice(0, 5)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{apt.property?.title || 'Propriété'}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {apt.property?.city}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          avec {apt.requester?.full_name || 'Utilisateur'}
                        </p>
                      </div>
                      <Badge variant={apt.status === 'approved' ? 'default' : 'secondary'}>
                        {apt.status === 'approved' ? 'Confirmé' : 'En attente'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Property Rankings */}
            {propertyRankings.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Classement de vos annonces
                  </h3>
                  <Link to="/my-listings" className="text-sm text-primary flex items-center gap-1">
                    Voir tout <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="space-y-2">
                  {propertyRankings.map((prop, index) => (
                    <Link
                      key={prop.id}
                      to={`/property/${prop.id}`}
                      className="glass-card p-3 flex items-center gap-3 hover:bg-primary/5 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                        {index + 1}
                      </div>
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted">
                        {prop.image ? (
                          <img src={prop.image} alt={prop.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{prop.title}</p>
                        <p className="text-sm text-muted-foreground">{prop.city}</p>
                      </div>
                      <div className="flex items-center gap-1 text-red-500">
                        <Heart className="w-4 h-4 fill-current" />
                        <span className="font-medium">{prop.favoriteCount}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Blocked Users */}
            {blockedUsers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Ban className="w-5 h-5 text-destructive" />
                    Utilisateurs bloqués ({blockedUsers.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {blockedUsers.map((blocked) => (
                    <div
                      key={blocked.id}
                      className="glass-card p-3 flex items-center gap-3"
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={blocked.profile?.avatar_url || ''} />
                        <AvatarFallback>
                          <UserX className="w-5 h-5 text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {blocked.profile?.full_name || 'Utilisateur'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Bloqué le {format(new Date(blocked.created_at), 'd MMM yyyy', { locale: fr })}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnblockUser(blocked.blocked_user_id, blocked.profile?.full_name || null)}
                        className="text-xs"
                      >
                        Débloquer
                      </Button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* Quick Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h3 className="font-semibold mb-4">Actions rapides</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link 
              to="/publish"
              className="glass-card p-4 flex items-center gap-3 hover:bg-primary/5 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium text-sm">Publier une annonce</span>
            </Link>
            <Link 
              to="/messages"
              className="glass-card p-4 flex items-center gap-3 hover:bg-primary/5 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium text-sm">Voir messages</span>
            </Link>
            <Link 
              to="/map"
              className="glass-card p-4 flex items-center gap-3 hover:bg-primary/5 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium text-sm">Explorer la carte</span>
            </Link>
            <Link 
              to="/settings/edit-profile"
              className="glass-card p-4 flex items-center gap-3 hover:bg-primary/5 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium text-sm">Modifier profil</span>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardPage;
