import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/stores/appStore';

export type BadgeLevel = 'none' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
export type ListingType = 'long_term' | 'short_term';
export type UserType = 'particulier' | 'proprietaire' | 'demarcheur' | 'agence' | null;
export type SubscriptionType = 'pro' | 'premium' | null;

export interface Property {
  id: string;
  title: string;
  price: number;
  pricePerNight?: number | null;
  minimumStay?: number | null;
  type: 'sale' | 'rent';
  propertyType: 'house' | 'apartment' | 'land' | 'commercial';
  listingType: ListingType;
  address: string;
  city: string;
  country: string | null;
  bedrooms: number;
  bathrooms: number;
  area: number;
  images: string[];
  description: string;
  features: string[];
  lat: number | null;
  lng: number | null;
  createdAt: string;
  userId: string;
  vendorBadge?: BadgeLevel;
  userType?: UserType;
  agencyName?: string | null;
  // Discount tiers
  hasDiscounts?: boolean;
  // Subscription info
  subscriptionType?: SubscriptionType;
  isSponsored?: boolean;
  sponsoredUntil?: string | null;
}

export const useProperties = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const appMode = useAppStore((state) => state.appMode);

  useEffect(() => {
    fetchProperties();
  }, [appMode]); // Re-fetch when app mode changes

  const fetchProperties = async () => {
    try {
      setLoading(true);
      setError(null);

      // Determine listing type based on app mode
      const listingType = appMode === 'residence' ? 'short_term' : 'long_term';

      // Fetch properties with their images, filtered by listing type
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select(`
          *,
          property_images (
            url,
            is_primary,
            display_order
          )
        `)
        .eq('is_active', true)
        .eq('listing_type', listingType)
        .order('created_at', { ascending: false });

      if (propertiesError) throw propertiesError;

      // Fetch all badges for the property owners
      const userIds = [...new Set((propertiesData || []).map(p => p.user_id))];
      const { data: badgesData } = await supabase
        .from('user_badges')
        .select('user_id, badge_level')
        .in('user_id', userIds);

      // Fetch user profiles for user_type and agency_name
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, user_type, agency_name')
        .in('user_id', userIds);

      // Fetch active subscriptions for users
      const { data: subscriptionsData } = await supabase
        .from('storekit_purchases')
        .select('user_id, product_id, status, expiration_date')
        .in('user_id', userIds)
        .eq('status', 'active');

      const badgeMap = new Map(
        (badgesData || []).map(b => [b.user_id, b.badge_level as BadgeLevel])
      );

      const profileMap = new Map(
        (profilesData || []).map(p => [p.user_id, { user_type: p.user_type as UserType, agency_name: p.agency_name }])
      );

      // Build subscription map - check for active subscription
      const subscriptionMap = new Map<string, SubscriptionType>();
      console.log('[useProperties] Subscriptions data:', subscriptionsData);
      (subscriptionsData || []).forEach(sub => {
        const isActive = !sub.expiration_date || new Date(sub.expiration_date) > new Date();
        // Check for subscription products by looking for 'sub' anywhere in product_id
        const isSubscription = sub.product_id.toLowerCase().includes('sub');
        
        console.log('[useProperties] Processing subscription:', {
          product_id: sub.product_id,
          user_id: sub.user_id,
          isActive,
          isSubscription
        });
        
        if (isActive && isSubscription) {
          if (sub.product_id.toLowerCase().includes('premium')) {
            subscriptionMap.set(sub.user_id, 'premium');
            console.log('[useProperties] Set premium for user:', sub.user_id);
          } else if (sub.product_id.toLowerCase().includes('pro') && !subscriptionMap.has(sub.user_id)) {
            subscriptionMap.set(sub.user_id, 'pro');
            console.log('[useProperties] Set pro for user:', sub.user_id);
          }
        }
      });
      console.log('[useProperties] Final subscription map:', Object.fromEntries(subscriptionMap));

      const formattedProperties: Property[] = (propertiesData || []).map((p) => {
        // Sort images: primary first, then by display_order
        const sortedImages = (p.property_images || [])
          .sort((a: any, b: any) => {
            if (a.is_primary && !b.is_primary) return -1;
            if (!a.is_primary && b.is_primary) return 1;
            return (a.display_order || 0) - (b.display_order || 0);
          })
          .map((img: any) => img.url);

        // Check if property has any discounts
        const hasDiscounts = !!(
          p.discount_3_nights || 
          p.discount_5_nights || 
          p.discount_7_nights || 
          p.discount_14_nights || 
          p.discount_30_nights
        );

        const userProfile = profileMap.get(p.user_id);

        return {
          id: p.id,
          title: p.title,
          price: Number(p.price),
          pricePerNight: p.price_per_night ? Number(p.price_per_night) : null,
          minimumStay: p.minimum_stay || null,
          type: p.type as 'sale' | 'rent',
          propertyType: p.property_type as 'house' | 'apartment' | 'land' | 'commercial',
          listingType: (p.listing_type || 'long_term') as ListingType,
          address: p.address,
          city: p.city,
          country: p.country || null,
          bedrooms: p.bedrooms || 0,
          bathrooms: p.bathrooms || 0,
          area: Number(p.area),
          images: sortedImages.length > 0 ? sortedImages : ['/placeholder.svg'],
          description: p.description || '',
          features: p.features || [],
          lat: p.lat ? Number(p.lat) : null,
          lng: p.lng ? Number(p.lng) : null,
          createdAt: p.created_at,
          userId: p.user_id,
          vendorBadge: badgeMap.get(p.user_id) || 'none',
          userType: userProfile?.user_type || null,
          agencyName: userProfile?.agency_name || null,
          hasDiscounts,
          subscriptionType: subscriptionMap.get(p.user_id) || null,
          isSponsored: p.is_sponsored || false,
          sponsoredUntil: p.sponsored_until || null,
        };
      });

      setProperties(formattedProperties);
    } catch (err: any) {
      console.error('Error fetching properties:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { properties, loading, error, refetch: fetchProperties };
};
