import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { getSoundInstance } from './useSound';
import { isNativePlatform } from './useNativePlugins';

interface Notification {
  id: string;
  user_id: string;
  type: 'follow' | 'review' | 'message' | 'reservation_approved' | 'reservation_rejected' | 'appointment_approved' | 'appointment_rejected';
  actor_id: string;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
  actor?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

// Track if we've already logged the notification warning
let hasLoggedNotificationWarning = false;

// Check if browser notifications are supported (only relevant for web)
const isBrowserNotificationSupported = (): boolean => {
  // On native platforms, we use Capacitor Push Notifications instead
  if (isNativePlatform()) {
    return false;
  }
  return typeof window !== 'undefined' && 'Notification' in window;
};

// Request browser notification permission (web only)
const requestNotificationPermission = async (): Promise<boolean> => {
  // On native platforms, permissions are handled by Capacitor
  if (isNativePlatform()) {
    if (!hasLoggedNotificationWarning) {
      console.log('Using native push notifications via Capacitor');
      hasLoggedNotificationWarning = true;
    }
    return true; // Native notifications are handled separately
  }

  if (!isBrowserNotificationSupported()) {
    if (!hasLoggedNotificationWarning) {
      console.log('Browser notifications not supported');
      hasLoggedNotificationWarning = true;
    }
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

// Show browser notification (web only)
const showBrowserNotification = (title: string, body: string, icon?: string) => {
  // Skip on native platforms - they use Capacitor push notifications
  if (isNativePlatform()) {
    return;
  }
  
  if (isBrowserNotificationSupported() && Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body,
      icon: icon || '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'lazone-notification'
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto close after 5 seconds
    setTimeout(() => notification.close(), 5000);
  }
};

// Send native push notification via edge function
export const sendPushNotification = async (
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> => {
  try {
    const { data: res, error } = await supabase.functions.invoke('send-push-notification', {
      body: { userId, title, body, data },
    });

    if (error) {
      console.error('Error sending push notification:', error);
      return false;
    }

    // Edge function returns { sent: 0|1, ... }
    if (res && typeof res === 'object' && 'sent' in (res as any)) {
      const sent = Boolean((res as any).sent);
      if (!sent) {
        console.warn('Push notification not sent:', res);
      }
      return sent;
    }

    // Backward-compatible fallback
    return true;
  } catch (error) {
    console.error('Failed to send push notification:', error);
    return false;
  }
};

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const permissionCheckedRef = useRef(false);

  // Request permission on mount - only once
  useEffect(() => {
    if (!permissionCheckedRef.current) {
      permissionCheckedRef.current = true;
      requestNotificationPermission().then(setPermissionGranted);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch actor profiles
      const actorIds = [...new Set((data || []).map(n => n.actor_id))];
      
      if (actorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', actorIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        const notificationsWithActors: Notification[] = (data || []).map(n => ({
          ...n,
          type: n.type as 'follow' | 'review' | 'message',
          actor: profileMap.get(n.actor_id) || undefined
        }));

        setNotifications(notificationsWithActors);
        setUnreadCount(notificationsWithActors.filter(n => !n.is_read).length);
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      
      // Subscribe to new notifications in realtime
      const channel = supabase
        .channel('notifications-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          async (payload) => {
            console.log('New notification received:', payload);
            const newNotification = payload.new as Notification;
            
            // Fetch actor profile for the new notification
            const { data: actorProfile } = await supabase
              .from('profiles')
              .select('user_id, full_name, avatar_url')
              .eq('user_id', newNotification.actor_id)
              .maybeSingle();

            const enrichedNotification: Notification = {
              ...newNotification,
              type: newNotification.type as 'follow' | 'review' | 'message',
              actor: actorProfile || undefined
            };

            // Update state immediately
            setNotifications(prev => [enrichedNotification, ...prev]);
            setUnreadCount(prev => prev + 1);

            // Play notification sound
            try {
              const sound = getSoundInstance();
              sound.playNotificationSound();
            } catch (error) {
              console.log('Could not play notification sound');
            }

            // Show browser notification if permission granted
            if (permissionGranted) {
              const actorName = actorProfile?.full_name || 'Quelqu\'un';
              let title = 'LaZone';
              let body = 'Nouvelle notification';

              switch (newNotification.type) {
                case 'follow':
                  title = 'Nouveau follower';
                  body = `${actorName} a commencé à vous suivre`;
                  break;
                case 'review':
                  title = 'Nouvel avis';
                  body = `${actorName} vous a laissé un avis`;
                  break;
                case 'message':
                  title = 'Nouveau message';
                  body = `${actorName} vous a envoyé un message`;
                  break;
              }

              showBrowserNotification(title, body, actorProfile?.avatar_url || undefined);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const updated = payload.new as Notification;
            setNotifications(prev => 
              prev.map(n => n.id === updated.id ? { ...n, ...updated } : n)
            );
            // Recalculate unread count
            setNotifications(prev => {
              setUnreadCount(prev.filter(n => !n.is_read).length);
              return prev;
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, fetchNotifications, permissionGranted]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const requestPermission = async () => {
    const granted = await requestNotificationPermission();
    setPermissionGranted(granted);
    return granted;
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
    permissionGranted,
    requestPermission
  };
};