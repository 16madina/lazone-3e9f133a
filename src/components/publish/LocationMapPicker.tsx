import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, Check } from 'lucide-react';

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom orange marker icon
const orangeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

// Country coordinates for centering the map
export const countryCoordinates: Record<string, { lat: number; lng: number; zoom: number }> = {
  'DZ': { lat: 28.0339, lng: 1.6596, zoom: 5 },
  'AO': { lat: -11.2027, lng: 17.8739, zoom: 5 },
  'BJ': { lat: 9.3077, lng: 2.3158, zoom: 7 },
  'BW': { lat: -22.3285, lng: 24.6849, zoom: 6 },
  'BF': { lat: 12.2383, lng: -1.5616, zoom: 6 },
  'BI': { lat: -3.3731, lng: 29.9189, zoom: 8 },
  'CM': { lat: 5.9631, lng: 10.1591, zoom: 6 },
  'CV': { lat: 16.5388, lng: -23.0418, zoom: 8 },
  'CF': { lat: 6.6111, lng: 20.9394, zoom: 6 },
  'TD': { lat: 15.4542, lng: 18.7322, zoom: 5 },
  'KM': { lat: -11.6455, lng: 43.3333, zoom: 9 },
  'CG': { lat: -0.2280, lng: 15.8277, zoom: 6 },
  'CD': { lat: -4.0383, lng: 21.7587, zoom: 5 },
  'CI': { lat: 7.5400, lng: -5.5471, zoom: 7 },
  'DJ': { lat: 11.5886, lng: 42.5903, zoom: 8 },
  'EG': { lat: 26.8206, lng: 30.8025, zoom: 5 },
  'GQ': { lat: 1.6508, lng: 10.2679, zoom: 8 },
  'ER': { lat: 15.1794, lng: 39.7823, zoom: 6 },
  'SZ': { lat: -26.5225, lng: 31.4659, zoom: 9 },
  'ET': { lat: 9.1450, lng: 40.4897, zoom: 5 },
  'GA': { lat: -0.8037, lng: 11.6094, zoom: 7 },
  'GM': { lat: 13.4432, lng: -15.3101, zoom: 8 },
  'GH': { lat: 7.9465, lng: -1.0232, zoom: 7 },
  'GN': { lat: 9.9456, lng: -9.6966, zoom: 7 },
  'GW': { lat: 11.8037, lng: -15.1804, zoom: 8 },
  'KE': { lat: -0.0236, lng: 37.9062, zoom: 6 },
  'LS': { lat: -29.6100, lng: 28.2336, zoom: 8 },
  'LR': { lat: 6.4281, lng: -9.4295, zoom: 7 },
  'LY': { lat: 26.3351, lng: 17.2283, zoom: 5 },
  'MG': { lat: -18.7669, lng: 46.8691, zoom: 5 },
  'MW': { lat: -13.2543, lng: 34.3015, zoom: 6 },
  'ML': { lat: 17.5707, lng: -3.9962, zoom: 5 },
  'MR': { lat: 21.0079, lng: -10.9408, zoom: 5 },
  'MU': { lat: -20.3484, lng: 57.5522, zoom: 9 },
  'MA': { lat: 31.7917, lng: -7.0926, zoom: 5 },
  'MZ': { lat: -18.6657, lng: 35.5296, zoom: 5 },
  'NA': { lat: -22.9576, lng: 18.4904, zoom: 5 },
  'NE': { lat: 17.6078, lng: 8.0817, zoom: 5 },
  'NG': { lat: 9.0820, lng: 8.6753, zoom: 6 },
  'RW': { lat: -1.9403, lng: 29.8739, zoom: 8 },
  'ST': { lat: 0.1864, lng: 6.6131, zoom: 9 },
  'SN': { lat: 14.4974, lng: -14.4524, zoom: 7 },
  'SC': { lat: -4.6796, lng: 55.4920, zoom: 9 },
  'SL': { lat: 8.4606, lng: -11.7799, zoom: 7 },
  'SO': { lat: 5.1521, lng: 46.1996, zoom: 5 },
  'ZA': { lat: -30.5595, lng: 22.9375, zoom: 5 },
  'SS': { lat: 6.8770, lng: 31.3070, zoom: 6 },
  'SD': { lat: 12.8628, lng: 30.2176, zoom: 5 },
  'TZ': { lat: -6.3690, lng: 34.8888, zoom: 5 },
  'TG': { lat: 8.6195, lng: 0.8248, zoom: 7 },
  'TN': { lat: 33.8869, lng: 9.5375, zoom: 6 },
  'UG': { lat: 1.3733, lng: 32.2903, zoom: 7 },
  'ZM': { lat: -13.1339, lng: 27.8493, zoom: 6 },
  'ZW': { lat: -19.0154, lng: 29.1549, zoom: 6 },
};

