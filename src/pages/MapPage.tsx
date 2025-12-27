import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, MapPin, Bed, Bath, Maximize, Search, Loader2, Navigation, Check, Globe, ChevronDown, Calendar, Star, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { MapPropertyList } from '@/components/map/MapPropertyList';
import { useProperties, Property } from '@/hooks/useProperties';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/stores/appStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { africanCountries, Country } from '@/data/africanCountries';
import { getCurrencyByCountry } from '@/data/currencies';
import SectionTutorialButton from '@/components/tutorial/SectionTutorialButton';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// Country coordinates for map zooming
const countryCoordinates: Record<string, { lat: number; lng: number; zoom: number }> = {
  'CI': { lat: 7.54, lng: -5.55, zoom: 7 },
  'SN': { lat: 14.50, lng: -14.45, zoom: 7 },
  'ML': { lat: 17.57, lng: -4.00, zoom: 6 },
  'BF': { lat: 12.24, lng: -1.56, zoom: 7 },
  'GN': { lat: 9.95, lng: -9.70, zoom: 7 },
  'CM': { lat: 7.37, lng: 12.35, zoom: 6 },
  'GA': { lat: -0.80, lng: 11.61, zoom: 7 },
  'CG': { lat: -0.23, lng: 15.83, zoom: 7 },
  'CD': { lat: -4.04, lng: 21.76, zoom: 5 },
  'BJ': { lat: 9.31, lng: 2.31, zoom: 7 },
  'TG': { lat: 8.62, lng: 0.82, zoom: 7 },
  'NE': { lat: 17.61, lng: 8.08, zoom: 6 },
  'NG': { lat: 9.08, lng: 8.67, zoom: 6 },
  'GH': { lat: 7.95, lng: -1.02, zoom: 7 },
  'MA': { lat: 31.79, lng: -7.09, zoom: 6 },
  'DZ': { lat: 28.03, lng: 1.66, zoom: 5 },
  'TN': { lat: 33.89, lng: 9.54, zoom: 7 },
  'EG': { lat: 26.82, lng: 30.80, zoom: 6 },
  'KE': { lat: -0.02, lng: 37.91, zoom: 6 },
  'TZ': { lat: -6.37, lng: 34.89, zoom: 6 },
  'UG': { lat: 1.37, lng: 32.29, zoom: 7 },
  'RW': { lat: -1.94, lng: 29.87, zoom: 9 },
  'ZA': { lat: -30.56, lng: 22.94, zoom: 5 },
  'MG': { lat: -18.77, lng: 46.87, zoom: 6 },
  'MU': { lat: -20.35, lng: 57.55, zoom: 10 },
  'SC': { lat: -4.68, lng: 55.49, zoom: 10 },
};

const formatPriceShort = (price: number, isResidence: boolean = false) => {
  if (price >= 1000000) {
    return `${(price / 1000000).toFixed(1)}M${isResidence ? '/n' : ''}`;
  } else if (price >= 1000) {
    return `${Math.round(price / 1000)}K${isResidence ? '/n' : ''}`;
  }
  return price.toString() + (isResidence ? '/n' : '');
};

const formatPrice = (price: number, countryCode: string | null, isResidence: boolean = false) => {
  const currency = getCurrencyByCountry(countryCode);
  const symbol = currency?.symbol || 'FCFA';
  const formatted = new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(price) + ' ' + symbol;
  return isResidence ? `${formatted}/nuit` : formatted;
};

