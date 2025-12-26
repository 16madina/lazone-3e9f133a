import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, Loader2, UserPlus, UserMinus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface UserFollow {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  isFollowing?: boolean;
}

const FollowersPage = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(
    (searchParams.get('tab') as 'followers' | 'following') || 'followers'
  );
  const [followers, setFollowers] = useState<UserFollow[]>([]);
  const [following, setFollowing] = useState<UserFollow[]>([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState<string | null>(null);

  const targetUserId = userId || user?.id;

  useEffect(() => {
    if (targetUserId) {
      fetchFollowData();
    }
  }, [targetUserId]);

  const fetchFollowData = async () => {
    if (!targetUserId) return;
    setLoading(true);

    try {
      // Fetch followers
      const { data: followersData } = await supabase
        .from('user_follows')
        .select('follower_id')
        .eq('following_id', targetUserId);

      const followerIds = (followersData || []).map(f => f.follower_id);

      // Fetch following
      const { data: followingData } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', targetUserId);

      const followingIds = (followingData || []).map(f => f.following_id);

      // Get unique user IDs
      const allUserIds = [...new Set([...followerIds, ...followingIds])];

      if (allUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', allUserIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        // Check which ones the current user follows
        let currentUserFollowing: string[] = [];
        if (user) {
          const { data: myFollowing } = await supabase
            .from('user_follows')
            .select('following_id')
            .eq('follower_id', user.id);
          currentUserFollowing = (myFollowing || []).map(f => f.following_id);
        }

        // Build followers list
        const followersList: UserFollow[] = followerIds.map(id => {
          const profile = profileMap.get(id);
          return {
            id,
            user_id: id,
            full_name: profile?.full_name || null,
            avatar_url: profile?.avatar_url || null,
            isFollowing: currentUserFollowing.includes(id)
          };
        });

        // Build following list
        const followingList: UserFollow[] = followingIds.map(id => {
          const profile = profileMap.get(id);
          return {
            id,
            user_id: id,
            full_name: profile?.full_name || null,
            avatar_url: profile?.avatar_url || null,
            isFollowing: currentUserFollowing.includes(id)
          };
        });

        setFollowers(followersList);
        setFollowing(followingList);
      } else {
        setFollowers([]);
        setFollowing([]);
      }
    } catch (error) {
      console.error('Error fetching follow data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFollow = async (targetId: string, currentlyFollowing: boolean) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    setFollowLoading(targetId);
    try {
      if (currentlyFollowing) {
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetId);

        if (error) throw error;
        toast({ title: 'Vous ne suivez plus cet utilisateur' });
      } else {
        const { error } = await supabase
          .from('user_follows')
          .insert({
            follower_id: user.id,
            following_id: targetId
          });

        if (error) throw error;
        toast({ title: 'Vous suivez maintenant cet utilisateur' });
      }

      // Update local state
      const updateList = (list: UserFollow[]) =>
        list.map(u => 
          u.user_id === targetId 
            ? { ...u, isFollowing: !currentlyFollowing } 
            : u
        );

      setFollowers(updateList);
      setFollowing(updateList);
    } catch (error: any) {
      console.error('Error toggling follow:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue',
        variant: 'destructive'
      });
    } finally {
      setFollowLoading(null);
    }
  };

  const currentList = activeTab === 'followers' ? followers : following;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
          <h1 className="font-display font-semibold text-lg">
            {targetUserId === user?.id ? 'Mes abonnements' : 'Abonnements'}
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-border">
          <button
            onClick={() => setActiveTab('followers')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'followers'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Followers ({followers.length})
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'following'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Suivis ({following.length})
          </button>
        </div>
      </div>

      {/* List */}
      <div className="p-4">
        {currentList.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">
              {activeTab === 'followers' ? 'Aucun follower' : 'Aucun suivi'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {activeTab === 'followers' 
                ? 'Personne ne vous suit encore' 
                : 'Vous ne suivez personne encore'}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {currentList.map((userFollow, index) => (
              <motion.div
                key={userFollow.user_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 p-3 bg-card rounded-xl"
              >
                <button
                  onClick={() => navigate(`/user/${userFollow.user_id}`)}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <img
                    src={userFollow.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop'}
                    alt={userFollow.full_name || 'Utilisateur'}
                    className="w-12 h-12 rounded-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop';
                    }}
                  />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium truncate">
                      {userFollow.full_name || 'Utilisateur'}
                    </p>
                  </div>
                </button>

                {user && user.id !== userFollow.user_id && (
                  <Button
                    size="sm"
                    variant={userFollow.isFollowing ? 'outline' : 'default'}
                    onClick={() => handleToggleFollow(userFollow.user_id, userFollow.isFollowing || false)}
                    disabled={followLoading === userFollow.user_id}
                    className={!userFollow.isFollowing ? 'gradient-primary' : ''}
                  >
                    {followLoading === userFollow.user_id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : userFollow.isFollowing ? (
                      <>
                        <UserMinus className="w-4 h-4 mr-1" />
                        Suivi
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-1" />
                        Suivre
                      </>
                    )}
                  </Button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FollowersPage;