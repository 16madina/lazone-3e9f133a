import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Camera, MapPin, Home, DollarSign, Upload, Plus, X, 
  Bed, Bath, Maximize, FileText, Clock, Wallet, Check,
  Loader2, AlertCircle, ChevronDown, Map, Image, Moon, Navigation
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAppMode } from '@/hooks/useAppMode';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { filterMultipleFields, getContentViolationMessage } from '@/lib/contentFilter';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { z } from 'zod';
import { africanCountries } from '@/data/africanCountries';
import LocationMapPicker, { countryCoordinates } from '@/components/publish/LocationMapPicker';
import { useCamera, isNativePlatform } from '@/hooks/useNativePlugins';
import SectionTutorialButton from '@/components/tutorial/SectionTutorialButton';
import EmailVerificationRequired from '@/components/EmailVerificationRequired';
import ListingPaymentDialog from '@/components/publish/ListingPaymentDialog';
import { useListingLimit } from '@/hooks/useListingLimit';
import { Badge } from '@/components/ui/badge';
import heroBg3 from '@/assets/hero-bg-3.jpg';

type PropertyType = 'house' | 'apartment' | 'land' | 'commercial';
type TransactionType = 'sale' | 'rent';

interface FormErrors {
  images?: string;
  title?: string;
  description?: string;
  address?: string;
  city?: string;
  price?: string;
  area?: string;
  bedrooms?: string;
  bathrooms?: string;
}

const AMENITIES = [
  'Piscine', 'Jardin', 'Garage', 'Terrasse', 'Balcon', 'Cave',
  'Climatisation', 'Chauffage', 'Ascenseur', 'Gardien', 'Parking',
  'Cuisine équipée', 'Meublé', 'Internet', 'Eau chaude', 'Groupe électrogène'
];

// Commodités spécifiques pour Residence (location courte durée)
const RESIDENCE_AMENITIES = [
  'Wifi', 'Climatisation', 'Télévision', 'Cuisine équipée', 'Machine à laver',
  'Sèche-linge', 'Fer à repasser', 'Piscine', 'Jacuzzi', 'Parking gratuit',
  'Petit-déjeuner inclus', 'Service de ménage', 'Draps fournis', 'Serviettes',
  'Espace de travail', 'Balcon', 'Terrasse', 'Jardin', 'Barbecue', 'Vue mer'
];

// Restrictions pour Residence (location courte durée)
const RESIDENCE_RESTRICTIONS = [
  { id: 'non_fumeur', label: 'Non-fumeur', icon: '🚭' },
  { id: 'pas_animaux', label: 'Pas d\'animaux', icon: '🐾' },
  { id: 'pas_fete', label: 'Pas de fête', icon: '🎉' },
  { id: 'pas_drogue', label: 'Pas de drogue', icon: '💊' },
  { id: 'pas_alcool', label: 'Pas d\'alcool', icon: '🍺' },
  { id: 'silence_nuit', label: 'Silence après 22h', icon: '🤫' },
  { id: 'enfants_bienvenus', label: 'Enfants bienvenus', icon: '👶' },
  { id: 'check_in_flexible', label: 'Check-in flexible', icon: '🕐' },
];

const DOCUMENTS = [
  { id: 'acd', label: 'ACD (Attestation de Cession de Droits)' },
  { id: 'titre_foncier', label: 'Titre Foncier' },
  { id: 'permis_construire', label: 'Permis de construire' },
  { id: 'certificat_urbanisme', label: 'Certificat d\'urbanisme' },
  { id: 'plan_cadastral', label: 'Plan cadastral' },
  { id: 'attestation_propriete', label: 'Attestation de propriété' },
];

const LEASE_DURATIONS = [
  { value: '1', label: '1 mois' },
  { value: '3', label: '3 mois' },
  { value: '6', label: '6 mois' },
  { value: '12', label: '1 an' },
  { value: '24', label: '2 ans' },
  { value: '36', label: '3 ans' },
  { value: 'indefini', label: 'Indéfini' },
];

// Validation schema
const createValidationSchema = (propertyType: PropertyType, transactionType: TransactionType) => {
  const baseSchema = z.object({
    title: z.string().min(5, 'Le titre doit contenir au moins 5 caractères').max(100, 'Le titre ne peut pas dépasser 100 caractères'),
    address: z.string().min(3, 'L\'adresse doit contenir au moins 3 caractères'),
    city: z.string().min(2, 'La ville doit contenir au moins 2 caractères'),
    price: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, 'Le prix doit être un nombre positif'),
    area: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, 'La superficie doit être un nombre positif'),
  });

  return baseSchema;
};

const PublishPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, profile, isEmailVerified } = useAuth();
  const { isResidence, switchMode } = useAppMode();
  const { takePicture, pickMultiple, loading: cameraLoading } = useCamera();
  const { 
    settings: limitSettings, 
    loading: limitLoading,
    needsPayment, 
    canUseCredit,
    availableCredits,
    subscriptionCreditsRemaining,
    hasActiveSubscription,
    subscriptionType,
    userListingsCount,
    remainingFreeListings, 
    priceForUser,
    useCredit,
    refetch: refetchLimits
  } = useListingLimit();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [pendingPropertyId, setPendingPropertyId] = useState<string | null>(null);
  const [hasPaid, setHasPaid] = useState(false);
  
  // Form state
  const [propertyType, setPropertyType] = useState<PropertyType>('house');
  const [transactionType, setTransactionType] = useState<TransactionType>('sale');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [customCity, setCustomCity] = useState('');
  const [isCustomCity, setIsCustomCity] = useState(false);
  const [postalCode, setPostalCode] = useState('');
  const [price, setPrice] = useState('');
  const [area, setArea] = useState('');
  
  // Country and city selection
  const [selectedCountry, setSelectedCountry] = useState('');
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  
  // Commercial specific - Pas de porte
  const [hasPasDePorte, setHasPasDePorte] = useState(false);
  const [pasDePorteAmount, setPasDePorteAmount] = useState('');
  
  // Map state
  const [showMap, setShowMap] = useState(false);
  const [markerPosition, setMarkerPosition] = useState({ lat: 5.3600, lng: -4.0083 });
  
  // House/Apartment specific
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  
  // Documents (for land and sale)
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  
  // Rent specific
  const [leaseDuration, setLeaseDuration] = useState('12');
  const [depositMonths, setDepositMonths] = useState('2');

  // Short-term specific (Residence mode)
  const [pricePerNight, setPricePerNight] = useState('');
  const [minimumStay, setMinimumStay] = useState('1');
  const [selectedRestrictions, setSelectedRestrictions] = useState<string[]>([]);
  
  // Discount packages (for Residence mode)
  const [discount3Nights, setDiscount3Nights] = useState('');
  const [discount5Nights, setDiscount5Nights] = useState('');
  const [discount7Nights, setDiscount7Nights] = useState('');
  const [discount14Nights, setDiscount14Nights] = useState('');
  const [discount30Nights, setDiscount30Nights] = useState('');

  // Contact options
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);

  // Geocoding state
  const [isGeocoding, setIsGeocoding] = useState(false);
  const geocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Popover states
  const [amenitiesOpen, setAmenitiesOpen] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [restrictionsOpen, setRestrictionsOpen] = useState(false);

  // Save form data to sessionStorage before Stripe redirect
  const saveFormToStorage = () => {
    const formDataToSave = {
      propertyType,
      transactionType,
      title,
      description,
      address,
      city,
      postalCode,
      price,
      area,
      selectedCountry,
      markerPosition,
      bedrooms,
      bathrooms,
      selectedAmenities,
      selectedDocuments,
      leaseDuration,
      depositMonths,
      pricePerNight,
      minimumStay,
      selectedRestrictions,
      discount3Nights,
      discount5Nights,
      discount7Nights,
      discount14Nights,
      discount30Nights,
      whatsappEnabled,
      pendingPropertyId,
    };
    sessionStorage.setItem('publish_form_data', JSON.stringify(formDataToSave));
  };

  // Restore form data from sessionStorage after Stripe return
  const restoreFormFromStorage = () => {
    const saved = sessionStorage.getItem('publish_form_data');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.propertyType) setPropertyType(data.propertyType);
        if (data.transactionType) setTransactionType(data.transactionType);
        if (data.title) setTitle(data.title);
        if (data.description) setDescription(data.description);
        if (data.address) setAddress(data.address);
        if (data.city) setCity(data.city);
        if (data.postalCode) setPostalCode(data.postalCode);
        if (data.price) setPrice(data.price);
        if (data.area) setArea(data.area);
        if (data.selectedCountry) setSelectedCountry(data.selectedCountry);
        if (data.markerPosition) setMarkerPosition(data.markerPosition);
        if (data.bedrooms) setBedrooms(data.bedrooms);
        if (data.bathrooms) setBathrooms(data.bathrooms);
        if (data.selectedAmenities) setSelectedAmenities(data.selectedAmenities);
        if (data.selectedDocuments) setSelectedDocuments(data.selectedDocuments);
        if (data.leaseDuration) setLeaseDuration(data.leaseDuration);
        if (data.depositMonths) setDepositMonths(data.depositMonths);
        if (data.pricePerNight) setPricePerNight(data.pricePerNight);
        if (data.minimumStay) setMinimumStay(data.minimumStay);
        if (data.selectedRestrictions) setSelectedRestrictions(data.selectedRestrictions);
        if (data.discount3Nights) setDiscount3Nights(data.discount3Nights);
        if (data.discount5Nights) setDiscount5Nights(data.discount5Nights);
        if (data.discount7Nights) setDiscount7Nights(data.discount7Nights);
        if (data.discount14Nights) setDiscount14Nights(data.discount14Nights);
        if (data.discount30Nights) setDiscount30Nights(data.discount30Nights);
        if (data.whatsappEnabled !== undefined) setWhatsappEnabled(data.whatsappEnabled);
        if (data.pendingPropertyId) setPendingPropertyId(data.pendingPropertyId);
        
        // Clear storage after restore
        sessionStorage.removeItem('publish_form_data');
        return true;
      } catch (e) {
        console.error('Error restoring form data:', e);
      }
    }
    return false;
  };

  // Handle payment return from Stripe
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const modeParam = searchParams.get('mode');

    // Ensure user returns to the correct app mode
    if (modeParam === 'residence' || modeParam === 'lazone') {
      switchMode(modeParam);
    }

    if (paymentStatus === 'success') {
      const saved = sessionStorage.getItem('publish_form_data');
      let restoredPropertyId: string | null = null;

      if (saved) {
        try {
          const data = JSON.parse(saved);
          restoredPropertyId = data.pendingPropertyId || null;
          sessionStorage.removeItem('publish_form_data');
        } catch (e) {
          console.error('Error parsing saved form data:', e);
        }
      }

      const propertyIdFromUrl = searchParams.get('propertyId');
      const transactionRefFromUrl = searchParams.get('transactionRef');
      const sessionIdFromUrl = searchParams.get('session_id');
      const targetPropertyId = restoredPropertyId || propertyIdFromUrl;

      let cancelled = false;

      const confirmStripeIfPossible = async () => {
        if (!transactionRefFromUrl) return;

        try {
          await supabase.functions.invoke('confirm-stripe-payment', {
            body: { transactionRef: transactionRefFromUrl, sessionId: sessionIdFromUrl },
          });
        } catch (e) {
          console.error('Error confirming Stripe payment:', e);
        }
      };

      const waitForActivation = async () => {
        if (!targetPropertyId) {
          toast({
            title: 'Paiement réussi !',
            description: 'Paiement reçu. Votre annonce sera publiée automatiquement sous quelques instants.',
          });
          return;
        }

        // Try to reconcile immediately (fallback when webhook is delayed)
        await confirmStripeIfPossible();

        // Wait for backend to validate and activate the listing
        for (let i = 0; i < 12; i++) {
          if (cancelled) return;

          const { data: prop } = await supabase
            .from('properties')
            .select('is_active')
            .eq('id', targetPropertyId)
            .maybeSingle();

          if (prop?.is_active) {
            toast({
              title: 'Annonce publiée !',
              description: 'Votre paiement a été validé et votre annonce est maintenant en ligne.',
            });
            navigate('/');
            return;
          }

          if (transactionRefFromUrl) {
            refetchLimits();
          }

          await new Promise((r) => setTimeout(r, 2000));
        }

        toast({
          title: 'Paiement reçu',
          description: 'Votre annonce est en cours de validation. Revenez dans "En attente" dans quelques minutes.',
        });
      };

      waitForActivation();
      refetchLimits();
      setHasPaid(true);

      // Clean up URL
      const next = new URLSearchParams(searchParams);
      next.delete('payment');
      next.delete('transactionRef');
      setSearchParams(next, { replace: true });

      return () => {
        cancelled = true;
      };
    }

    if (paymentStatus === 'cancelled') {
      // Restore form data even if cancelled
      restoreFormFromStorage();

      toast({
        title: 'Paiement annulé',
        description: 'Vos données ont été conservées. Vous pouvez réessayer.',
        variant: 'destructive',
      });

      // Clean up URL
      const next = new URLSearchParams(searchParams);
      next.delete('payment');
      next.delete('transactionRef');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, refetchLimits, navigate, switchMode]);

  // Pre-fill country from user profile
  useEffect(() => {
    if (profile?.country) {
      const country = africanCountries.find(c => c.name === profile.country || c.code === profile.country);
      if (country) {
        setSelectedCountry(country.code);
        setAvailableCities(country.cities);
        
        // Set initial marker position based on country
        const coords = countryCoordinates[country.code];
        if (coords) {
          setMarkerPosition({ lat: coords.lat, lng: coords.lng });
        }
      }
    }
  }, [profile?.country]);

  // Update available cities when country changes
  useEffect(() => {
    if (selectedCountry) {
      const country = africanCountries.find(c => c.code === selectedCountry);
      if (country) {
        setAvailableCities(country.cities);
        // Reset city if not in new country's cities
        if (city && !country.cities.includes(city)) {
          setCity('');
        }
        
        // Update marker position to country center
        const coords = countryCoordinates[selectedCountry];
        if (coords) {
          setMarkerPosition({ lat: coords.lat, lng: coords.lng });
        }
      }
    }
  }, [selectedCountry]);

  // Auto-geocode when city or address changes
  const geocodeAddress = async (searchAddress: string, searchCity: string, countryCode: string, showToast = true) => {
    if (!searchCity || searchCity.length < 2) return;
    
    setIsGeocoding(true);
    try {
      // Build the search query
      const queryParts = [];
      if (searchAddress && searchAddress.length >= 3) {
        queryParts.push(searchAddress);
      }
      queryParts.push(searchCity);
      
      const query = queryParts.join(', ');
      const countryFilter = countryCode ? `&countrycodes=${countryCode.toLowerCase()}` : '';
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}${countryFilter}&limit=1`,
        {
          headers: {
            'Accept-Language': 'fr',
            'User-Agent': 'LaZone-App/1.0',
          },
        }
      );
      
      if (!response.ok) throw new Error('Geocoding failed');
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        
        // Only update if coordinates are valid and different
        if (!isNaN(lat) && !isNaN(lng)) {
          setMarkerPosition({ lat, lng });
          console.log(`Geocoded "${query}" to: ${lat}, ${lng}`);
          
          if (showToast) {
            toast({
              title: '📍 Position trouvée',
              description: `Coordonnées mises à jour pour "${searchCity}"`,
            });
          }
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Use current GPS position
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  
  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Géolocalisation non disponible',
        description: 'Votre navigateur ne supporte pas la géolocalisation',
        variant: 'destructive',
      });
      return;
    }

    setIsGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        setMarkerPosition({ lat, lng });
        setIsGettingLocation(false);
        
        toast({
          title: '📍 Position GPS obtenue',
          description: 'La carte a été mise à jour avec votre position actuelle',
        });
        
        // Auto-open map to show the new position
        if (!showMap) {
          setShowMap(true);
        }
      },
      (error) => {
        setIsGettingLocation(false);
        let errorMessage = 'Impossible d\'obtenir votre position';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Veuillez autoriser l\'accès à votre position';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Position non disponible';
            break;
          case error.TIMEOUT:
            errorMessage = 'Délai d\'attente dépassé';
            break;
        }
        
        toast({
          title: 'Erreur de géolocalisation',
          description: errorMessage,
          variant: 'destructive',
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Trigger geocoding when city changes (including custom cities)
  useEffect(() => {
    if (!city || city.length < 2 || !selectedCountry) return;
    
    // Clear previous timeout
    if (geocodeTimeoutRef.current) {
      clearTimeout(geocodeTimeoutRef.current);
    }
    
    // Debounce geocoding - use shorter delay for custom city input
    const delay = isCustomCity ? 1000 : 500;
    geocodeTimeoutRef.current = setTimeout(() => {
      geocodeAddress(address, city, selectedCountry, !isCustomCity);
    }, delay);
    
    return () => {
      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current);
      }
    };
  }, [city, selectedCountry, isCustomCity]);

  // Trigger geocoding when address changes (with longer debounce)
  useEffect(() => {
    if (!address || address.length < 3 || !city || city.length < 2 || !selectedCountry) return;
    
    // Clear previous timeout
    if (geocodeTimeoutRef.current) {
      clearTimeout(geocodeTimeoutRef.current);
    }
    
    // Debounce geocoding with longer delay for address
    geocodeTimeoutRef.current = setTimeout(() => {
      geocodeAddress(address, city, selectedCountry);
    }, 800);
    
    return () => {
      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current);
      }
    };
  }, [address]);

  const showBedroomsBathrooms = propertyType === 'house' || propertyType === 'apartment';
  const showAmenities = propertyType !== 'land';
  const showDocuments = !isResidence && (propertyType === 'land' || transactionType === 'sale');
  const showRentDetails = transactionType === 'rent' && propertyType !== 'land' && !isResidence;
  const showShortTermDetails = isResidence && propertyType !== 'land';
  const showArea = !isResidence; // Cacher superficie en mode Residence
  const showRestrictions = isResidence; // Afficher restrictions en mode Residence

  const validateField = (field: string, value: string) => {
    const newErrors = { ...errors };
    
    switch (field) {
      case 'title':
        if (!value || value.length < 5) {
          newErrors.title = 'Le titre doit contenir au moins 5 caractères';
        } else if (value.length > 100) {
          newErrors.title = 'Le titre ne peut pas dépasser 100 caractères';
        } else {
          delete newErrors.title;
        }
        break;
      case 'address':
        if (!value || value.length < 3) {
          newErrors.address = 'L\'adresse doit contenir au moins 3 caractères';
        } else {
          delete newErrors.address;
        }
        break;
      case 'city':
        if (!value || value.length < 2) {
          newErrors.city = 'La ville doit contenir au moins 2 caractères';
        } else {
          delete newErrors.city;
        }
        break;
      case 'price':
        if (!value || isNaN(Number(value)) || Number(value) <= 0) {
          newErrors.price = 'Veuillez entrer un prix valide';
        } else {
          delete newErrors.price;
        }
        break;
      case 'area':
        if (!value || isNaN(Number(value)) || Number(value) <= 0) {
          newErrors.area = 'Veuillez entrer une superficie valide';
        } else {
          delete newErrors.area;
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newFiles = Array.from(files).slice(0, 6 - images.length);
    const newUrls = newFiles.map(file => URL.createObjectURL(file));
    
    setImages(prev => [...prev, ...newFiles]);
    setImageUrls(prev => [...prev, ...newUrls]);
    
    if (newFiles.length > 0) {
      setErrors(prev => {
        const { images, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleTakePhoto = async () => {
    const photo = await takePicture();
    if (photo?.webPath) {
      const response = await fetch(photo.webPath);
      const blob = await response.blob();
      const file = new File([blob], `property-${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      if (images.length < 6) {
        const url = URL.createObjectURL(file);
        setImages(prev => [...prev, file]);
        setImageUrls(prev => [...prev, url]);
        setErrors(prev => {
          const { images, ...rest } = prev;
          return rest;
        });
      }
    }
  };

  const handlePickMultiple = async () => {
    const photos = await pickMultiple(6 - images.length);
    if (photos && photos.length > 0) {
      const newFiles: File[] = [];
      const newUrls: string[] = [];
      
      for (const photo of photos) {
        if (photo.webPath) {
          const response = await fetch(photo.webPath);
          const blob = await response.blob();
          const file = new File([blob], `property-${Date.now()}-${newFiles.length}.jpg`, { type: 'image/jpeg' });
          const url = URL.createObjectURL(file);
          newFiles.push(file);
          newUrls.push(url);
        }
      }
      
      setImages(prev => [...prev, ...newFiles].slice(0, 6));
      setImageUrls(prev => [...prev, ...newUrls].slice(0, 6));
      
      if (newFiles.length > 0) {
        setErrors(prev => {
          const { images, ...rest } = prev;
          return rest;
        });
      }
    }
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imageUrls[index]);
    setImages(prev => prev.filter((_, i) => i !== index));
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev => 
      prev.includes(amenity) 
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  const toggleDocument = (docId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(docId) 
        ? prev.filter(d => d !== docId)
        : [...prev, docId]
    );
  };

  const toggleRestriction = (restrictionId: string) => {
    setSelectedRestrictions(prev => 
      prev.includes(restrictionId) 
        ? prev.filter(r => r !== restrictionId)
        : [...prev, restrictionId]
    );
  };

  const handleMarkerPositionChange = (lat: number, lng: number) => {
    setMarkerPosition({ lat, lng });
  };

  const validateForm = () => {
    const newErrors: FormErrors = {};
    
    if (images.length === 0) {
      newErrors.images = 'Veuillez ajouter au moins une photo';
    }
    
    if (!title || title.length < 5) {
      newErrors.title = 'Le titre doit contenir au moins 5 caractères';
    }
    
    if (!address || address.length < 3) {
      newErrors.address = 'L\'adresse doit contenir au moins 3 caractères';
    }
    
    if (!city || city.length < 2) {
      newErrors.city = 'La ville doit contenir au moins 2 caractères';
    }
    
    // En mode Residence, valider le prix par nuit au lieu du prix normal
    if (isResidence) {
      if (!pricePerNight || isNaN(Number(pricePerNight)) || Number(pricePerNight) <= 0) {
        newErrors.price = 'Veuillez entrer un prix par nuit valide';
      }
    } else {
      if (!price || isNaN(Number(price)) || Number(price) <= 0) {
        newErrors.price = 'Veuillez entrer un prix valide';
      }
    }
    
    // Superficie requise seulement en mode LaZone
    if (!isResidence && (!area || isNaN(Number(area)) || Number(area) <= 0)) {
      newErrors.area = 'Veuillez entrer une superficie valide';
    }
    
    setErrors(newErrors);
    setTouched({
      title: true,
      address: true,
      city: true,
      price: true,
      area: true,
    });
    
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: 'Veuillez vous connecter', variant: 'destructive' });
      navigate('/auth');
      return;
    }

    // Wait for limit settings to load before proceeding
    if (limitLoading) {
      toast({ 
        title: 'Chargement en cours', 
        description: 'Veuillez patienter...',
      });
      return;
    }

    if (!validateForm()) {
      toast({ 
        title: 'Formulaire incomplet', 
        description: 'Veuillez corriger les erreurs avant de publier',
        variant: 'destructive' 
      });
      return;
    }

    // Content filtering check
    const contentCheck = filterMultipleFields({
      title: title.trim(),
      description: description.trim(),
      address: address.trim(),
    });

    if (!contentCheck.isClean) {
      toast({ 
        title: 'Contenu inapproprié détecté', 
        description: getContentViolationMessage(contentCheck.allFlaggedWords),
        variant: 'destructive' 
      });
      return;
    }

    setLoading(true);
    try {
      // Determine if this property should be active immediately or pending payment
      const shouldBeActive = !needsPayment || canUseCredit || hasPaid;
      
      // Create property with coordinates and country code
      // In Residence mode, use pricePerNight as the main price if price is not set
      const finalPrice = isResidence && !price && pricePerNight 
        ? parseFloat(pricePerNight) 
        : parseFloat(price) || 0;
      
      // In Residence mode, area is optional
      const finalArea = isResidence ? (parseFloat(area) || 0) : parseFloat(area);

      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          address: address.trim(),
          city: city.trim(),
          postal_code: postalCode.trim(),
          price: finalPrice,
          area: finalArea,
          property_type: propertyType,
          type: transactionType,
          listing_type: isResidence ? 'short_term' : 'long_term',
          bedrooms: showBedroomsBathrooms ? parseInt(bedrooms) || 0 : null,
          bathrooms: showBedroomsBathrooms ? parseInt(bathrooms) || 0 : null,
          features: [
            ...selectedAmenities, 
            ...selectedDocuments.map(d => DOCUMENTS.find(doc => doc.id === d)?.label || d),
            ...selectedRestrictions.map(r => RESIDENCE_RESTRICTIONS.find(res => res.id === r)?.label || r)
          ],
          whatsapp_enabled: whatsappEnabled,
          country: selectedCountry,
          lat: markerPosition.lat,
          lng: markerPosition.lng,
          // Short-term specific fields
          price_per_night: isResidence ? parseFloat(pricePerNight) || null : null,
          minimum_stay: isResidence ? parseInt(minimumStay) || 1 : null,
          // Discount packages
          discount_3_nights: isResidence && discount3Nights ? parseFloat(discount3Nights) : null,
          discount_5_nights: isResidence && discount5Nights ? parseFloat(discount5Nights) : null,
          discount_7_nights: isResidence && discount7Nights ? parseFloat(discount7Nights) : null,
          discount_14_nights: isResidence && discount14Nights ? parseFloat(discount14Nights) : null,
          discount_30_nights: isResidence && discount30Nights ? parseFloat(discount30Nights) : null,
          // Commercial specific - Pas de porte
          pas_de_porte: propertyType === 'commercial' && transactionType === 'rent' && hasPasDePorte && pasDePorteAmount 
            ? parseFloat(pasDePorteAmount) 
            : null,
          // Set is_active based on payment status
          is_active: shouldBeActive,
        })
        .select()
        .single();

      if (propertyError) throw propertyError;

      // Upload images first (needed for both paid and pending)
      for (let i = 0; i < images.length; i++) {
        const file = images[i];
        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/${property.id}/${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('property-images')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('property-images')
          .getPublicUrl(filePath);

        await supabase
          .from('property_images')
          .insert({
            property_id: property.id,
            url: publicUrl,
            is_primary: i === 0,
            display_order: i,
          });
      }

      // If user needs to pay and has no credits, redirect to credits page
      if (needsPayment && !canUseCredit && !hasPaid) {
        setLoading(false);
        setPendingPropertyId(property.id);
        toast({ 
          title: 'Crédits insuffisants', 
          description: 'Votre annonce est en attente. Veuillez acheter des crédits pour la publier.',
        });
        navigate('/credits');
        return;
      }

      // If user used a credit (exceeded limit but had validated payment), associate it
      if (canUseCredit && property.id) {
        const creditUsed = await useCredit(property.id);
        if (creditUsed) {
          console.log('Credit used for property:', property.id);
        }
      }

      toast({ title: 'Annonce publiée avec succès!' });
      navigate('/profile');
    } catch (error) {
      console.error('Error publishing property:', error);
      toast({ title: 'Erreur lors de la publication', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentComplete = () => {
    setHasPaid(true);
    refetchLimits();
    toast({ 
      title: 'Demande de paiement enregistrée',
      description: 'Votre annonce sera publiée après validation du paiement par un administrateur',
    });
    navigate('/profile');
  };

  const ErrorMessage = ({ message }: { message?: string }) => {
    if (!message) return null;
    return (
      <div className="flex items-center gap-1 text-destructive text-sm mt-1">
        <AlertCircle className="w-3 h-3" />
        <span>{message}</span>
      </div>
    );
  };

  // Login prompt for unauthenticated users
  if (!user) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBg3})` }}
        />
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/30 to-background/70" />
        
        <div 
          className="relative z-10 flex flex-col items-center justify-center min-h-[70vh] px-6"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          {/* Animated illustration */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative mb-8 overflow-visible"
          >
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center backdrop-blur-sm border border-primary/10">
              <motion.div
                animate={{ 
                  y: [0, -8, 0],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
              >
                <Home className="w-16 h-16 text-primary" strokeWidth={1.5} />
              </motion.div>
            </div>
            {/* Decorative bubbles - kept within bounds */}
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary/30" />
            <div className="absolute bottom-1 -left-2 w-3 h-3 rounded-full bg-primary/20" />
          </motion.div>

          {/* Title and subtitle */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-8"
          >
            <h2 className="font-display text-2xl font-bold mb-2">Publiez votre bien</h2>
            <p className="text-muted-foreground">Connectez-vous pour créer votre annonce</p>
          </motion.div>

          {/* Features list */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-5 w-full max-w-sm mb-8"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Camera className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Photos illimitées</p>
                  <p className="text-xs text-muted-foreground">Jusqu'à 6 photos par annonce</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Géolocalisation</p>
                  <p className="text-xs text-muted-foreground">Positionnez sur la carte</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">100% Gratuit</p>
                  <p className="text-xs text-muted-foreground">Aucun frais de publication</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="w-full max-w-sm"
          >
            <Button 
              onClick={() => navigate('/auth')} 
              className="w-full h-12 text-base font-semibold"
              size="lg"
            >
              Se connecter
            </Button>
            <p className="text-center text-xs text-muted-foreground mt-3">
              Pas encore de compte ? <button onClick={() => navigate('/auth')} className="text-primary font-medium">Créer un compte</button>
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  // Email verification required
  if (!isEmailVerified) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBg3})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/30 to-background/70" />
        <div className="relative z-10">
          <EmailVerificationRequired 
            title="Vérifiez votre email"
            description="Pour publier une annonce, vous devez d'abord vérifier votre adresse email."
            icon={<Home className="w-16 h-16 text-amber-500" strokeWidth={1.5} />}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-32">
      {/* Header */}
      <div
        className="bg-gradient-to-r from-primary via-primary to-primary/80 text-primary-foreground px-4 pb-6"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}
      >
        <h1 className="font-display text-2xl font-bold">
          {isResidence ? 'Publier un hébergement' : 'Publier une annonce'}
        </h1>
        <p className="text-primary-foreground/80 text-sm mt-1">
          {isResidence 
            ? 'Proposez votre logement en location courte durée' 
            : 'Vendez ou louez votre propriété'}
        </p>
        
        {/* Credits and listings info */}
        <div className="mt-3 flex flex-wrap gap-2" data-tutorial="publish-credits">
          {/* Show subscription info for subscribers */}
          {hasActiveSubscription && (
            <Badge className="bg-green-500 text-white border-green-400">
              <Check className="w-3 h-3 mr-1" />
              {subscriptionType === 'premium' ? 'Premium' : 'Pro'}: {availableCredits} crédit{availableCredits > 1 ? 's' : ''} restant{availableCredits > 1 ? 's' : ''}
            </Badge>
          )}
          {/* Show remaining free listings for non-subscribers who haven't exceeded limit */}
          {!hasActiveSubscription && remainingFreeListings > 0 && (
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              {remainingFreeListings} annonce{remainingFreeListings > 1 ? 's' : ''} gratuite{remainingFreeListings > 1 ? 's' : ''} restante{remainingFreeListings > 1 ? 's' : ''}
            </Badge>
          )}
          {/* Show available credits for non-subscribers with credits */}
          {!hasActiveSubscription && canUseCredit && (
            <Badge className="bg-green-500 text-white border-green-400 animate-pulse">
              <Check className="w-3 h-3 mr-1" />
              {availableCredits} crédit{availableCredits > 1 ? 's' : ''} disponible{availableCredits > 1 ? 's' : ''}
            </Badge>
          )}
          {needsPayment && !canUseCredit && (
            <Badge variant="secondary" className="bg-amber-500/20 text-amber-100 border-amber-400/30">
              <Wallet className="w-3 h-3 mr-1" />
              Paiement requis
            </Badge>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Photo Upload Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-4 shadow-sm"
          data-tutorial="publish-photos"
        >
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            Photos <span className="text-destructive">*</span>
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {imageUrls.map((url, index) => (
              <div key={index} className="relative aspect-square rounded-xl overflow-hidden">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 p-1 bg-destructive rounded-full text-white"
                >
                  <X className="w-3 h-3" />
                </button>
                {index === 0 && (
                  <span className="absolute bottom-1 left-1 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                    Principal
                  </span>
                )}
              </div>
            ))}
            {images.length < 6 && (
              isNativePlatform() ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors ${
                      errors.images ? 'border-destructive text-destructive' : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
                    }`}>
                      {cameraLoading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <Plus className="w-6 h-6" />
                      )}
                      <span className="text-xs">Ajouter</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center">
                    <DropdownMenuItem onClick={handleTakePhoto} className="gap-2">
                      <Camera className="w-4 h-4" />
                      Prendre une photo
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handlePickMultiple} className="gap-2">
                      <Image className="w-4 h-4" />
                      Choisir de la galerie
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <label className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
                  errors.images ? 'border-destructive text-destructive' : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
                }`}>
                  <Plus className="w-6 h-6" />
                  <span className="text-xs">Ajouter</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )
            )}
            {Array.from({ length: Math.max(0, 5 - images.length) }).map((_, i) => (
              <div
                key={`placeholder-${i}`}
                className="aspect-square rounded-xl bg-muted/50 flex items-center justify-center"
              >
                <Upload className="w-5 h-5 text-muted-foreground/50" />
              </div>
            ))}
          </div>
          <ErrorMessage message={errors.images} />
        </motion.div>

        {/* Property Type */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl p-4 shadow-sm"
          data-tutorial="publish-details"
        >
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Home className="w-5 h-5 text-primary" />
            Type de propriété
          </h3>
          <div className={`grid ${isResidence ? 'grid-cols-2' : 'grid-cols-2'} gap-2`}>
            {[
              { value: 'house', icon: '🏠', label: 'Maison' },
              { value: 'apartment', icon: '🏢', label: 'Appartement' },
              ...(isResidence ? [] : [
                { value: 'land', icon: '🌳', label: 'Terrain' },
                { value: 'commercial', icon: '🏪', label: 'Commercial' },
              ]),
            ].map((type) => (
              <button
                key={type.value}
                onClick={() => setPropertyType(type.value as PropertyType)}
                className={`p-3 rounded-xl flex items-center gap-2 justify-center transition-all ${
                  propertyType === type.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                <span>{type.icon}</span>
                <span className="font-medium">{type.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Transaction Type - Hidden in Residence mode */}
        {!isResidence && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-card rounded-2xl p-4 shadow-sm"
          >
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Type de transaction
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTransactionType('sale')}
                className={`p-3 rounded-xl font-medium transition-all ${
                  transactionType === 'sale'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                À vendre
              </button>
              <button
                onClick={() => setTransactionType('rent')}
                className={`p-3 rounded-xl font-medium transition-all ${
                  transactionType === 'rent'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                À louer
              </button>
            </div>
          </motion.div>
        )}

        {/* Title and Description */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl p-4 shadow-sm space-y-3"
        >
          <div>
            <Label htmlFor="title">Titre de l'annonce <span className="text-destructive">*</span></Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (touched.title) validateField('title', e.target.value);
              }}
              onBlur={() => {
                handleBlur('title');
                validateField('title', title);
              }}
              placeholder="Ex: Belle villa avec piscine"
              className={`mt-1 ${errors.title && touched.title ? 'border-destructive' : ''}`}
            />
            {touched.title && <ErrorMessage message={errors.title} />}
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez votre propriété..."
              className="mt-1 min-h-[100px]"
            />
          </div>
        </motion.div>

        {/* Price - Different for Residence mode */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-4 shadow-sm"
        >
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            {isResidence ? 'Prix par nuit' : `Prix ${transactionType === 'rent' ? 'du loyer mensuel' : ''}`} <span className="text-destructive">*</span>
          </h3>
          {isResidence ? (
            <>
              <div className="relative">
                <Input
                  type="number"
                  value={pricePerNight}
                  onChange={(e) => setPricePerNight(e.target.value)}
                  placeholder="0"
                  className="pr-16 text-lg font-bold"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  FCFA
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Moon className="w-3 h-3" /> Prix pour une nuit
              </p>
            </>
          ) : (
            <>
              <div className="relative">
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    if (touched.price) validateField('price', e.target.value);
                  }}
                  onBlur={() => {
                    handleBlur('price');
                    validateField('price', price);
                  }}
                  placeholder="0"
                  className={`pr-16 text-lg font-bold ${errors.price && touched.price ? 'border-destructive' : ''}`}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  FCFA
                </span>
              </div>
              {touched.price && <ErrorMessage message={errors.price} />}
              {transactionType === 'rent' && (
                <p className="text-xs text-muted-foreground mt-2">
                  Prix par mois
                </p>
              )}
            </>
          )}
        </motion.div>

        {/* Minimum Stay - Only for Residence mode */}
        {showShortTermDetails && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl p-4 shadow-sm"
          >
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Séjour minimum
            </h3>
            <Select value={minimumStay} onValueChange={setMinimumStay}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent className="bg-card border shadow-lg z-50">
                {[1, 2, 3, 5, 7, 14, 30].map(n => (
                  <SelectItem key={n} value={n.toString()}>
                    {n} {n === 1 ? 'nuit' : 'nuits'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              Durée minimum de réservation
            </p>
          </motion.div>
        )}

        {/* Discount Packages - Only for Residence mode */}
        {showShortTermDetails && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl p-4 shadow-sm"
          >
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              🏷️ Forfaits & Rabais
              <span className="text-xs font-normal text-muted-foreground">(optionnel)</span>
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Sélectionnez un forfait et définissez le pourcentage de réduction
            </p>
            
            <div className="space-y-3">
              {/* Dropdown to select discount tier */}
              <div className="flex items-center gap-3">
                <Select 
                  value={
                    discount30Nights ? '30' : 
                    discount14Nights ? '14' : 
                    discount7Nights ? '7' : 
                    discount5Nights ? '5' : 
                    discount3Nights ? '3' : ''
                  }
                  onValueChange={(value) => {
                    // Reset all discounts
                    setDiscount3Nights('');
                    setDiscount5Nights('');
                    setDiscount7Nights('');
                    setDiscount14Nights('');
                    setDiscount30Nights('');
                    // Set a default value for the selected tier
                    if (value === '3') setDiscount3Nights('5');
                    else if (value === '5') setDiscount5Nights('10');
                    else if (value === '7') setDiscount7Nights('15');
                    else if (value === '14') setDiscount14Nights('20');
                    else if (value === '30') setDiscount30Nights('25');
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Choisir un forfait" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border shadow-lg z-50">
                    <SelectItem value="none">Aucun rabais</SelectItem>
                    <SelectItem value="3">À partir de 3 nuits</SelectItem>
                    <SelectItem value="5">À partir de 5 nuits</SelectItem>
                    <SelectItem value="7">À partir de 7 nuits</SelectItem>
                    <SelectItem value="14">À partir de 14 nuits</SelectItem>
                    <SelectItem value="30">À partir de 30 nuits</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Input for the selected discount percentage */}
              {(discount3Nights || discount5Nights || discount7Nights || discount14Nights || discount30Nights) && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl"
                >
                  <span className="text-sm flex-1">
                    Rabais pour {
                      discount30Nights ? '30+ nuits' : 
                      discount14Nights ? '14+ nuits' : 
                      discount7Nights ? '7+ nuits' : 
                      discount5Nights ? '5+ nuits' : 
                      '3+ nuits'
                    }
                  </span>
                  <div className="relative w-20">
                    <Input
                      type="number"
                      min="1"
                      max="50"
                      value={discount30Nights || discount14Nights || discount7Nights || discount5Nights || discount3Nights}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (discount30Nights) setDiscount30Nights(val);
                        else if (discount14Nights) setDiscount14Nights(val);
                        else if (discount7Nights) setDiscount7Nights(val);
                        else if (discount5Nights) setDiscount5Nights(val);
                        else if (discount3Nights) setDiscount3Nights(val);
                      }}
                      placeholder="0"
                      className="pr-6 text-center font-bold"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                  </div>
                </motion.div>
              )}

              {/* Multiple discounts toggle */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" />
                    Ajouter plusieurs forfaits
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3 bg-card border shadow-lg z-50">
                  <p className="text-xs font-medium mb-3">Définir plusieurs forfaits</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="d3" 
                        checked={!!discount3Nights} 
                        onCheckedChange={(checked) => setDiscount3Nights(checked ? '5' : '')}
                      />
                      <Label htmlFor="d3" className="text-xs flex-1 cursor-pointer">3+ nuits</Label>
                      {discount3Nights && (
                        <div className="relative w-16">
                          <Input
                            type="number"
                            min="1"
                            max="50"
                            value={discount3Nights}
                            onChange={(e) => setDiscount3Nights(e.target.value)}
                            className="h-7 pr-5 text-xs text-center"
                          />
                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="d5" 
                        checked={!!discount5Nights} 
                        onCheckedChange={(checked) => setDiscount5Nights(checked ? '10' : '')}
                      />
                      <Label htmlFor="d5" className="text-xs flex-1 cursor-pointer">5+ nuits</Label>
                      {discount5Nights && (
                        <div className="relative w-16">
                          <Input
                            type="number"
                            min="1"
                            max="50"
                            value={discount5Nights}
                            onChange={(e) => setDiscount5Nights(e.target.value)}
                            className="h-7 pr-5 text-xs text-center"
                          />
                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="d7" 
                        checked={!!discount7Nights} 
                        onCheckedChange={(checked) => setDiscount7Nights(checked ? '15' : '')}
                      />
                      <Label htmlFor="d7" className="text-xs flex-1 cursor-pointer">7+ nuits</Label>
                      {discount7Nights && (
                        <div className="relative w-16">
                          <Input
                            type="number"
                            min="1"
                            max="50"
                            value={discount7Nights}
                            onChange={(e) => setDiscount7Nights(e.target.value)}
                            className="h-7 pr-5 text-xs text-center"
                          />
                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="d14" 
                        checked={!!discount14Nights} 
                        onCheckedChange={(checked) => setDiscount14Nights(checked ? '20' : '')}
                      />
                      <Label htmlFor="d14" className="text-xs flex-1 cursor-pointer">14+ nuits</Label>
                      {discount14Nights && (
                        <div className="relative w-16">
                          <Input
                            type="number"
                            min="1"
                            max="50"
                            value={discount14Nights}
                            onChange={(e) => setDiscount14Nights(e.target.value)}
                            className="h-7 pr-5 text-xs text-center"
                          />
                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="d30" 
                        checked={!!discount30Nights} 
                        onCheckedChange={(checked) => setDiscount30Nights(checked ? '25' : '')}
                      />
                      <Label htmlFor="d30" className="text-xs flex-1 cursor-pointer">30+ nuits</Label>
                      {discount30Nights && (
                        <div className="relative w-16">
                          <Input
                            type="number"
                            min="1"
                            max="50"
                            value={discount30Nights}
                            onChange={(e) => setDiscount30Nights(e.target.value)}
                            className="h-7 pr-5 text-xs text-center"
                          />
                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
                        </div>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Preview of discounts */}
            {(discount3Nights || discount5Nights || discount7Nights || discount14Nights || discount30Nights) && pricePerNight && (
              <div className="mt-4 p-3 bg-primary/5 rounded-xl">
                <p className="text-xs font-medium text-primary mb-2">Aperçu des prix avec rabais :</p>
                <div className="space-y-1 text-xs">
                  {discount3Nights && (
                    <p>3+ nuits : <span className="font-semibold">{Math.round(Number(pricePerNight) * (1 - Number(discount3Nights) / 100)).toLocaleString()}</span>/nuit <span className="text-primary">(-{discount3Nights}%)</span></p>
                  )}
                  {discount5Nights && (
                    <p>5+ nuits : <span className="font-semibold">{Math.round(Number(pricePerNight) * (1 - Number(discount5Nights) / 100)).toLocaleString()}</span>/nuit <span className="text-primary">(-{discount5Nights}%)</span></p>
                  )}
                  {discount7Nights && (
                    <p>7+ nuits : <span className="font-semibold">{Math.round(Number(pricePerNight) * (1 - Number(discount7Nights) / 100)).toLocaleString()}</span>/nuit <span className="text-primary">(-{discount7Nights}%)</span></p>
                  )}
                  {discount14Nights && (
                    <p>14+ nuits : <span className="font-semibold">{Math.round(Number(pricePerNight) * (1 - Number(discount14Nights) / 100)).toLocaleString()}</span>/nuit <span className="text-primary">(-{discount14Nights}%)</span></p>
                  )}
                  {discount30Nights && (
                    <p>30+ nuits : <span className="font-semibold">{Math.round(Number(pricePerNight) * (1 - Number(discount30Nights) / 100)).toLocaleString()}</span>/nuit <span className="text-primary">(-{discount30Nights}%)</span></p>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Location with Country and City Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card rounded-2xl p-4 shadow-sm"
          data-tutorial="publish-location"
        >
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Localisation
          </h3>
          <div className="space-y-3">
            {/* Country Selector */}
            <div>
              <Label>Pays</Label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner un pays" />
                </SelectTrigger>
                <SelectContent className="bg-card border shadow-lg z-50 max-h-64">
                  {africanCountries.map(country => (
                    <SelectItem key={country.code} value={country.code}>
                      <div className="flex items-center gap-2">
                        <img 
                          src={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png`}
                          alt={country.name}
                          className="w-5 h-4 object-cover rounded-sm"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <span>{country.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* City Selector */}
            <div>
              <Label htmlFor="city">Ville <span className="text-destructive">*</span></Label>
              {isCustomCity ? (
                <div className="space-y-2">
                  <Input
                    id="customCity"
                    value={customCity}
                    onChange={(e) => {
                      setCustomCity(e.target.value);
                      setCity(e.target.value);
                    }}
                    placeholder="Entrez le nom de la ville"
                    className={`mt-1 ${errors.city && touched.city ? 'border-destructive' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomCity(false);
                      setCustomCity('');
                      setCity('');
                    }}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    ← Retour à la liste des villes
                  </button>
                </div>
              ) : (
                <Select 
                  value={city} 
                  onValueChange={(value) => {
                    if (value === '__custom__') {
                      setIsCustomCity(true);
                      setCity('');
                    } else {
                      setCity(value);
                    }
                  }} 
                  disabled={!selectedCountry}
                >
                  <SelectTrigger className={`mt-1 ${errors.city && touched.city ? 'border-destructive' : ''}`}>
                    <SelectValue placeholder={selectedCountry ? "Sélectionner une ville" : "Sélectionnez d'abord un pays"} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border shadow-lg z-50 max-h-64">
                    {availableCities.map(cityName => (
                      <SelectItem key={cityName} value={cityName}>
                        {cityName}
                      </SelectItem>
                    ))}
                    <SelectItem value="__custom__" className="text-primary font-medium border-t mt-1 pt-2">
                      <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Ajouter une autre ville
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
              {touched.city && <ErrorMessage message={errors.city} />}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <Label htmlFor="address">Quartier <span className="text-destructive">*</span></Label>
                {isGeocoding && (
                  <span className="flex items-center gap-1 text-xs text-primary animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Localisation...
                  </span>
                )}
              </div>
              <Input
                id="address"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  if (touched.address) validateField('address', e.target.value);
                }}
                onBlur={() => {
                  handleBlur('address');
                  validateField('address', address);
                }}
                placeholder="Nom du quartier..."
                className={`mt-1 ${errors.address && touched.address ? 'border-destructive' : ''}`}
              />
              {touched.address && <ErrorMessage message={errors.address} />}
              <p className="text-xs text-muted-foreground mt-1">
                📍 La position sur la carte se met à jour automatiquement
              </p>
            </div>
            
            <div>
              <Label htmlFor="postalCode">Code postal</Label>
              <Input
                id="postalCode"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="Code postal"
                className="mt-1"
              />
            </div>

            {/* Map Toggle Button and GPS Button */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowMap(!showMap)}
                className="flex-1 flex items-center gap-2"
              >
                <Map className="w-4 h-4" />
                {showMap ? 'Masquer la carte' : 'Carte'}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={handleUseCurrentLocation}
                disabled={isGettingLocation}
                className="flex items-center gap-2"
              >
                {isGettingLocation ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Navigation className="w-4 h-4" />
                )}
                Ma position
              </Button>
            </div>

            {/* Interactive Map */}
            {showMap && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Cliquez ou glissez le marqueur pour définir la position exacte
                </p>
                <LocationMapPicker
                  position={markerPosition}
                  onPositionChange={handleMarkerPositionChange}
                  countryCode={selectedCountry}
                />
                <p className="text-xs text-muted-foreground">
                  Position: {markerPosition.lat.toFixed(4)}, {markerPosition.lng.toFixed(4)}
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Surface Area - Hidden in Residence mode */}
        {showArea && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card rounded-2xl p-4 shadow-sm"
          >
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Maximize className="w-5 h-5 text-primary" />
              Superficie <span className="text-destructive">*</span>
            </h3>
            <div className="relative">
              <Input
                type="number"
                value={area}
                onChange={(e) => {
                  setArea(e.target.value);
                  if (touched.area) validateField('area', e.target.value);
                }}
                onBlur={() => {
                  handleBlur('area');
                  validateField('area', area);
                }}
                placeholder="0"
                className={`pr-12 ${errors.area && touched.area ? 'border-destructive' : ''}`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">m²</span>
            </div>
            {touched.area && <ErrorMessage message={errors.area} />}
          </motion.div>
        )}

        {/* Bedrooms and Bathrooms - Only for house/apartment */}
        {showBedroomsBathrooms && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl p-4 shadow-sm"
          >
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Bed className="w-5 h-5 text-primary" />
              Chambres et Salles de bain
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bedrooms" className="flex items-center gap-2">
                  <Bed className="w-4 h-4" /> Chambres
                </Label>
                <Select value={bedrooms} onValueChange={setBedrooms}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Nombre" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border shadow-lg z-50">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="bathrooms" className="flex items-center gap-2">
                  <Bath className="w-4 h-4" /> Salles de bain
                </Label>
                <Select value={bathrooms} onValueChange={setBathrooms}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Nombre" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border shadow-lg z-50">
                    {[0, 1, 2, 3, 4, 5, 6].map(n => (
                      <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>
        )}

        {/* Amenities Dropdown - For house/apartment/commercial */}
        {showAmenities && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl p-4 shadow-sm"
          >
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Check className="w-5 h-5 text-primary" />
              Commodités disponibles
            </h3>
            <Popover open={amenitiesOpen} onOpenChange={setAmenitiesOpen}>
              <PopoverTrigger asChild>
                <button className="w-full flex items-center justify-between p-3 rounded-xl border bg-background hover:bg-muted/50 transition-colors">
                  <span className={selectedAmenities.length > 0 ? 'text-foreground' : 'text-muted-foreground'}>
                    {selectedAmenities.length > 0 
                      ? `${selectedAmenities.length} commodité(s) sélectionnée(s)`
                      : 'Sélectionner les commodités'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${amenitiesOpen ? 'rotate-180' : ''}`} />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[calc(100vw-2rem)] max-w-md p-0 bg-card border shadow-lg z-50" align="start">
                <div className="max-h-64 overflow-y-auto p-2">
                  {(isResidence ? RESIDENCE_AMENITIES : AMENITIES).map(amenity => (
                    <label
                      key={amenity}
                      className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                    >
                      <Checkbox
                        checked={selectedAmenities.includes(amenity)}
                        onCheckedChange={() => toggleAmenity(amenity)}
                      />
                      <span className="text-sm">{amenity}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            {selectedAmenities.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedAmenities.map(amenity => (
                  <span
                    key={amenity}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
                  >
                    {amenity}
                    <button onClick={() => toggleAmenity(amenity)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Documents Dropdown - For land or sale */}
        {showDocuments && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl p-4 shadow-sm"
          >
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Documents disponibles
            </h3>
            <Popover open={documentsOpen} onOpenChange={setDocumentsOpen}>
              <PopoverTrigger asChild>
                <button className="w-full flex items-center justify-between p-3 rounded-xl border bg-background hover:bg-muted/50 transition-colors">
                  <span className={selectedDocuments.length > 0 ? 'text-foreground' : 'text-muted-foreground'}>
                    {selectedDocuments.length > 0 
                      ? `${selectedDocuments.length} document(s) sélectionné(s)`
                      : 'Sélectionner les documents'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${documentsOpen ? 'rotate-180' : ''}`} />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[calc(100vw-2rem)] max-w-md p-0 bg-card border shadow-lg z-50" align="start">
                <div className="max-h-64 overflow-y-auto p-2">
                  {DOCUMENTS.map(doc => (
                    <label
                      key={doc.id}
                      className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                    >
                      <Checkbox
                        checked={selectedDocuments.includes(doc.id)}
                        onCheckedChange={() => toggleDocument(doc.id)}
                      />
                      <span className="text-sm">{doc.label}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            {selectedDocuments.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedDocuments.map(docId => {
                  const doc = DOCUMENTS.find(d => d.id === docId);
                  return (
                    <span
                      key={docId}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
                    >
                      {doc?.label.split(' ')[0]}
                      <button onClick={() => toggleDocument(docId)}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Restrictions Dropdown - Only for Residence mode */}
        {showRestrictions && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl p-4 shadow-sm"
          >
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              🚫 Restrictions
            </h3>
            <Popover open={restrictionsOpen} onOpenChange={setRestrictionsOpen}>
              <PopoverTrigger asChild>
                <button className="w-full flex items-center justify-between p-3 rounded-xl border bg-background hover:bg-muted/50 transition-colors">
                  <span className={selectedRestrictions.length > 0 ? 'text-foreground' : 'text-muted-foreground'}>
                    {selectedRestrictions.length > 0 
                      ? `${selectedRestrictions.length} restriction(s) sélectionnée(s)`
                      : 'Définir les règles de la maison'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${restrictionsOpen ? 'rotate-180' : ''}`} />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[calc(100vw-2rem)] max-w-md p-0 bg-card border shadow-lg z-50" align="start">
                <div className="max-h-64 overflow-y-auto p-2">
                  {RESIDENCE_RESTRICTIONS.map(restriction => (
                    <label
                      key={restriction.id}
                      className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                    >
                      <Checkbox
                        checked={selectedRestrictions.includes(restriction.id)}
                        onCheckedChange={() => toggleRestriction(restriction.id)}
                      />
                      <span className="text-lg">{restriction.icon}</span>
                      <span className="text-sm">{restriction.label}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            {selectedRestrictions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedRestrictions.map(restrictionId => {
                  const restriction = RESIDENCE_RESTRICTIONS.find(r => r.id === restrictionId);
                  return (
                    <span
                      key={restrictionId}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-destructive/10 text-destructive rounded-full text-xs"
                    >
                      <span>{restriction?.icon}</span>
                      {restriction?.label}
                      <button onClick={() => toggleRestriction(restrictionId)}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Rent Details - Only for rent (excluding land) */}
        {showRentDetails && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl p-4 shadow-sm space-y-4"
          >
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Détails de la location
            </h3>
            
            <div>
              <Label>Durée du bail</Label>
              <Select value={leaseDuration} onValueChange={setLeaseDuration}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent className="bg-card border shadow-lg z-50">
                  {LEASE_DURATIONS.map(duration => (
                    <SelectItem key={duration.value} value={duration.value}>
                      {duration.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pas de porte - Only for commercial properties */}
            {propertyType === 'commercial' && (
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 rounded-xl border bg-background cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🔑</span>
                    <div>
                      <p className="font-medium text-sm">Pas de porte</p>
                      <p className="text-xs text-muted-foreground">Frais d'entrée pour le local</p>
                    </div>
                  </div>
                  <Checkbox
                    checked={hasPasDePorte}
                    onCheckedChange={(checked) => {
                      setHasPasDePorte(checked === true);
                      if (!checked) setPasDePorteAmount('');
                    }}
                  />
                </label>
                
                {hasPasDePorte && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="pl-4"
                  >
                    <Label>Montant du pas de porte</Label>
                    <div className="relative mt-1">
                      <Input
                        type="number"
                        value={pasDePorteAmount}
                        onChange={(e) => setPasDePorteAmount(e.target.value)}
                        placeholder="0"
                        className="pr-16"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                        FCFA
                      </span>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            <div className={propertyType === 'commercial' && hasPasDePorte ? 'opacity-50' : ''}>
              <Label className="flex items-center gap-2">
                <Wallet className="w-4 h-4" /> Caution (nombre de mois)
              </Label>
              <Select 
                value={depositMonths} 
                onValueChange={setDepositMonths}
                disabled={propertyType === 'commercial' && hasPasDePorte}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent className="bg-card border shadow-lg z-50">
                  {[1, 2, 3, 4, 5, 6].map(n => (
                    <SelectItem key={n} value={n.toString()}>
                      {n} mois de loyer
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {propertyType === 'commercial' && hasPasDePorte && (
                <p className="text-xs text-muted-foreground mt-1">
                  Désactivé car pas de porte sélectionné
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Contact Options */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-4 shadow-sm"
        >
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            📱 Options de contact
          </h3>
          <label className="flex items-center justify-between p-3 rounded-xl border bg-background cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💬</span>
              <div>
                <p className="font-medium text-sm">Autoriser WhatsApp</p>
                <p className="text-xs text-muted-foreground">Les acheteurs pourront vous contacter via WhatsApp</p>
              </div>
            </div>
            <Checkbox
              checked={whatsappEnabled}
              onCheckedChange={(checked) => setWhatsappEnabled(checked === true)}
            />
          </label>
        </motion.div>

        {/* Submit Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-primary py-4 rounded-2xl text-primary-foreground font-semibold text-lg shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Publication en cours...
            </>
          ) : (
            'Publier l\'annonce'
          )}
        </motion.button>
      </div>

      {user && <SectionTutorialButton section="publish" />}

      {/* Payment Dialog */}
      <ListingPaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        price={priceForUser}
        freeListings={remainingFreeListings + userListingsCount}
        currentListings={userListingsCount}
        onPaymentComplete={handlePaymentComplete}
        listingType={isResidence ? 'short_term' : 'long_term'}
        propertyId={pendingPropertyId || undefined}
        onBeforeStripeRedirect={saveFormToStorage}
      />
    </div>
  );
};

export default PublishPage;