const MapPage = () => {
  const navigate = useNavigate();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const { properties, loading: propertiesLoading } = useProperties();
  const { profile } = useAuth();
  const { appMode, selectedCountry, setSelectedCountry } = useAppStore();
  const isResidence = appMode === 'residence';
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>('all');
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [initialCountrySet, setInitialCountrySet] = useState(false);
  const [showList, setShowList] = useState(false);

  // Default center (Africa)
  const defaultCenter = { lat: 5.3600, lng: -4.0083 };

  // Initialize country filter from user profile if not already set
  useEffect(() => {
    if (selectedCountry) {
      setInitialCountrySet(true);
      return;
    }
    
    if (profile?.country && !initialCountrySet) {
      const userCountry = africanCountries.find(c => c.code === profile.country);
      if (userCountry) {
        setSelectedCountry(userCountry);
        setInitialCountrySet(true);
        
        // Zoom to user's country when map is ready
        if (mapRef.current) {
          const coords = countryCoordinates[userCountry.code];
          if (coords) {
            mapRef.current.setView([coords.lat, coords.lng], coords.zoom);
          }
        }
      }
    }
  }, [profile?.country, initialCountrySet, selectedCountry, setSelectedCountry]);

  // Zoom to country when map loads or selectedCountry changes
  useEffect(() => {
    if (mapLoaded && selectedCountry && mapRef.current) {
      const coords = countryCoordinates[selectedCountry.code];
      if (coords) {
        mapRef.current.flyTo([coords.lat, coords.lng], coords.zoom, {
          duration: 1.5,
          easeLinearity: 0.25
        });
      }
    }
  }, [mapLoaded, selectedCountry]);

  useEffect(() => {
    loadLeaflet();
    // Don't auto-fetch location on mount - let user trigger it manually
  }, []);


  const getUserLocation = () => {
    if (!navigator.geolocation) {
      toast.error('La géolocalisation n\'est pas supportée par votre navigateur');
      return;
    }

    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setLocatingUser(false);
        
        // Center map on user location
        if (mapRef.current) {
          mapRef.current.setView([latitude, longitude], 13);
          addUserMarker(latitude, longitude);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        setLocatingUser(false);
        // Don't show error toast, just use default location
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const addUserMarker = (lat: number, lng: number) => {
    if (!mapRef.current) return;
    
    // Remove existing user marker
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }
    
    const userIcon = L.divIcon({
      className: 'user-location-marker',
      html: `
        <div style="
          width: 20px;
          height: 20px;
          background: #3b82f6;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5);
        "></div>
        <div style="
          position: absolute;
          top: -5px;
          left: -5px;
          width: 30px;
          height: 30px;
          background: rgba(59, 130, 246, 0.2);
          border-radius: 50%;
          animation: pulse 2s infinite;
        "></div>
      `,
      iconSize: L.point(20, 20),
      iconAnchor: L.point(10, 10),
    });
    
    userMarkerRef.current = L.marker([lat, lng], { icon: userIcon }).addTo(mapRef.current);
  };

  const centerOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.setView([userLocation.lat, userLocation.lng], 15);
    } else {
      getUserLocation();
    }
  };

  const loadLeaflet = () => {
    if (mapContainerRef.current && !mapRef.current) {
      const map = L.map(mapContainerRef.current, { zoomControl: false }).setView([defaultCenter.lat, defaultCenter.lng], 13);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
      
      // Create marker cluster group with custom styling based on mode
      const clusterGroup = L.markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        iconCreateFunction: (cluster) => {
          const count = cluster.getChildCount();
          const clusterColor = isResidence 
            ? 'linear-gradient(135deg, #059669, #10b981)' 
            : 'linear-gradient(135deg, #ea580c, #f97316)';
          const shadowColor = isResidence 
            ? 'rgba(5, 150, 105, 0.4)' 
            : 'rgba(234, 88, 12, 0.4)';
          return L.divIcon({
            html: `<div style="
              background: ${clusterColor};
              color: white;
              width: 40px;
              height: 40px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 700;
              font-size: 14px;
              box-shadow: 0 4px 12px ${shadowColor};
              border: 3px solid white;
            ">${count}</div>`,
            className: 'custom-cluster-icon',
            iconSize: L.point(40, 40),
          });
        }
      });
      
      map.addLayer(clusterGroup);
      clusterGroupRef.current = clusterGroup;
      
      mapRef.current = map;
      setMapLoaded(true);
      setLoading(false);
    }
  };

  const filteredProperties = useMemo(() => {
    return properties.filter(p => {
      const matchesSearch = searchQuery === '' || 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.city.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || p.type === typeFilter;
      const matchesPropertyType = propertyTypeFilter === 'all' || p.propertyType === propertyTypeFilter;
      const matchesCountry = !selectedCountry || p.country === selectedCountry.code;
      return matchesSearch && matchesType && matchesPropertyType && matchesCountry;
    });
  }, [properties, searchQuery, typeFilter, propertyTypeFilter, selectedCountry]);

  const handleCountrySelect = (country: Country | null) => {
    setSelectedCountry(country);
    setCountrySearchQuery('');
    
    if (country && mapRef.current) {
      const coords = countryCoordinates[country.code];
      if (coords) {
        mapRef.current.flyTo([coords.lat, coords.lng], coords.zoom, {
          duration: 1.5,
          easeLinearity: 0.25
        });
        toast.success(`Carte centrée sur ${country.name}`);
      }
    } else if (!country && mapRef.current) {
      // Reset to Africa view with animation
      mapRef.current.flyTo([5, 20], 4, {
        duration: 1.5,
        easeLinearity: 0.25
      });
    }
  };

  // Filter countries based on search query
  const filteredCountries = useMemo(() => {
    if (!countrySearchQuery) return africanCountries;
    return africanCountries.filter(country => 
      country.name.toLowerCase().includes(countrySearchQuery.toLowerCase())
    );
  }, [countrySearchQuery]);

  // Store markers reference for updating selected state without rebuilding
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  // Update markers when properties change (but NOT when selectedProperty changes)
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !clusterGroupRef.current) return;
    
    // Clear existing markers from cluster group
    clusterGroupRef.current.clearLayers();
    markersRef.current.clear();
    
    // Add new markers to cluster group
    filteredProperties.forEach((property) => {
      if (property.lat && property.lng) {
        // In Residence mode, use price per night with emerald color
        const displayPrice = isResidence 
          ? (property.pricePerNight || property.price)
          : property.price;
        const bgColor = isResidence 
          ? '#059669'  // Emerald for Residence mode
          : (property.type === 'sale' ? '#ea580c' : '#16a34a');
        const priceText = formatPriceShort(displayPrice, isResidence);
        
        const icon = L.divIcon({
          className: 'custom-price-marker',
          html: `
            <div style="
              background: ${bgColor};
              color: white;
              padding: 6px 12px;
              border-radius: 20px;
              font-weight: 600;
              font-size: 12px;
              white-space: nowrap;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              cursor: pointer;
              display: inline-block;
            ">
              ${priceText}
            </div>
          `,
          iconSize: L.point(70, 30),
          iconAnchor: L.point(35, 15),
        });
        
        const marker = L.marker([property.lat, property.lng], { icon })
          .on('click', () => {
            setSelectedProperty(property);
          });
        
        markersRef.current.set(property.id, marker);
        clusterGroupRef.current?.addLayer(marker);
      }
    });
    
    // Fit bounds if there are properties and no user location
    if (filteredProperties.length > 0 && !userLocation) {
      const validProps = filteredProperties.filter(p => p.lat && p.lng);
      if (validProps.length > 0) {
        const bounds = L.latLngBounds(
          validProps.map(p => [p.lat, p.lng] as L.LatLngTuple)
        );
        mapRef.current?.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [filteredProperties, mapLoaded, isResidence]); // Added isResidence to dependencies

  // Update selected marker style without rebuilding cluster
  useEffect(() => {
    if (!selectedProperty) return;
    
    const displayPrice = isResidence 
      ? (selectedProperty.pricePerNight || selectedProperty.price)
      : selectedProperty.price;
    const priceText = formatPriceShort(displayPrice, isResidence);
    
    const marker = markersRef.current.get(selectedProperty.id);
    if (marker) {
      const selectedIcon = L.divIcon({
        className: 'custom-price-marker',
        html: `
          <div style="
            background: #1d4ed8;
            color: white;
            padding: 6px 12px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 12px;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            cursor: pointer;
            display: inline-block;
            transform: scale(1.2);
            z-index: 1000;
          ">
            ${priceText}
          </div>
        `,
        iconSize: L.point(70, 30),
        iconAnchor: L.point(35, 15),
      });
      
      marker.setIcon(selectedIcon);
    }
    
    // Reset previous selected marker when selection changes
    return () => {
      if (selectedProperty) {
        const prevMarker = markersRef.current.get(selectedProperty.id);
        if (prevMarker) {
        const bgColor = isResidence 
          ? '#059669'  // Emerald for Residence mode
          : (selectedProperty.type === 'sale' ? '#ea580c' : '#16a34a');
        const prevPriceText = formatPriceShort(displayPrice, isResidence);
          
          const normalIcon = L.divIcon({
            className: 'custom-price-marker',
            html: `
              <div style="
                background: ${bgColor};
                color: white;
                padding: 6px 12px;
                border-radius: 20px;
                font-weight: 600;
                font-size: 12px;
                white-space: nowrap;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                cursor: pointer;
                display: inline-block;
              ">
                ${prevPriceText}
              </div>
            `,
            iconSize: L.point(70, 30),
            iconAnchor: L.point(35, 15),
          });
          
          prevMarker.setIcon(normalIcon);
        }
      }
    };
  }, [selectedProperty, isResidence]);

  const getPrimaryImage = (images: string[]) => {
    return images?.[0] || '/placeholder.svg';
  };

  const closePropertyCard = () => {
    setSelectedProperty(null);
  };

  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  };

  return (
    <div className="h-screen flex flex-col relative">
      {/* Search and Filters Header */}
      <div 
        className="absolute top-0 left-0 right-0 z-[1000] p-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
      >
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                data-tutorial="map-country"
                className={`p-3 rounded-xl shadow-md border flex items-center gap-1 ${
                  selectedCountry 
                    ? isResidence 
                      ? 'bg-emerald-500 text-white border-emerald-500' 
                      : 'bg-primary text-primary-foreground' 
                    : 'bg-card'
                }`}
              >
                {selectedCountry ? (
                  <img 
                    src={`https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png`}
                    alt={selectedCountry.name}
                    className="w-5 h-5 rounded-sm object-cover"
                  />
                ) : (
                  <Globe className="w-5 h-5" />
                )}
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 bg-card border shadow-lg z-[1001] p-0">
              {/* Search input */}
              <div className="p-2 border-b sticky top-0 bg-card">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={countrySearchQuery}
                    onChange={(e) => setCountrySearchQuery(e.target.value)}
                    placeholder="Rechercher un pays..."
                    className="w-full pl-8 pr-3 py-2 text-sm bg-muted rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-primary"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              
              <div className="max-h-60 overflow-y-auto">
                {/* All countries option */}
                {!countrySearchQuery && (
                  <DropdownMenuItem
                    onClick={() => handleCountrySelect(null)}
                    className={`flex items-center gap-3 cursor-pointer ${!selectedCountry ? 'bg-primary/10' : ''}`}
                  >
                    <Globe className="w-5 h-5 text-muted-foreground" />
                    <span className="flex-1 text-sm font-medium">Tous les pays</span>
                    {!selectedCountry && <Check className="w-4 h-4 text-primary" />}
                  </DropdownMenuItem>
                )}
                
                {/* Country list */}
                {filteredCountries.map((country) => (
                  <DropdownMenuItem
                    key={country.code}
                    onClick={() => handleCountrySelect(country)}
                    className={`flex items-center gap-3 cursor-pointer ${selectedCountry?.code === country.code ? 'bg-primary/10' : ''}`}
                  >
                    <img
                      src={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png`}
                      alt={country.name}
                      className="w-5 h-4 rounded-sm object-cover"
                    />
                    <span className="flex-1 text-sm">{country.name}</span>
                    {selectedCountry?.code === country.code && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </DropdownMenuItem>
                ))}
                
                {filteredCountries.length === 0 && (
                  <div className="p-3 text-center text-sm text-muted-foreground">
                    Aucun pays trouvé
                  </div>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Temporarily hidden to debug green circle
          <div className="flex-1 relative" data-tutorial="map-search">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              className="pl-10 bg-card border shadow-md"
            />
          </div>
          */}
          {/* Temporarily hidden to debug green circle
          <button 
            className={`p-3 rounded-xl shadow-md border ${
              userLocation 
                ? isResidence 
                  ? 'bg-emerald-500 text-white border-emerald-500' 
                  : 'bg-primary text-primary-foreground' 
                : 'bg-card'
            }`}
            onClick={centerOnUser}
            disabled={locatingUser}
          >
            {locatingUser ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Navigation className="w-5 h-5" />
            )}
          </button>
          */}
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1" data-tutorial="map-filters">
          {isResidence ? (
            // Residence mode filters
            <>
              <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
                <SelectTrigger className={`w-auto shadow-md border h-9 px-3 ${propertyTypeFilter !== 'all' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-card'}`}>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent className="bg-card border shadow-lg z-[1001]">
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="house">Villa</SelectItem>
                  <SelectItem value="apartment">Appartement</SelectItem>
                  <SelectItem value="commercial">Résidence</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className={`w-auto shadow-md border h-9 px-3 ${typeFilter !== 'all' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-card'}`}>
                  <SelectValue placeholder="Durée" />
                </SelectTrigger>
                <SelectContent className="bg-card border shadow-lg z-[1001]">
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="rent">Court séjour</SelectItem>
                  <SelectItem value="sale">Long séjour</SelectItem>
                </SelectContent>
              </Select>
            </>
          ) : (
            // Immobilier mode filters
            <>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className={`w-auto shadow-md border h-9 px-3 ${typeFilter !== 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card'}`}>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent className="bg-card border shadow-lg z-[1001]">
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="sale">Vente</SelectItem>
                  <SelectItem value="rent">Location</SelectItem>
                </SelectContent>
              </Select>

              <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
                <SelectTrigger className={`w-auto shadow-md border h-9 px-3 ${propertyTypeFilter !== 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card'}`}>
                  <SelectValue placeholder="Propriété" />
                </SelectTrigger>
                <SelectContent className="bg-card border shadow-lg z-[1001]">
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="house">Maison</SelectItem>
                  <SelectItem value="apartment">Appartement</SelectItem>
                  <SelectItem value="land">Terrain</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}

          <button
            onClick={() => setShowList(!showList)}
            className={`px-3 py-1.5 rounded-lg shadow-md border text-sm whitespace-nowrap flex items-center gap-1.5 transition-colors ${
              showList 
                ? isResidence 
                  ? 'bg-emerald-500 text-white border-emerald-500' 
                  : 'bg-primary text-primary-foreground' 
                : 'bg-card'
            }`}
          >
            <List className="w-4 h-4" />
            Liste
          </button>

          <div className={`px-3 py-1.5 rounded-lg shadow-md border text-sm whitespace-nowrap flex items-center ${
            isResidence ? 'bg-emerald-500/10 text-emerald-700 border-emerald-200' : 'bg-card'
          }`}>
            {filteredProperties.length} annonce{filteredProperties.length > 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Property List Panel */}
      <MapPropertyList
        properties={filteredProperties}
        selectedProperty={selectedProperty}
        onSelectProperty={(property) => {
          setSelectedProperty(property);
          // Center map on selected property
          if (mapRef.current && property.lat && property.lng) {
            mapRef.current.flyTo([property.lat, property.lng], 15, {
              duration: 1,
              easeLinearity: 0.25
            });
          }
        }}
        onClose={() => setShowList(false)}
        isOpen={showList}
      />

      {/* Map Container */}
      <div 
        ref={mapContainerRef} 
        data-tutorial="map-view"
        className="flex-1 w-full z-0"
        style={{ minHeight: '100%' }}
      />

      {/* Loading Overlay */}
      {(loading || !mapLoaded) && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-[999]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Zoom Controls */}
      <div className="absolute right-3 top-32 z-[1000] flex flex-col gap-1" data-tutorial="map-zoom">
        <button 
          className="p-3 bg-card rounded-lg shadow-md border text-lg font-bold"
          onClick={handleZoomIn}
        >
          +
        </button>
        <button 
          className="p-3 bg-card rounded-lg shadow-md border text-lg font-bold"
          onClick={handleZoomOut}
        >
          −
        </button>
      </div>

      {/* Selected Property Card */}
      <AnimatePresence>
        {selectedProperty && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute bottom-20 left-3 right-3 z-[1000]"
          >
            <div className="bg-card rounded-2xl shadow-xl overflow-hidden border">
              {/* Drag Handle */}
              <div className="flex justify-center pt-2">
                <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
              </div>
              
              {/* Close Button */}
              <button
                onClick={closePropertyCard}
                className="absolute top-3 right-3 p-2 bg-muted rounded-full"
              >
                <X className="w-4 h-4" />
              </button>

              <div 
                className="flex p-3 gap-3 cursor-pointer"
                onClick={() => navigate(`/property/${selectedProperty.id}`)}
              >
                {/* Image */}
                <div className="w-28 h-28 flex-shrink-0 rounded-xl overflow-hidden">
                  <img
                    src={getPrimaryImage(selectedProperty.images)}
                    alt={selectedProperty.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  {/* Badges */}
                  <div className="flex items-center gap-2 mb-1">
                    {isResidence ? (
                      <>
                        {selectedProperty.minimumStay && selectedProperty.minimumStay > 1 && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Min {selectedProperty.minimumStay} nuits
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Star className="w-3 h-3 fill-primary text-primary" />
                          Nouveau
                        </span>
                      </>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        selectedProperty.type === 'sale' 
                          ? 'bg-primary/10 text-primary' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {selectedProperty.type === 'sale' ? 'Vente' : 'Location'}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {selectedProperty.city}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-sm line-clamp-1 mb-1">
                    {selectedProperty.title}
                  </h3>

                  {/* Location */}
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                    <MapPin className="w-3 h-3" />
                    {selectedProperty.address}
                  </p>

                  {/* Price */}
                  <p className="text-primary font-bold">
                    {isResidence 
                      ? formatPrice(selectedProperty.pricePerNight || selectedProperty.price, selectedProperty.country, true)
                      : (
                        <>
                          {formatPrice(selectedProperty.price, selectedProperty.country)}
                          {selectedProperty.type === 'rent' && <span className="text-xs font-normal">/mois</span>}
                        </>
                      )
                    }
                  </p>

                  {/* Features */}
                  {selectedProperty.propertyType !== 'land' && (
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {selectedProperty.bedrooms > 0 && (
                        <span className="flex items-center gap-1">
                          <Bed className="w-3 h-3" />
                          {selectedProperty.bedrooms}
                        </span>
                      )}
                      {selectedProperty.bathrooms > 0 && (
                        <span className="flex items-center gap-1">
                          <Bath className="w-3 h-3" />
                          {selectedProperty.bathrooms}
                        </span>
                      )}
                      {selectedProperty.area > 0 && (
                        <span className="flex items-center gap-1">
                          <Maximize className="w-3 h-3" />
                          {selectedProperty.area}m²
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SectionTutorialButton section="map" />
    </div>
  );
};

export default MapPage;
