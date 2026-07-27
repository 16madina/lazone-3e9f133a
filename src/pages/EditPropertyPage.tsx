import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Camera, MapPin, Home, DollarSign, Upload, Plus, X, 
  Bed, Bath, Maximize, FileText, Clock, Check,
  Loader2, AlertCircle, ChevronDown, Map, Image, Moon, ArrowLeft, Save
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAppMode } from '@/hooks/useAppMode';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
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
import { africanCountries } from '@/data/africanCountries';
import LocationMapPicker, { countryCoordinates } from '@/components/publish/LocationMapPicker';
import { useCamera, isNativePlatform } from '@/hooks/useNativePlugins';

type PropertyType = 'house' | 'apartment' | 'land' | 'commercial';
type TransactionType = 'sale' | 'rent';

const AMENITIES = [
  'Piscine', 'Jardin', 'Garage', 'Terrasse', 'Balcon', 'Cave',
  'Climatisation', 'Chauffage', 'Ascenseur', 'Gardien', 'Parking',
  'Cuisine équipée', 'Meublé', 'Internet', 'Eau chaude', 'Groupe électrogène'
];

const RESIDENCE_AMENITIES = [
  'Wifi', 'Climatisation', 'Télévision', 'Cuisine équipée', 'Machine à laver',
  'Sèche-linge', 'Fer à repasser', 'Piscine', 'Jacuzzi', 'Parking gratuit',
  'Petit-déjeuner inclus', 'Service de ménage', 'Draps fournis', 'Serviettes',
  'Espace de travail', 'Balcon', 'Terrasse', 'Jardin', 'Barbecue', 'Vue mer'
];

const EditPropertyPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { isResidence } = useAppMode();
  const { takePicture, pickMultiple, loading: cameraLoading } = useCamera();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [newImageUrls, setNewImageUrls] = useState<string[]>([]);
  
  // Form state
  const [propertyType, setPropertyType] = useState<PropertyType>('house');
  const [transactionType, setTransactionType] = useState<TransactionType>('sale');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [price, setPrice] = useState('');
  const [area, setArea] = useState('');
  const [listingType, setListingType] = useState<'long_term' | 'short_term'>('long_term');
  
  // Country and city selection
  const [selectedCountry, setSelectedCountry] = useState('');
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  
  // Map state
  const [showMap, setShowMap] = useState(false);
  const [markerPosition, setMarkerPosition] = useState({ lat: 5.3600, lng: -4.0083 });
  
  // House/Apartment specific
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  
  // Short-term specific
  const [pricePerNight, setPricePerNight] = useState('');
  const [minimumStay, setMinimumStay] = useState('1');
  
  // Discount packages
  const [discount3Nights, setDiscount3Nights] = useState('');
  const [discount5Nights, setDiscount5Nights] = useState('');
  const [discount7Nights, setDiscount7Nights] = useState('');
  const [discount14Nights, setDiscount14Nights] = useState('');
  const [discount30Nights, setDiscount30Nights] = useState('');

  // Contact options
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);

  // Popover states
  const [amenitiesOpen, setAmenitiesOpen] = useState(false);

  // Helper function to normalize strings for comparison (removes accents)
  const normalizeString = (str: string) => 
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  // Helper function to find country by code or name
  const findCountryByCodeOrName = (value: string | null) => {
    if (!value) return null;
    const normalized = normalizeString(value);
    return africanCountries.find(c => 
      normalizeString(c.code) === normalized || 
      normalizeString(c.name) === normalized
    );
  };

  // Fetch property data
  useEffect(() => {
    const fetchProperty = async () => {
      if (!id || !user) return;
      
      try {
        setLoading(true);
        
        const { data: propertyData, error: propertyError } = await supabase
          .from('properties')
          .select(`
            *,
            property_images (url, is_primary, display_order)
          `)
          .eq('id', id)
          .maybeSingle();

        if (propertyError) throw propertyError;
        
        if (!propertyData) {
          toast({
            title: 'Erreur',
            description: 'Annonce non trouvée.',
            variant: 'destructive',
          });
          navigate('/profile');
          return;
        }

        // Check ownership
        if (propertyData.user_id !== user.id) {
          toast({
            title: 'Accès refusé',
            description: 'Vous ne pouvez modifier que vos propres annonces.',
            variant: 'destructive',
          });
          navigate('/profile');
          return;
        }

        // Populate form
        setTitle(propertyData.title);
        setDescription(propertyData.description || '');
        setAddress(propertyData.address);
        setCity(propertyData.city);
        setPrice(propertyData.price.toString());
        setArea(propertyData.area.toString());
        setPropertyType(propertyData.property_type as PropertyType);
        setTransactionType(propertyData.type as TransactionType);
        setListingType(propertyData.listing_type as 'long_term' | 'short_term');
        setBedrooms(propertyData.bedrooms?.toString() || '');
        setBathrooms(propertyData.bathrooms?.toString() || '');
        setSelectedAmenities(propertyData.features || []);
        setWhatsappEnabled(propertyData.whatsapp_enabled || false);
        
        if (propertyData.lat && propertyData.lng) {
          setMarkerPosition({ lat: Number(propertyData.lat), lng: Number(propertyData.lng) });
        }
        
        // Short-term specific
        if (propertyData.price_per_night) {
          setPricePerNight(propertyData.price_per_night.toString());
        }
        if (propertyData.minimum_stay) {
          setMinimumStay(propertyData.minimum_stay.toString());
        }
        
        // Discounts
        if (propertyData.discount_3_nights) setDiscount3Nights(propertyData.discount_3_nights.toString());
        if (propertyData.discount_5_nights) setDiscount5Nights(propertyData.discount_5_nights.toString());
        if (propertyData.discount_7_nights) setDiscount7Nights(propertyData.discount_7_nights.toString());
        if (propertyData.discount_14_nights) setDiscount14Nights(propertyData.discount_14_nights.toString());
        if (propertyData.discount_30_nights) setDiscount30Nights(propertyData.discount_30_nights.toString());
        
        // Country - use helper to find by code or name with accent-insensitive matching
        if (propertyData.country) {
          const country = findCountryByCodeOrName(propertyData.country);
          if (country) {
            setSelectedCountry(country.code);
            setAvailableCities(country.cities);
          } else {
            // Fallback: if it looks like a code (2 chars), use it directly
            if (propertyData.country.length === 2) {
              setSelectedCountry(propertyData.country.toUpperCase());
            }
          }
        }
        
        // Images
        const sortedImages = (propertyData.property_images || [])
          .sort((a: any, b: any) => {
            if (a.is_primary && !b.is_primary) return -1;
            if (!a.is_primary && b.is_primary) return 1;
            return (a.display_order || 0) - (b.display_order || 0);
          })
          .map((img: any) => img.url);
        setExistingImageUrls(sortedImages);
        
      } catch (err) {
        console.error('Error fetching property:', err);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger l\'annonce.',
          variant: 'destructive',
        });
        navigate('/profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [id, user, navigate]);

  // Update available cities when country changes
  useEffect(() => {
    if (selectedCountry) {
      const country = africanCountries.find(c => c.code === selectedCountry);
      if (country) {
        setAvailableCities(country.cities);
        const coords = countryCoordinates[selectedCountry];
        if (coords) {
          setMarkerPosition({ lat: coords.lat, lng: coords.lng });
        }
      }
    }
  }, [selectedCountry]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remainingSlots = 6 - existingImageUrls.length - images.length;
    const newFiles = files.slice(0, remainingSlots);
    
    setImages(prev => [...prev, ...newFiles]);
    newFiles.forEach(file => {
      const url = URL.createObjectURL(file);
      setNewImageUrls(prev => [...prev, url]);
    });
  };

  const removeExistingImage = (index: number) => {
    setExistingImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setNewImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity)
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  const handleSave = async () => {
    if (!user || !id) return;

    if (!title.trim() || !address.trim() || !city.trim()) {
      toast({
        title: 'Champs requis',
        description: 'Veuillez remplir tous les champs obligatoires.',
        variant: 'destructive',
      });
      return;
    }

    // Validate country is selected
    if (!selectedCountry) {
      toast({
        title: 'Pays requis',
        description: 'Veuillez sélectionner un pays.',
        variant: 'destructive',
      });
      return;
    }

    if (existingImageUrls.length + images.length === 0) {
      toast({
        title: 'Photos requises',
        description: 'Veuillez ajouter au moins une photo.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const countryCode = selectedCountry || null;
      
      // Update property
      const { error: updateError } = await supabase
        .from('properties')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          address: address.trim(),
          city,
          country: countryCode,
          property_type: propertyType,
          type: transactionType,
          listing_type: listingType,
          price: listingType === 'short_term' ? Number(pricePerNight) || 0 : Number(price),
          price_per_night: listingType === 'short_term' ? Number(pricePerNight) || null : null,
          minimum_stay: listingType === 'short_term' ? Number(minimumStay) || 1 : null,
          area: Number(area),
          bedrooms: propertyType !== 'land' ? Number(bedrooms) || 0 : 0,
          bathrooms: propertyType !== 'land' ? Number(bathrooms) || 0 : 0,
          features: selectedAmenities,
          lat: markerPosition.lat,
          lng: markerPosition.lng,
          whatsapp_enabled: whatsappEnabled,
          discount_3_nights: discount3Nights ? Number(discount3Nights) : null,
          discount_5_nights: discount5Nights ? Number(discount5Nights) : null,
          discount_7_nights: discount7Nights ? Number(discount7Nights) : null,
          discount_14_nights: discount14Nights ? Number(discount14Nights) : null,
          discount_30_nights: discount30Nights ? Number(discount30Nights) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Delete removed images
      const { data: currentImages } = await supabase
        .from('property_images')
        .select('url')
        .eq('property_id', id);

      const currentUrls = (currentImages || []).map(img => img.url);
      const urlsToDelete = currentUrls.filter(url => !existingImageUrls.includes(url));

      if (urlsToDelete.length > 0) {
        await supabase
          .from('property_images')
          .delete()
          .eq('property_id', id)
          .in('url', urlsToDelete);
      }

      // Upload new images
      for (let i = 0; i < images.length; i++) {
        const file = images[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${id}/${Date.now()}-${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('property-images')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('property-images')
          .getPublicUrl(fileName);

        await supabase.from('property_images').insert({
          property_id: id,
          url: urlData.publicUrl,
          is_primary: existingImageUrls.length === 0 && i === 0,
          display_order: existingImageUrls.length + i,
        });
      }

      toast({
        title: 'Modifications enregistrées',
        description: 'Votre annonce a été mise à jour avec succès.',
      });

      navigate(`/property/${id}`);
    } catch (err) {
      console.error('Error updating property:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour l\'annonce.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const isShortTerm = listingType === 'short_term';
  const amenitiesList = isShortTerm ? RESIDENCE_AMENITIES : AMENITIES;

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="relative h-32 bg-gradient-to-r from-primary to-primary/80">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(-1)}
          className="absolute left-4 z-10 glass w-10 h-10 rounded-full flex items-center justify-center"
          style={{ top: 'calc(var(--app-sat) + 1rem)' }}
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>
        <h1 className="absolute bottom-4 left-4 right-4 text-primary-foreground font-display font-bold text-xl">
          Modifier l'annonce
        </h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Photo Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-4 shadow-sm"
        >
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            Photos
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {/* Existing images */}
            {existingImageUrls.map((url, index) => (
              <div key={`existing-${index}`} className="relative aspect-square rounded-xl overflow-hidden">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeExistingImage(index)}
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
            
            {/* New images */}
            {newImageUrls.map((url, index) => (
              <div key={`new-${index}`} className="relative aspect-square rounded-xl overflow-hidden">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeNewImage(index)}
                  className="absolute top-1 right-1 p-1 bg-destructive rounded-full text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            
            {/* Add button */}
            {existingImageUrls.length + images.length < 6 && (
              <label className="aspect-square rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors">
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
            )}
          </div>
        </motion.div>

        {/* Title and Description */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-4 shadow-sm space-y-3"
        >
          <div>
            <Label htmlFor="title">Titre de l'annonce</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Belle villa avec piscine"
              className="mt-1"
            />
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

        {/* Price */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-4 shadow-sm"
        >
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            {isShortTerm ? 'Prix par nuit' : 'Prix'}
          </h3>
          <div className="relative">
            <Input
              type="number"
              value={isShortTerm ? pricePerNight : price}
              onChange={(e) => isShortTerm ? setPricePerNight(e.target.value) : setPrice(e.target.value)}
              placeholder="0"
              className="pr-16 text-lg font-bold"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              FCFA
            </span>
          </div>
        </motion.div>

        {/* Minimum Stay - Short term only */}
        {isShortTerm && (
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
          </motion.div>
        )}

        {/* Discounts - Short term only */}
        {isShortTerm && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl p-4 shadow-sm"
          >
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              🏷️ Forfaits & Rabais
            </h3>
            <div className="space-y-2">
              {[
                { label: '3+ nuits', value: discount3Nights, setter: setDiscount3Nights },
                { label: '5+ nuits', value: discount5Nights, setter: setDiscount5Nights },
                { label: '7+ nuits', value: discount7Nights, setter: setDiscount7Nights },
                { label: '14+ nuits', value: discount14Nights, setter: setDiscount14Nights },
                { label: '30+ nuits', value: discount30Nights, setter: setDiscount30Nights },
              ].map(discount => (
                <div key={discount.label} className="flex items-center gap-3">
                  <Label className="flex-1 text-sm">{discount.label}</Label>
                  <div className="relative w-20">
                    <Input
                      type="number"
                      min="0"
                      max="50"
                      value={discount.value}
                      onChange={(e) => discount.setter(e.target.value)}
                      placeholder="0"
                      className="pr-6 text-center text-sm"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Location */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-4 shadow-sm"
        >
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Localisation
          </h3>
          <div className="space-y-3">
            <div>
              <Label>Pays</Label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner un pays" />
                </SelectTrigger>
                <SelectContent className="bg-card border shadow-lg z-50 max-h-64">
                  {africanCountries.map(country => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ville</Label>
              <Select value={city} onValueChange={setCity} disabled={!selectedCountry}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner une ville" />
                </SelectTrigger>
                <SelectContent className="bg-card border shadow-lg z-50 max-h-64">
                  {availableCities.map(cityName => (
                    <SelectItem key={cityName} value={cityName}>
                      {cityName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Quartier, rue..."
                className="mt-1"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setShowMap(!showMap)}
            >
              <Map className="w-4 h-4 mr-2" />
              {showMap ? 'Masquer la carte' : 'Positionner sur la carte'}
            </Button>
            {showMap && (
              <LocationMapPicker
                position={markerPosition}
                onPositionChange={(lat, lng) => setMarkerPosition({ lat, lng })}
                countryCode={selectedCountry}
              />
            )}
          </div>
        </motion.div>

        {/* Details */}
        {propertyType !== 'land' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl p-4 shadow-sm"
          >
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Home className="w-5 h-5 text-primary" />
              Détails
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="flex items-center gap-1 text-xs">
                  <Bed className="w-3 h-3" /> Chambres
                </Label>
                <Input
                  type="number"
                  value={bedrooms}
                  onChange={(e) => setBedrooms(e.target.value)}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="flex items-center gap-1 text-xs">
                  <Bath className="w-3 h-3" /> S. de bain
                </Label>
                <Input
                  type="number"
                  value={bathrooms}
                  onChange={(e) => setBathrooms(e.target.value)}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="flex items-center gap-1 text-xs">
                  <Maximize className="w-3 h-3" /> Surface
                </Label>
                <Input
                  type="number"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="m²"
                  className="mt-1"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Amenities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-4 shadow-sm"
        >
          <h3 className="font-semibold mb-3">Commodités</h3>
          <Popover open={amenitiesOpen} onOpenChange={setAmenitiesOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                {selectedAmenities.length > 0 
                  ? `${selectedAmenities.length} sélectionné(s)` 
                  : 'Sélectionner les commodités'
                }
                <ChevronDown className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-3 max-h-64 overflow-y-auto bg-card border shadow-lg z-50">
              <div className="grid grid-cols-2 gap-2">
                {amenitiesList.map(amenity => (
                  <div key={amenity} className="flex items-center gap-2">
                    <Checkbox
                      id={amenity}
                      checked={selectedAmenities.includes(amenity)}
                      onCheckedChange={() => toggleAmenity(amenity)}
                    />
                    <Label htmlFor={amenity} className="text-sm cursor-pointer">
                      {amenity}
                    </Label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          {selectedAmenities.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedAmenities.map(amenity => (
                <span key={amenity} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  {amenity}
                </span>
              ))}
            </div>
          )}
        </motion.div>

        {/* WhatsApp */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Contact WhatsApp</p>
              <p className="text-xs text-muted-foreground">Permettre le contact via WhatsApp</p>
            </div>
            <Checkbox
              checked={whatsappEnabled}
              onCheckedChange={(checked) => setWhatsappEnabled(checked === true)}
            />
          </div>
        </motion.div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full gradient-primary py-6 text-lg font-semibold"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              Enregistrer les modifications
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default EditPropertyPage;
