import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, UserPlus, Star, MessageCircle, Loader2, CalendarCheck, CalendarX, Calendar, Home, AlertTriangle, Award, Mail, Megaphone } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNotifications } from '@/hooks/useNotifications';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NotificationDropdownProps {
  variant?: 'default' | 'hero';
}

export const NotificationDropdown = ({ variant = 'default' }: NotificationDropdownProps) => {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return <UserPlus className="w-4 h-4 text-primary" />;
      case 'review':
        return <Star className="w-4 h-4 text-yellow-500" />;
      case 'message':
        return <MessageCircle className="w-4 h-4 text-green-500" />;
      // Réservations (mode résidence)
      case 'reservation_request':
        return <Calendar className="w-4 h-4 text-blue-500" />;
      case 'reservation_approved':
        return <CalendarCheck className="w-4 h-4 text-green-500" />;
      case 'reservation_rejected':
        return <CalendarX className="w-4 h-4 text-destructive" />;
      // Rendez-vous (mode immobilier)
      case 'appointment_request':
        return <Calendar className="w-4 h-4 text-blue-500" />;
      case 'appointment_approved':
        return <CalendarCheck className="w-4 h-4 text-green-500" />;
      case 'appointment_rejected':
        return <CalendarX className="w-4 h-4 text-destructive" />;
      // Propriétés
      case 'property':
        return <Home className="w-4 h-4 text-primary" />;
      case 'delete_listing':
        return <AlertTriangle className="w-4 h-4 text-destructive" />;
      // Badges
      case 'badge':
        return <Award className="w-4 h-4 text-yellow-500" />;
      // Email verification
      case 'verify_email':
        return <Mail className="w-4 h-4 text-blue-500" />;
      // Promotions
      case 'promotion':
        return <Megaphone className="w-4 h-4 text-primary" />;
      // Reports (admin)
      case 'user_report':
      case 'property_report':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default:
        return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getNotificationMessage = (type: string, actorName: string | null) => {
    const name = actorName || 'Quelqu\'un';
    switch (type) {
      case 'follow':
        return `${name} a commencé à vous suivre`;
      case 'review':
        return `${name} vous a laissé un avis`;
      case 'message':
        return `${name} vous a envoyé un message`;
      // Réservations (mode résidence)
      case 'reservation_request':
        return `${name} a demandé une réservation`;
      case 'reservation_approved':
        return `${name} a confirmé votre réservation ! 🎉`;
      case 'reservation_rejected':
        return `${name} a refusé votre demande de réservation`;
      // Rendez-vous (mode immobilier)
      case 'appointment_request':
        return `${name} a demandé un rendez-vous de visite`;
      case 'appointment_approved':
        return `${name} a accepté votre demande de visite`;
      case 'appointment_rejected':
        return `${name} a refusé votre demande de visite`;
      // Propriétés
      case 'property':
        return `Nouvelle annonce de ${name}`;
      case 'delete_listing':
        return `Votre annonce a été supprimée`;
      // Badges
      case 'badge':
        return `Félicitations ! Vous avez obtenu un nouveau badge 🏆`;
      // Email verification
      case 'verify_email':
        return `N'oubliez pas de vérifier votre adresse email`;
      // Promotions
      case 'promotion':
        return `Nouvelle promotion disponible !`;
      // Reports (admin)
      case 'user_report':
        return `Nouveau signalement d'utilisateur`;
      case 'property_report':
        return `Nouveau signalement d'annonce`;
      default:
        return 'Nouvelle notification';
    }
  };

  const handleNotificationClick = async (notification: any) => {
    // Mark as read
    await markAsRead(notification.id);
    setOpen(false);

    // Navigate based on notification type
    switch (notification.type) {
      // Social
      case 'follow':
        navigate(`/user/${notification.actor_id}`);
        break;
      case 'review':
        navigate('/profile');
        break;
      // Messages
      case 'message':
        navigate('/messages', { state: { recipientId: notification.actor_id } });
        break;
      // Réservations & Rendez-vous
      case 'reservation_request':
      case 'reservation_approved':
      case 'reservation_rejected':
      case 'appointment_request':
      case 'appointment_approved':
      case 'appointment_rejected':
        navigate('/dashboard');
        break;
      // Propriétés
      case 'property':
        if (notification.entity_id) {
          navigate(`/property/${notification.entity_id}`);
        } else {
          navigate('/');
        }
        break;
      case 'delete_listing':
        navigate('/my-listings');
        break;
      // Badges
      case 'badge':
        navigate('/profile');
        break;
      // Email verification
      case 'verify_email':
        navigate('/settings/edit-profile');
        break;
      // Promotions
      case 'promotion':
        navigate('/');
        break;
      // Reports (admin)
      case 'user_report':
      case 'property_report':
        navigate('/admin');
        break;
      default:
        navigate('/notifications');
    }
  };

  const isHero = variant === 'hero';

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button 
          className={`relative w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform ${
            isHero 
              ? 'bg-white/20 backdrop-blur-sm' 
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          <Bell className={`w-5 h-5 ${isHero ? 'text-white' : 'text-foreground'}`} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 bg-primary rounded-full flex items-center justify-center text-xs text-primary-foreground font-bold px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-80 bg-card border border-border shadow-lg z-50"
        sideOffset={8}
      >
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={(e) => {
                e.preventDefault();
                markAllAsRead();
              }}
            >
              Tout marquer lu
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucune notification</p>
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            {notifications.slice(0, 10).map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex items-start gap-3 p-3 cursor-pointer focus:bg-muted ${
                  !notification.is_read ? 'bg-primary/5' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {notification.actor?.avatar_url ? (
                    <img
                      src={notification.actor.avatar_url}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop';
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      {getNotificationIcon(notification.type)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!notification.is_read ? 'font-medium' : ''}`}>
                    {getNotificationMessage(notification.type, notification.actor?.full_name || null)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: fr })}
                  </p>
                </div>
                {!notification.is_read && (
                  <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                )}
              </DropdownMenuItem>
            ))}
            {notifications.length > 10 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-center text-primary text-sm py-2"
                  onClick={() => {
                    setOpen(false);
                    navigate('/notifications');
                  }}
                >
                  Voir toutes les notifications
                </DropdownMenuItem>
              </>
            )}
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};