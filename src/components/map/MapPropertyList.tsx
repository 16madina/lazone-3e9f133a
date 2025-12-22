import { Property } from '@/hooks/useProperties';
import { useAppStore } from '@/stores/appStore';
import { MapPin, Bed, Bath, Maximize, Calendar, Star, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { getCurrencyByCountry } from '@/data/currencies';

interface MapPropertyListProps {
  properties: Property[];
  selectedProperty: Property | null;
  onSelectProperty: (property: Property) => void;
  onClose: () => void;
  isOpen: boolean;
}

const formatPrice = (price: number, countryCode: string | null, isResidence: boolean = false) => {
  const currency = getCurrencyByCountry(countryCode);
  const symbol = currency?.symbol || 'FCFA';
  const formatted = new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(price) + ' ' + symbol;
  return isResidence ? `${formatted}/nuit` : formatted;
};

export const MapPropertyList = ({
  properties,
  selectedProperty,
  onSelectProperty,
  onClose,
  isOpen,
}: MapPropertyListProps) => {
  const appMode = useAppStore((state) => state.appMode);
  const isResidence = appMode === 'residence';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="absolute left-0 top-0 bottom-0 w-80 bg-card/95 backdrop-blur-lg z-[999] shadow-xl border-r flex flex-col"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 120px)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-card/80">
            <h2 className="font-semibold text-lg">
              {properties.length} annonce{properties.length > 1 ? 's' : ''}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Property List */}
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-3">
              {properties.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucune annonce trouvée</p>
                  <p className="text-sm mt-1">Essayez de modifier vos filtres</p>
                </div>
              ) : (
                properties.map((property) => (
                  <PropertyListItem
                    key={property.id}
                    property={property}
                    isSelected={selectedProperty?.id === property.id}
                    onSelect={() => onSelectProperty(property)}
                    isResidence={isResidence}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface PropertyListItemProps {
  property: Property;
  isSelected: boolean;
  onSelect: () => void;
  isResidence: boolean;
}

const PropertyListItem = ({
  property,
  isSelected,
  onSelect,
  isResidence,
}: PropertyListItemProps) => {
  const displayPrice = isResidence
    ? (property.pricePerNight || property.price)
    : property.price;

  return (
    <div
      onClick={onSelect}
      className={`p-3 rounded-xl cursor-pointer transition-all ${
        isSelected
          ? 'bg-primary/10 border-2 border-primary shadow-md'
          : 'bg-muted/50 hover:bg-muted border-2 border-transparent'
      }`}
    >
      <div className="flex gap-3">
        {/* Image */}
        <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden">
          <img
            src={property.images[0] || '/placeholder.svg'}
            alt={property.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {/* Badges */}
          <div className="flex items-center gap-1 mb-1 flex-wrap">
            {isResidence ? (
              <>
                {property.minimumStay && property.minimumStay > 1 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-violet-100 text-violet-700 flex items-center gap-0.5">
                    <Calendar className="w-2.5 h-2.5" />
                    {property.minimumStay}n
                  </span>
                )}
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <Star className="w-2.5 h-2.5 fill-primary text-primary" />
                  Nouveau
                </span>
              </>
            ) : (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                  property.type === 'sale'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-green-100 text-green-700'
                }`}
              >
                {property.type === 'sale' ? 'Vente' : 'Location'}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-sm line-clamp-1">{property.title}</h3>

          {/* Location */}
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3" />
            <span className="line-clamp-1">{property.city}, {property.country}</span>
          </p>

          {/* Price */}
          <p className="text-primary font-bold text-sm mt-1">
            {formatPrice(displayPrice, property.country, isResidence)}
            {!isResidence && property.type === 'rent' && (
              <span className="text-xs font-normal">/mois</span>
            )}
          </p>

          {/* Features */}
          {property.propertyType !== 'land' && (
            <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
              {property.bedrooms > 0 && (
                <span className="flex items-center gap-0.5">
                  <Bed className="w-3 h-3" />
                  {property.bedrooms}
                </span>
              )}
              {property.bathrooms > 0 && (
                <span className="flex items-center gap-0.5">
                  <Bath className="w-3 h-3" />
                  {property.bathrooms}
                </span>
              )}
              {property.area > 0 && (
                <span className="flex items-center gap-0.5">
                  <Maximize className="w-3 h-3" />
                  {property.area}m²
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapPropertyList;
