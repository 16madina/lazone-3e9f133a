import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Bell, UserPlus, Star, MessageCircle, 
  Check, Loader2, CalendarCheck, CalendarX 
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { notifications, loading, markAsRead, markAllAsRead, unreadCount } = useNotifications();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return <UserPlus className="w-5 h-5 text-primary" />;
      case 'review':
        return <Star className="w-5 h-5 text-amber-500" />;
      case 'message':
        return <MessageCircle className="w-5 h-5 text-green-500" />;
      case 'reservation_approved':
      case 'appointment_approved':
        return <CalendarCheck className="w-5 h-5 text-green-500" />;
      case 'reservation_rejected':
      case 'appointment_rejected':
        return <CalendarX className="w-5 h-5 text-destructive" />;
      default:
        return <Bell className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getNotificationMessage = (type: string, actorName: string | null) => {
    const name = actorName || 'Un utilisateur';
    switch (type) {
      case 'follow':
        return `${name} a commencé à vous suivre`;
      case 'review':
        return `${name} vous a laissé un avis`;
      case 'message':
        return `${name} vous a envoyé un message`;
      case 'reservation_approved':
        return `${name} a confirmé votre réservation ! 🎉`;
      case 'reservation_rejected':
        return `${name} a refusé votre demande de réservation`;
      case 'appointment_approved':
        return `${name} a accepté votre demande de visite`;
      case 'appointment_rejected':
        return `${name} a refusé votre demande de visite`;
      default:
        return 'Nouvelle notification';
    }
  };

  const handleNotificationClick = async (notification: any) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    // Navigate based on type
    if (notification.type === 'follow' || notification.type === 'review') {
      navigate(`/user/${notification.actor_id}`);
    } else if (notification.type === 'message') {
      navigate('/messages');
    } else if (notification.type.includes('reservation') || notification.type.includes('appointment')) {
      // Always navigate to dashboard for reservation/appointment notifications
      // entity_id contains the appointment ID, not property ID
      navigate('/dashboard');
    }
  };

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
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display font-semibold text-lg">Notifications</h1>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-primary"
            >
              <Check className="w-4 h-4 mr-1" />
              Tout lire
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="p-4">
        {notifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Bell className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Aucune notification</h3>
            <p className="text-sm text-muted-foreground">
              Vous recevrez des notifications quand quelqu'un vous suit ou laisse un avis
            </p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification, index) => (
              <motion.button
                key={notification.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleNotificationClick(notification)}
                className={`w-full flex items-start gap-3 p-4 rounded-xl transition-colors text-left ${
                  notification.is_read 
                    ? 'bg-card hover:bg-muted/50' 
                    : 'bg-primary/5 hover:bg-primary/10'
                }`}
              >
                {/* Avatar */}
                <div className="relative">
                  <img
                    src={notification.actor?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop'}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop';
                    }}
                  />
                  <div className="absolute -bottom-1 -right-1 p-1 bg-background rounded-full">
                    {getNotificationIcon(notification.type)}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!notification.is_read ? 'font-medium' : ''}`}>
                    {getNotificationMessage(notification.type, notification.actor?.full_name || null)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: fr })}
                  </p>
                </div>

                {/* Unread indicator */}
                {!notification.is_read && (
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                )}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;