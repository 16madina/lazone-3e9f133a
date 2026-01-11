import { useState, useEffect } from 'react';
import { Loader2, Info, Sparkles, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { SearchBar } from '@/components/home/SearchBar';
import { FilterChips } from '@/components/home/FilterChips';
import { SponsoredPropertiesSection } from '@/components/home/SponsoredPropertiesSection';
import { PropertyCard } from '@/components/property/PropertyCard';
import { CountrySelector } from '@/components/home/CountrySelector';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import { AdBanner } from '@/components/home/AdBanner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AppLogo } from '@/components/AppLogo';
import { AppModeSwitch } from '@/components/home/AppModeSwitch';
import { ModeSwitchSplash } from '@/components/ModeSwitchSplash';
import { ReferralSheet } from '@/components/referral/ReferralSheet';
import SectionTutorialButton from '@/components/tutorial/SectionTutorialButton';
import { AppDownloadButtons } from '@/components/AppDownloadButtons';
import { SEOHead } from '@/components/SEOHead';
import { useAppStore, AppMode } from '@/stores/appStore';
import { useProperties } from '@/hooks/useProperties';
import { useAuth } from '@/hooks/useAuth';
import { useGeoCountry } from '@/hooks/useGeoCountry';
import { useAppMode } from '@/hooks/useAppMode';
import { supabase } from '@/integrations/supabase/client';
import { africanCountries, Country } from '@/data/africanCountries';
import heroBg1 from '@/assets/hero-bg.jpg';
import heroBg2 from '@/assets/hero-bg-2.jpg';
import heroBg3 from '@/assets/hero-bg-3.jpg';
import heroBg4 from '@/assets/hero-bg-4.jpg';

const heroImages = [heroBg1, heroBg2, heroBg3, heroBg4];

interface AdBannerData {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
}

const Index = () => {
  const { activeFilter, searchQuery, priceRange, bedroomsFilter, bathroomsFilter, setBedroomsFilter, setBathroomsFilter, selectedCountry, setSelectedCountry } = useAppStore();
  const { properties, loading } = useProperties();
  const { profile, user } = useAuth();
  const { detectedCountry, permissionDenied, showAllCountries } = useGeoCountry();
  const { appMode, isResidence, isModeSwitching, switchMode, completeModeSwitch } = useAppMode();
  const [pendingMode, setPendingMode] = useState<AppMode | null>(null);
  const [currentBg, setCurrentBg] = useState(heroBg1);
  const [showGeoAlert, setShowGeoAlert] = useState(false);
  const [adBanners, setAdBanners] = useState<AdBannerData[]>([]);
  const [initialCountrySet, setInitialCountrySet] = useState(false);
  const [referralSheetOpen, setReferralSheetOpen] = useState(false);

  const handleModeSwitch = (newMode: AppMode) => {
    setPendingMode(newMode);
    switchMode(newMode);
  };

  const handleSwitchComplete = () => {
    setPendingMode(null);
    completeModeSwitch();
  };

  // Fetch ad banners
  useEffect(() => {
    const fetchBanners = async () => {
      const { data } = await supabase
        .from('ad_banners')
        .select('id, title, image_url, link_url')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (data) {
        setAdBanners(data);
      }
    };
    fetchBanners();
  }, []);

  // Initialize country: logged-in users get their profile country, others get geolocation
  useEffect(() => {
    if (initialCountrySet) return;
    
    if (user && profile?.country) {
      // Logged-in user: use profile country
      const userCountry = africanCountries.find(c => c.code === profile.country);
      if (userCountry) {
        setSelectedCountry(userCountry);
        setInitialCountrySet(true);
      }
    } else if (!user) {
      if (detectedCountry) {
        // Not logged in: use geolocation-detected country
        setSelectedCountry(detectedCountry);
        setInitialCountrySet(true);
      } else if (showAllCountries) {
        // Geolocation denied or not in Africa - show all countries
        setSelectedCountry(null);
        setInitialCountrySet(true);
        if (permissionDenied) {
          setShowGeoAlert(true);
        }
      }
    }
  }, [user, profile?.country, detectedCountry, showAllCountries, permissionDenied, initialCountrySet, setSelectedCountry]);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * heroImages.length);
    setCurrentBg(heroImages[randomIndex]);
  }, []);

  // Normalize string for accent-insensitive comparison
  const normalizeCountryValue = (value: string | null | undefined) =>
    (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

  const matchesSelectedCountry = (propertyCountry: string | null, selected: Country | null) => {
    if (!selected) return true;
    const pc = normalizeCountryValue(propertyCountry);
    // Match by code OR by name (accent-insensitive)
    return (
      pc === normalizeCountryValue(selected.code) ||
      pc === normalizeCountryValue(selected.name)
    );
  };

  const filteredProperties = properties.filter((property) => {
    // Filter by country first (if a country is selected)
    if (!matchesSelectedCountry(property.country, selectedCountry)) {
      return false;
    }

    // Mode Residence: filter by price per night, Mode LaZone: by price
    const priceToCheck = isResidence && property.pricePerNight 
      ? property.pricePerNight 
      : property.price;
    
    if (priceToCheck < priceRange[0] || priceToCheck > priceRange[1]) {
      return false;
    }

    // Filter by bedrooms
    if (bedroomsFilter !== null && (property.bedrooms ?? 0) < bedroomsFilter) {
      return false;
    }

    // Filter by bathrooms
    if (bathroomsFilter !== null && (property.bathrooms ?? 0) < bathroomsFilter) {
      return false;
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !property.title.toLowerCase().includes(query) &&
        !property.city.toLowerCase().includes(query) &&
        !property.address.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    // Mode Residence: specific filters for short-term
    if (isResidence) {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'house') return property.propertyType === 'house';
      if (activeFilter === 'apartment') return property.propertyType === 'apartment';
      if (activeFilter === 'entire') return property.propertyType === 'house' || property.propertyType === 'apartment';
      if (activeFilter === 'pool') return property.features?.some(f => f.toLowerCase().includes('piscine'));
      if (activeFilter === 'wifi') return property.features?.some(f => f.toLowerCase().includes('wifi'));
      if (activeFilter === 'parking') return property.features?.some(f => f.toLowerCase().includes('parking'));
      return true;
    }

    // Mode LaZone: classic filters
    if (activeFilter === 'all') return true;
    if (activeFilter === 'sale') return property.type === 'sale';
    if (activeFilter === 'rent') return property.type === 'rent';
    if (activeFilter === 'house') return property.propertyType === 'house';
    if (activeFilter === 'apartment') return property.propertyType === 'apartment';
    if (activeFilter === 'land') return property.propertyType === 'land';
    if (activeFilter === 'commercial') return property.propertyType === 'commercial';
    return true;
  });

  // Insert banners after every 4 properties
  const renderPropertiesWithBanners = () => {
    const items: JSX.Element[] = [];
    let bannerIndex = 0;

    filteredProperties.forEach((property, index) => {
      items.push(
        <PropertyCard 
          key={property.id} 
          property={property} 
          userCountry={selectedCountry?.code}
          isFirst={index === 0}
        />
      );

      // After every 4 properties, insert a banner (if available)
      if ((index + 1) % 4 === 0 && adBanners.length > 0) {
        const banner = adBanners[bannerIndex % adBanners.length];
        items.push(
          <AdBanner 
            key={`banner-${banner.id}-${index}`}
            bannerId={banner.id}
            imageUrl={banner.image_url}
            linkUrl={banner.link_url}
            title={banner.title}
          />
        );
        bannerIndex++;
      }
    });

    return items;
  };

  return (
    <div className="min-h-screen pb-32 relative">
      {/* Dynamic SEO with canonical URL for homepage */}
      <SEOHead canonical="/" />
      {/* Parrainage Button - Fixed left side vertical */}
      {user && (
        <>
          <button
            onClick={() => setReferralSheetOpen(true)}
            className="fixed left-0 top-[28%] z-50"
          >
            <motion.div
              initial={{ x: -50 }}
              animate={{ x: 0 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
            >
              <motion.div
                animate={{ 
                  boxShadow: [
                    "0 0 0 0 rgba(249, 115, 22, 0.4)",
                    "0 0 0 6px rgba(249, 115, 22, 0)",
                    "0 0 0 0 rgba(249, 115, 22, 0)"
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="bg-gradient-to-b from-primary to-primary/80 text-white py-2 px-1.5 rounded-r-lg shadow-md flex flex-col items-center gap-1 hover:from-primary/90 hover:to-primary/70 transition-colors"
              >
                <Gift className="w-3.5 h-3.5" />
                <span className="text-[8px] font-bold tracking-tight" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                  PARRAINAGE
                </span>
              </motion.div>
            </motion.div>
          </button>
          <ReferralSheet open={referralSheetOpen} onOpenChange={setReferralSheetOpen} />
        </>
      )}
      {/* Mode Switch Splash */}
      {isModeSwitching && pendingMode && (
        <ModeSwitchSplash 
          targetMode={pendingMode} 
          onComplete={handleSwitchComplete} 
        />
      )}

      {/* Hero Section with Background */}
      <div 
        className="relative px-4 pb-8"
        style={{
          backgroundImage: `url(${currentBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          paddingTop: 'max(env(safe-area-inset-top, 0px), 1rem)',
        }}
      >
        {/* Dark Overlay - changes color based on mode */}
        <div 
          className={`absolute inset-0 transition-colors duration-500 ${
            isResidence 
              ? 'bg-gradient-to-b from-emerald-900/70 via-emerald-900/60 to-emerald-950/90'
              : 'bg-gradient-to-b from-black/60 via-black/50 to-black/80'
          }`} 
        />

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <header className="flex items-center justify-between mb-8">
            <AppLogo className="h-10" />
            <div className="flex items-center gap-2 sm:gap-3">
              <AppModeSwitch onSwitch={handleModeSwitch} />
              <CountrySelector 
                selectedCountry={selectedCountry} 
                onCountryChange={setSelectedCountry}
                isAuthenticated={!!user}
              />
              <NotificationDropdown variant="hero" />
              <ProfileDropdown variant="hero" />
            </div>
          </header>

          {/* Hero Content with Logo */}
          <div className="text-center mb-8">
            <AppLogo className="h-24 mx-auto mb-4" />
            <AnimatePresence mode="wait">
              <motion.h1 
                key={isResidence ? 'residence-title' : 'lazone-title'}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="font-display text-2xl font-bold text-white mb-2"
              >
                {isResidence ? (
                  <>
                    Séjours uniques
                    <br />
                    <span className="text-white/90">dans votre Zone</span>
                  </>
                ) : (
                  <>
                    Trouvez votre chez vous
                    <br />
                    <span className="text-white/90">dans votre Zone</span>
                  </>
                )}
              </motion.h1>
            </AnimatePresence>
            <AnimatePresence mode="wait">
              <motion.p 
                key={isResidence ? 'residence-subtitle' : 'lazone-subtitle'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "easeOut", delay: 0.1 }}
                className="text-white/70 text-sm"
              >
                {isResidence 
                  ? (selectedCountry 
                      ? `Courts séjours disponibles en ${selectedCountry.name}` 
                      : 'Courts séjours et locations vacances en Afrique')
                  : (selectedCountry 
                      ? `Propriétés disponibles en ${selectedCountry.name}` 
                      : 'Des milliers de propriétés disponibles en Afrique')
                }
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Search Bar */}
          <SearchBar variant="hero" selectedCountry={selectedCountry?.code} />

          {/* Filter Chips */}
          <div className="mt-4">
            <FilterChips variant="hero" />
          </div>

          {/* Sponsored Properties */}
          <div className="mt-6">
            <SponsoredPropertiesSection userCountry={selectedCountry?.code} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 pt-6">
        {/* Properties Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">
              {isResidence 
                ? (selectedCountry 
                    ? `Séjours en ${selectedCountry.name}` 
                    : 'Tous les séjours')
                : (selectedCountry 
                    ? `Propriétés en ${selectedCountry.name}` 
                    : 'Toutes les propriétés')
              }
            </h3>
            <button 
              onClick={() => {
                // Reset all filters to show all properties
                useAppStore.getState().setActiveFilter('all');
                useAppStore.getState().setSearchQuery('');
                useAppStore.getState().setPriceRange([0, 1000000000]);
                useAppStore.getState().setBedroomsFilter(null);
                useAppStore.getState().setBathroomsFilter(null);
              }}
              className="text-sm text-primary font-medium active:scale-95 transition-transform"
            >
              Voir tout
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid gap-4">
              {renderPropertiesWithBanners()}
            </div>
          )}

          {!loading && filteredProperties.length === 0 && (
            <div className="glass-card p-8 text-center">
              <p className="text-4xl mb-2">🔍</p>
              <p className="text-muted-foreground">
                {isResidence
                  ? (selectedCountry 
                      ? `Aucun séjour trouvé en ${selectedCountry.name}` 
                      : 'Aucun séjour trouvé')
                  : (selectedCountry 
                      ? `Aucune propriété trouvée en ${selectedCountry.name}` 
                      : 'Aucune propriété trouvée')
                }
              </p>
            </div>
          )}
        </section>

        {/* App Download Footer */}
        <section className="mt-8 mb-4">
          <AppDownloadButtons variant="footer" />
        </section>
      </div>

      <SectionTutorialButton section="home" />
    </div>
  );
};

export default Index;