interface LocationMapPickerProps {
  position: { lat: number; lng: number };
  onPositionChange: (lat: number, lng: number) => void;
  countryCode?: string;
}

export default function LocationMapPicker({ position, onPositionChange, countryCode }: LocationMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [pendingPosition, setPendingPosition] = useState<{ lat: number; lng: number } | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search function
  const searchAddress = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const countryFilter = countryCode ? `&countrycodes=${countryCode.toLowerCase()}` : '';
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}${countryFilter}&limit=5`,
        {
          headers: {
            'Accept-Language': 'fr',
          },
        }
      );
      const data: NominatimResult[] = await response.json();
      setSearchResults(data);
      setShowResults(data.length > 0);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [countryCode]);

  // Handle search input change with debounce
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      searchAddress(value);
    }, 300);
  };

  // Handle selecting a search result
  const handleSelectResult = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    onPositionChange(lat, lng);
    setPendingPosition(null);
    
    if (mapRef.current && markerRef.current) {
      mapRef.current.setView([lat, lng], 15);
      markerRef.current.setLatLng([lat, lng]);
    }
    
    setSearchQuery(result.display_name.split(',')[0]);
    setShowResults(false);
    setSearchResults([]);
  };

  // Validate the pending position
  const handleValidatePosition = () => {
    if (pendingPosition) {
      onPositionChange(pendingPosition.lat, pendingPosition.lng);
      setPendingPosition(null);
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const coords = countryCode ? countryCoordinates[countryCode] : { lat: 5.3600, lng: -4.0083, zoom: 12 };
    const center: [number, number] = [coords?.lat || 5.3600, coords?.lng || -4.0083];
    const zoom = coords?.zoom || 12;

    // Create map
    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      scrollWheelZoom: true,
    });

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Create draggable marker
    const marker = L.marker([position.lat, position.lng], {
      icon: orangeIcon,
      draggable: true,
    }).addTo(map);

    // Update position in real-time while dragging
    marker.on('drag', () => {
      const latLng = marker.getLatLng();
      setPendingPosition({ lat: latLng.lat, lng: latLng.lng });
    });

    // Update position when marker drag ends
    marker.on('dragend', () => {
      const latLng = marker.getLatLng();
      setPendingPosition({ lat: latLng.lat, lng: latLng.lng });
    });

    // Update marker position when map is clicked
    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      setPendingPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    mapRef.current = map;
    markerRef.current = marker;
    setIsMapReady(true);

    // Cleanup
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []); // Only run once on mount

  // Update map center when country changes
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;
    
    if (countryCode && countryCoordinates[countryCode]) {
      const coords = countryCoordinates[countryCode];
      mapRef.current.setView([coords.lat, coords.lng], coords.zoom);
      
      // Update marker position
      if (markerRef.current) {
        markerRef.current.setLatLng([coords.lat, coords.lng]);
        onPositionChange(coords.lat, coords.lng);
      }
    }
  }, [countryCode, isMapReady]);

  // Update marker when position prop changes externally
  useEffect(() => {
    if (!markerRef.current || !isMapReady) return;
    
    const currentPos = markerRef.current.getLatLng();
    if (currentPos.lat !== position.lat || currentPos.lng !== position.lng) {
      markerRef.current.setLatLng([position.lat, position.lng]);
    }
  }, [position.lat, position.lng, isMapReady]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher une adresse..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            className="pl-9 pr-9"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
          )}
        </div>
        
        {/* Search results dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-60 overflow-auto">
            {searchResults.map((result) => (
              <button
                key={result.place_id}
                type="button"
                onClick={() => handleSelectResult(result)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors border-b border-border last:border-b-0"
              >
                <span className="line-clamp-2">{result.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map container */}
      <div className="relative">
        <div 
          ref={mapContainerRef}
          className="h-64 w-full rounded-xl overflow-hidden border border-border"
          style={{ minHeight: '256px' }}
        />
        
        {/* Real-time coordinates display */}
        {pendingPosition && (
          <div className="absolute top-3 left-3 z-[1000] bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-border shadow-sm">
            <p className="text-xs font-mono text-foreground">
              {pendingPosition.lat.toFixed(6)}, {pendingPosition.lng.toFixed(6)}
            </p>
          </div>
        )}
        
        {/* Validate button overlay */}
        {pendingPosition && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000]">
            <Button
              type="button"
              onClick={handleValidatePosition}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
            >
              <Check className="h-4 w-4 mr-2" />
              Valider cette position
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
