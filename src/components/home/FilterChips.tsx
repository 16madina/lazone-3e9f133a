import { useAppStore } from '@/stores/appStore';

// Filtres pour LaZone (long terme)
const longTermFilters = [
  { id: 'all', label: 'Tout', emoji: '✨' },
  { id: 'sale', label: 'À vendre', emoji: '💰' },
  { id: 'rent', label: 'À louer', emoji: '🔑' },
  { id: 'house', label: 'Maisons', emoji: '🏠' },
  { id: 'apartment', label: 'Apparts', emoji: '🏢' },
  { id: 'land', label: 'Terrains', emoji: '🌳' },
  { id: 'commercial', label: 'Commerces', emoji: '🏪' },
];

// Filtres pour LaZone Residence (courts séjours - style Airbnb)
const shortTermFilters = [
  { id: 'all', label: 'Tout', emoji: '✨' },
  { id: 'house', label: 'Villas', emoji: '🏡' },
  { id: 'apartment', label: 'Appartements', emoji: '🏢' },
  { id: 'entire', label: 'Logement entier', emoji: '🏠' },
  { id: 'pool', label: 'Avec piscine', emoji: '🏊' },
  { id: 'wifi', label: 'WiFi', emoji: '📶' },
  { id: 'parking', label: 'Parking', emoji: '🚗' },
];

interface FilterChipsProps {
  variant?: 'default' | 'hero';
}

export const FilterChips = ({ variant = 'default' }: FilterChipsProps) => {
  const { activeFilter, setActiveFilter, appMode } = useAppStore();

  const isHero = variant === 'hero';
  const isResidence = appMode === 'residence';
  const filters = isResidence ? shortTermFilters : longTermFilters;

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide py-2 -mx-4 px-4">
      {filters.map((filter) => {
        const isActive = activeFilter === filter.id;
        return (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-medium whitespace-nowrap transition-all duration-300 active:scale-95 ${
              isActive 
                ? isResidence
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/40 border border-emerald-400/30' 
                  : 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/40 border border-primary/30'
                : isHero 
                  ? 'bg-white/40 backdrop-blur-md text-foreground border border-white/50 shadow-sm hover:bg-white/60 hover:shadow-md hover:border-white/70' 
                  : 'bg-white/20 backdrop-blur-md text-foreground border border-white/30 hover:bg-white/30 hover:border-white/50'
            }`}
          >
            <span className="text-base">{filter.emoji}</span>
            <span className="text-inherit">{filter.label}</span>
          </button>
        );
      })}
    </div>
  );
};
