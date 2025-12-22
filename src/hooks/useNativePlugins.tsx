import { useState, useEffect, useCallback, useRef } from 'react';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { PushNotifications, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { Share, ShareResult } from '@capacitor/share';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Geolocation, Position } from '@capacitor/geolocation';
import { Device, DeviceInfo, BatteryInfo } from '@capacitor/device';
import { Capacitor } from '@capacitor/core';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Check if we're running on a native platform
export const isNativePlatform = () => Capacitor.isNativePlatform();
export const getPlatform = () => Capacitor.getPlatform();

// ==================== CAMERA HOOK ====================
export const useCamera = () => {
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(false);

  const takePicture = useCallback(async () => {
    if (!isNativePlatform()) {
      // Fallback for web - use file input
      return null;
    }

    setLoading(true);
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        saveToGallery: false,
        correctOrientation: true
      });
      setPhoto(image);
      return image;
    } catch (error: any) {
      console.error('Camera error:', error);
      if (error.message !== 'User cancelled photos app') {
        toast({
          title: 'Erreur caméra',
          description: 'Impossible d\'accéder à la caméra',
          variant: 'destructive'
        });
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const pickFromGallery = useCallback(async () => {
    if (!isNativePlatform()) {
      return null;
    }

    setLoading(true);
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
        correctOrientation: true
      });
      setPhoto(image);
      return image;
    } catch (error: any) {
      console.error('Gallery error:', error);
      if (error.message !== 'User cancelled photos app') {
        toast({
          title: 'Erreur galerie',
          description: 'Impossible d\'accéder à la galerie',
          variant: 'destructive'
        });
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const pickMultiple = useCallback(async (limit: number = 10) => {
    if (!isNativePlatform()) {
      return [];
    }

    setLoading(true);
    try {
      const result = await Camera.pickImages({
        quality: 90,
        limit,
        correctOrientation: true
      });
      return result.photos;
    } catch (error: any) {
      console.error('Pick images error:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const checkPermissions = useCallback(async () => {
    if (!isNativePlatform()) return { camera: 'granted', photos: 'granted' };
    
    try {
      const permissions = await Camera.checkPermissions();
      return permissions;
    } catch {
      return { camera: 'denied', photos: 'denied' };
    }
  }, []);

  const requestPermissions = useCallback(async () => {
    if (!isNativePlatform()) return { camera: 'granted', photos: 'granted' };
    
    try {
      const permissions = await Camera.requestPermissions();
      return permissions;
    } catch {
      return { camera: 'denied', photos: 'denied' };
    }
  }, []);

  return {
    photo,
    loading,
    takePicture,
    pickFromGallery,
    pickMultiple,
    checkPermissions,
    requestPermissions,
    isNative: isNativePlatform()
  };
};

// ==================== PUSH NOTIFICATIONS HOOK ====================
export const usePushNotifications = () => {
  // All hooks must be called unconditionally and in the same order
  const userIdRef = useRef<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user (must be first effect)
  useEffect(() => {
    let mounted = true;
    
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      const uid = data.user?.id || null;
      userIdRef.current = uid;
      setUserId(uid);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const uid = session?.user?.id || null;
      userIdRef.current = uid;
      setUserId(uid);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Save push token directly to profiles table (like AYOKA)
  const saveTokenToDatabase = useCallback(async (pushToken: string) => {
    // NOTE: registration can happen before our auth listener updates `userId`.
    // Always fetch the current user as a fallback so we don't lose the token.
    let uid = userIdRef.current;

    if (!uid) {
      const { data } = await supabase.auth.getUser();
      uid = data.user?.id ?? null;
    }

    if (!uid) {
      console.log('[push] No user logged in, cannot save token');
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ push_token: pushToken })
        .eq('user_id', uid);

      if (error) throw error;
      console.log('[push] token saved to profiles.push_token');
    } catch (error) {
      console.error('[push] Error saving token:', error);
    }
  }, []);

  // Remove token from database (set push_token to null)
  const removeTokenFromDatabase = useCallback(async (_pushToken: string) => {
    let uid = userIdRef.current;

    if (!uid) {
      const { data } = await supabase.auth.getUser();
      uid = data.user?.id ?? null;
    }

    if (!uid) {
      console.log('[push] No user logged in, cannot remove token');
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ push_token: null })
        .eq('user_id', uid);

      if (error) throw error;
      console.log('[push] token removed from profiles');
    } catch (error) {
      console.error('[push] Error removing token:', error);
    }
  }, []);

  const register = useCallback(async () => {
    if (!isNativePlatform()) {
      console.log('[push] Push notifications only available on native platforms');
      return null;
    }

    try {
      // Use Firebase Messaging for proper FCM token on iOS
      const platform = getPlatform();
      console.log('[push] Registering on platform:', platform);

      // Request permissions via Firebase Messaging
      const permResult = await FirebaseMessaging.requestPermissions();
      console.log('[push] Permission result:', permResult);

      if (permResult.receive !== 'granted') {
        toast({
          title: 'Notifications désactivées',
          description: 'Activez les notifications dans les paramètres',
          variant: 'destructive',
        });
        return null;
      }

      // Get FCM token (this returns a proper FCM token, not raw APNs)
      const { token: fcmToken } = await FirebaseMessaging.getToken();
      console.log('[push] FCM token received:', fcmToken);

      if (fcmToken) {
        setToken(fcmToken);
        setIsRegistered(true);
        await saveTokenToDatabase(fcmToken);
        return fcmToken;
      }

      return null;
    } catch (error) {
      console.error('[push] registration error:', error);
      return null;
    }
  }, [saveTokenToDatabase]);

  // Attach listeners once (avoid add/remove loops that can miss the token)
  useEffect(() => {
    if (!isNativePlatform()) return;

    console.log('[push] setting up Firebase Messaging listeners');

    // Listen for token refresh
    const tokenListener = FirebaseMessaging.addListener('tokenReceived', async (event) => {
      console.log('[push] tokenReceived event:', event.token);
      setToken(event.token);
      setIsRegistered(true);
      await saveTokenToDatabase(event.token);
    });

    // Listen for foreground notifications
    const notificationListener = FirebaseMessaging.addListener(
      'notificationReceived',
      (notification) => {
        console.log('[push] notification received:', notification);
        toast({
          title: notification.notification?.title || 'Notification',
          description: notification.notification?.body || '',
        });
      }
    );

    // Listen for notification taps (background/killed state)
    const actionListener = FirebaseMessaging.addListener(
      'notificationActionPerformed',
      (event) => {
        console.log('[push] notification action:', event);
        const data = event.notification?.data as Record<string, string> | undefined;
        if (data?.route) {
          window.location.href = data.route;
        } else if (data?.type) {
          switch (data.type) {
            case 'message':
              window.location.href = '/messages';
              break;
            case 'follow':
              window.location.href = `/user/${data.actor_id}`;
              break;
            case 'review':
              window.location.href = '/profile';
              break;
            case 'property':
              if (data.property_id) {
                window.location.href = `/property/${data.property_id}`;
              }
              break;
            default:
              window.location.href = '/notifications';
          }
        }
      }
    );

    return () => {
      console.log('[push] removing Firebase Messaging listeners');
      tokenListener.then((l) => l.remove());
      notificationListener.then((l) => l.remove());
      actionListener.then((l) => l.remove());
    };
  }, [saveTokenToDatabase]);

  // Optional auto-register after login (keeps existing behavior)
  useEffect(() => {
    if (userId && isNativePlatform() && !isRegistered) {
      register();
    }
  }, [userId, isRegistered, register]);

  const unregister = useCallback(async () => {
    if (!isNativePlatform()) return;

    try {
      if (token) {
        await removeTokenFromDatabase(token);
      }
      await FirebaseMessaging.deleteToken();
      setIsRegistered(false);
      setToken(null);
    } catch (error) {
      console.error('[push] unregister error:', error);
    }
  }, [token, removeTokenFromDatabase]);

  return {
    token,
    isRegistered,
    register,
    unregister,
    isNative: isNativePlatform(),
  };
};

// ==================== SHARE HOOK ====================
export const useShare = () => {
  const [loading, setLoading] = useState(false);

  const share = useCallback(async (options: {
    title?: string;
    text?: string;
    url?: string;
    dialogTitle?: string;
  }): Promise<ShareResult | null> => {
    setLoading(true);
    try {
      // Check if share is available
      const canShare = await Share.canShare();
      
      if (!canShare.value) {
        // Fallback to clipboard
        if (options.url) {
          await navigator.clipboard.writeText(options.url);
          toast({
            title: 'Lien copié',
            description: 'Le lien a été copié dans le presse-papiers'
          });
        }
        return null;
      }

      const result = await Share.share({
        title: options.title || 'LaZone',
        text: options.text,
        url: options.url,
        dialogTitle: options.dialogTitle || 'Partager'
      });

      return result;
    } catch (error: any) {
      // User cancelled share
      if (error.message?.includes('cancelled') || error.message?.includes('canceled')) {
        return null;
      }
      console.error('Share error:', error);
      toast({
        title: 'Erreur de partage',
        description: 'Impossible de partager le contenu',
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const shareProperty = useCallback(async (property: {
    id: string;
    title: string;
    price: number;
    city: string;
  }) => {
    const url = `${window.location.origin}/property/${property.id}`;
    const text = `🏠 ${property.title}\n📍 ${property.city}\n💰 ${property.price.toLocaleString()} - Découvrez sur LaZone!`;
    
    return share({
      title: property.title,
      text,
      url,
      dialogTitle: 'Partager cette propriété'
    });
  }, [share]);

  const shareProfile = useCallback(async (profile: {
    userId: string;
    name: string;
  }) => {
    const url = `${window.location.origin}/user/${profile.userId}`;
    const text = `Découvrez le profil de ${profile.name} sur LaZone!`;
    
    return share({
      title: `Profil de ${profile.name}`,
      text,
      url,
      dialogTitle: 'Partager ce profil'
    });
  }, [share]);

  return {
    share,
    shareProperty,
    shareProfile,
    loading
  };
};

// ==================== STATUS BAR HOOK ====================
export const useStatusBar = () => {
  const setStyle = useCallback(async (style: 'light' | 'dark') => {
    if (!isNativePlatform()) return;
    
    try {
      await StatusBar.setStyle({
        style: style === 'light' ? Style.Light : Style.Dark
      });
    } catch (error) {
      console.error('Status bar error:', error);
    }
  }, []);

  const setBackgroundColor = useCallback(async (color: string) => {
    if (!isNativePlatform()) return;
    
    try {
      await StatusBar.setBackgroundColor({ color });
    } catch (error) {
      console.error('Status bar background error:', error);
    }
  }, []);

  const hide = useCallback(async () => {
    if (!isNativePlatform()) return;
    
    try {
      await StatusBar.hide();
    } catch (error) {
      console.error('Status bar hide error:', error);
    }
  }, []);

  const show = useCallback(async () => {
    if (!isNativePlatform()) return;
    
    try {
      await StatusBar.show();
    } catch (error) {
      console.error('Status bar show error:', error);
    }
  }, []);

  return {
    setStyle,
    setBackgroundColor,
    hide,
    show,
    isNative: isNativePlatform()
  };
};

// ==================== KEYBOARD HOOK ====================
export const useKeyboard = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!isNativePlatform()) return;

    const showListener = Keyboard.addListener('keyboardWillShow', (info) => {
      setIsVisible(true);
      setKeyboardHeight(info.keyboardHeight);
    });

    const hideListener = Keyboard.addListener('keyboardWillHide', () => {
      setIsVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      showListener.then(l => l.remove());
      hideListener.then(l => l.remove());
    };
  }, []);

  const hide = useCallback(async () => {
    if (!isNativePlatform()) return;
    
    try {
      await Keyboard.hide();
    } catch (error) {
      console.error('Keyboard hide error:', error);
    }
  }, []);

  return {
    isVisible,
    keyboardHeight,
    hide,
    isNative: isNativePlatform()
  };
};

// ==================== HAPTICS HOOK ====================
export const useHaptics = () => {
  const impact = useCallback(async (style: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (!isNativePlatform()) return;
    
    try {
      const impactStyle = {
        light: ImpactStyle.Light,
        medium: ImpactStyle.Medium,
        heavy: ImpactStyle.Heavy
      }[style];
      
      await Haptics.impact({ style: impactStyle });
    } catch (error) {
      console.error('Haptics impact error:', error);
    }
  }, []);

  const notification = useCallback(async (type: 'success' | 'warning' | 'error' = 'success') => {
    if (!isNativePlatform()) return;
    
    try {
      const notificationType = {
        success: NotificationType.Success,
        warning: NotificationType.Warning,
        error: NotificationType.Error
      }[type];
      
      await Haptics.notification({ type: notificationType });
    } catch (error) {
      console.error('Haptics notification error:', error);
    }
  }, []);

  const vibrate = useCallback(async (duration: number = 300) => {
    if (!isNativePlatform()) return;
    
    try {
      await Haptics.vibrate({ duration });
    } catch (error) {
      console.error('Haptics vibrate error:', error);
    }
  }, []);

  const selectionStart = useCallback(async () => {
    if (!isNativePlatform()) return;
    
    try {
      await Haptics.selectionStart();
    } catch (error) {
      console.error('Haptics selection start error:', error);
    }
  }, []);

  const selectionChanged = useCallback(async () => {
    if (!isNativePlatform()) return;
    
    try {
      await Haptics.selectionChanged();
    } catch (error) {
      console.error('Haptics selection changed error:', error);
    }
  }, []);

  const selectionEnd = useCallback(async () => {
    if (!isNativePlatform()) return;
    
    try {
      await Haptics.selectionEnd();
    } catch (error) {
      console.error('Haptics selection end error:', error);
    }
  }, []);

  return {
    impact,
    notification,
    vibrate,
    selectionStart,
    selectionChanged,
    selectionEnd,
    isNative: isNativePlatform()
  };
};

// ==================== GEOLOCATION HOOK ====================
export const useGeolocation = () => {
  const [position, setPosition] = useState<Position | null>(null);
  const [loading, setLoading] = useState(false);
  const [watchId, setWatchId] = useState<string | null>(null);

  const getCurrentPosition = useCallback(async (options?: {
    enableHighAccuracy?: boolean;
    timeout?: number;
    maximumAge?: number;
  }): Promise<Position | null> => {
    setLoading(true);
    try {
      const permission = await Geolocation.checkPermissions();
      
      if (permission.location !== 'granted') {
        const requested = await Geolocation.requestPermissions();
        if (requested.location !== 'granted') {
          toast({
            title: 'Localisation désactivée',
            description: 'Activez la localisation dans les paramètres',
            variant: 'destructive'
          });
          return null;
        }
      }

      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: options?.enableHighAccuracy ?? true,
        timeout: options?.timeout ?? 10000,
        maximumAge: options?.maximumAge ?? 0
      });
      
      setPosition(pos);
      return pos;
    } catch (error: any) {
      console.error('Geolocation error:', error);
      toast({
        title: 'Erreur de localisation',
        description: error.message || 'Impossible d\'obtenir votre position',
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const watchPosition = useCallback(async (
    callback: (position: Position) => void,
    options?: { enableHighAccuracy?: boolean; timeout?: number; maximumAge?: number }
  ) => {
    try {
      const permission = await Geolocation.checkPermissions();
      
      if (permission.location !== 'granted') {
        const requested = await Geolocation.requestPermissions();
        if (requested.location !== 'granted') {
          return null;
        }
      }

      const id = await Geolocation.watchPosition(
        {
          enableHighAccuracy: options?.enableHighAccuracy ?? true,
          timeout: options?.timeout ?? 10000,
          maximumAge: options?.maximumAge ?? 0
        },
        (position, error) => {
          if (position) {
            setPosition(position);
            callback(position);
          }
          if (error) {
            console.error('Watch position error:', error);
          }
        }
      );
      
      setWatchId(id);
      return id;
    } catch (error) {
      console.error('Watch position setup error:', error);
      return null;
    }
  }, []);

  const clearWatch = useCallback(async () => {
    if (watchId) {
      await Geolocation.clearWatch({ id: watchId });
      setWatchId(null);
    }
  }, [watchId]);

  useEffect(() => {
    return () => {
      if (watchId) {
        Geolocation.clearWatch({ id: watchId });
      }
    };
  }, [watchId]);

  return {
    position,
    loading,
    getCurrentPosition,
    watchPosition,
    clearWatch,
    isNative: isNativePlatform()
  };
};

// ==================== DEVICE INFO HOOK ====================
export const useDeviceInfo = () => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [batteryInfo, setBatteryInfo] = useState<BatteryInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const getInfo = useCallback(async () => {
    setLoading(true);
    try {
      const info = await Device.getInfo();
      setDeviceInfo(info);
      return info;
    } catch (error) {
      console.error('Device info error:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getBatteryInfo = useCallback(async () => {
    try {
      const battery = await Device.getBatteryInfo();
      setBatteryInfo(battery);
      return battery;
    } catch (error) {
      console.error('Battery info error:', error);
      return null;
    }
  }, []);

  const getLanguageCode = useCallback(async () => {
    try {
      const language = await Device.getLanguageCode();
      return language.value;
    } catch (error) {
      console.error('Language code error:', error);
      return null;
    }
  }, []);

  const getLanguageTag = useCallback(async () => {
    try {
      const language = await Device.getLanguageTag();
      return language.value;
    } catch (error) {
      console.error('Language tag error:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    getInfo();
    getBatteryInfo();
  }, [getInfo, getBatteryInfo]);

  return {
    deviceInfo,
    batteryInfo,
    loading,
    getInfo,
    getBatteryInfo,
    getLanguageCode,
    getLanguageTag,
    isNative: isNativePlatform()
  };
};
