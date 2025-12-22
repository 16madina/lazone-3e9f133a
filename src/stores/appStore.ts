import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Country } from '@/data/africanCountries';

export interface Property {
  id: string;
  title: string;
  price: number;
  type: 'sale' | 'rent';
  propertyType: 'house' | 'apartment' | 'land' | 'commercial';
  address: string;
  city: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  images: string[];
  description: string;
  features: string[];
  lat: number;
  lng: number;
  isFavorite: boolean;
  createdAt: string;
  agent: {
    name: string;
    phone: string;
    avatar: string;
  };
}

export type AppMode = 'lazone' | 'residence';

interface AppState {
  properties: Property[];
  favorites: string[];
  searchQuery: string;
  activeFilter: string;
  priceRange: [number, number];
  bedroomsFilter: number | null;
  bathroomsFilter: number | null;
  minimumStayFilter: number | null;
  appMode: AppMode;
  isModeSwitching: boolean;
  selectedCountry: Country | null;
  toggleFavorite: (id: string) => void;
  setSearchQuery: (query: string) => void;
  setActiveFilter: (filter: string) => void;
  setPriceRange: (range: [number, number]) => void;
  setBedroomsFilter: (value: number | null) => void;
  setBathroomsFilter: (value: number | null) => void;
  setMinimumStayFilter: (value: number | null) => void;
  setAppMode: (mode: AppMode) => void;
  setIsModeSwitching: (switching: boolean) => void;
  setSelectedCountry: (country: Country | null) => void;
}

const mockProperties: Property[] = [
  {
    id: '1',
    title: 'Villa Moderne avec Piscine',
    price: 850000,
    type: 'sale',
    propertyType: 'house',
    address: '123 Rue des Érables',
    city: 'Montréal',
    bedrooms: 4,
    bathrooms: 3,
    area: 280,
    images: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&h=600&fit=crop',
    ],
    description: 'Magnifique villa moderne avec piscine et jardin paysager.',
    features: ['Piscine', 'Garage double', 'Jardin', 'Terrasse'],
    lat: 45.5017,
    lng: -73.5673,
    isFavorite: false,
    createdAt: '2024-01-15',
    agent: {
      name: 'Marie Dubois',
      phone: '514-555-0123',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    },
  },
  {
    id: '2',
    title: 'Penthouse Vue Panoramique',
    price: 4500,
    type: 'rent',
    propertyType: 'apartment',
    address: '456 Av. du Parc',
    city: 'Montréal',
    bedrooms: 2,
    bathrooms: 2,
    area: 120,
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
    ],
    description: 'Superbe penthouse avec vue imprenable sur la ville.',
    features: ['Vue panoramique', 'Terrasse', 'Gym', 'Concierge'],
    lat: 45.5088,
    lng: -73.5878,
    isFavorite: true,
    createdAt: '2024-01-20',
    agent: {
      name: 'Jean Martin',
      phone: '514-555-0456',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    },
  },
  {
    id: '3',
    title: 'Maison Familiale Rénovée',
    price: 575000,
    type: 'sale',
    propertyType: 'house',
    address: '789 Boul. Saint-Laurent',
    city: 'Laval',
    bedrooms: 3,
    bathrooms: 2,
    area: 180,
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop',
    ],
    description: 'Charmante maison familiale entièrement rénovée.',
    features: ['Sous-sol aménagé', 'Cour clôturée', 'Stationnement'],
    lat: 45.6066,
    lng: -73.7124,
    isFavorite: false,
    createdAt: '2024-01-18',
    agent: {
      name: 'Sophie Tremblay',
      phone: '450-555-0789',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    },
  },
  {
    id: '4',
    title: 'Loft Industriel Design',
    price: 2800,
    type: 'rent',
    propertyType: 'apartment',
    address: '321 Rue Wellington',
    city: 'Montréal',
    bedrooms: 1,
    bathrooms: 1,
    area: 85,
    images: [
      'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop',
    ],
    description: 'Loft au design industriel dans le quartier branché de Griffintown.',
    features: ['Plafonds hauts', 'Briques exposées', 'Fenêtres géantes'],
    lat: 45.4876,
    lng: -73.5542,
    isFavorite: false,
    createdAt: '2024-01-22',
    agent: {
      name: 'Marc Gagnon',
      phone: '514-555-0321',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    },
  },
  {
    id: '5',
    title: 'Terrain Constructible',
    price: 180000,
    type: 'sale',
    propertyType: 'land',
    address: '567 Ch. des Pins',
    city: 'Tremblant',
    bedrooms: 0,
    bathrooms: 0,
    area: 5000,
    images: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&h=600&fit=crop',
    ],
    description: 'Grand terrain avec vue sur les montagnes, idéal pour construction.',
    features: ['Vue montagne', 'Boisé', 'Services à proximité'],
    lat: 46.1185,
    lng: -74.5963,
    isFavorite: false,
    createdAt: '2024-01-10',
    agent: {
      name: 'Pierre Roy',
      phone: '819-555-0567',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    },
  },
  {
    id: '6',
    title: 'Local Commercial Centre-Ville',
    price: 5500,
    type: 'rent',
    propertyType: 'commercial',
    address: '890 Rue Sainte-Catherine',
    city: 'Montréal',
    bedrooms: 0,
    bathrooms: 2,
    area: 200,
    images: [
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop',
    ],
    description: 'Espace commercial prestigieux sur Sainte-Catherine.',
    features: ['Grande vitrine', 'Climatisation', 'Accès livraison'],
    lat: 45.5048,
    lng: -73.5717,
    isFavorite: true,
    createdAt: '2024-01-25',
    agent: {
      name: 'Isabelle Côté',
      phone: '514-555-0890',
      avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&h=100&fit=crop',
    },
  },
];

export const useAppStore = create<AppState>((set) => ({
  properties: mockProperties,
  favorites: ['2', '6'],
  searchQuery: '',
  activeFilter: 'all',
  priceRange: [0, 1000000000],
  bedroomsFilter: null,
  bathroomsFilter: null,
  minimumStayFilter: null,
  appMode: 'lazone',
  isModeSwitching: false,
  selectedCountry: null,
  toggleFavorite: (id) =>
    set((state) => ({
      favorites: state.favorites.includes(id)
        ? state.favorites.filter((fId) => fId !== id)
        : [...state.favorites, id],
    })),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveFilter: (filter) => set({ activeFilter: filter }),
  setPriceRange: (range) => set({ priceRange: range }),
  setBedroomsFilter: (value) => set({ bedroomsFilter: value }),
  setBathroomsFilter: (value) => set({ bathroomsFilter: value }),
  setMinimumStayFilter: (value) => set({ minimumStayFilter: value }),
  setAppMode: (mode) => set({ appMode: mode }),
  setIsModeSwitching: (switching) => set({ isModeSwitching: switching }),
  setSelectedCountry: (country) => set({ selectedCountry: country }),
}));
