import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAppMode } from '@/hooks/useAppMode';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'map-center';
  action?: string;
  route?: string;
}

export type TutorialSection = 'full' | 'home' | 'map' | 'publish' | 'messages' | 'profile';

// Tutoriels mode Immobilier
const fullTutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Bienvenue ! 🏠',
    description: 'Découvrez LaZone en quelques étapes.',
    position: 'center'
  },
  {
    id: 'search',
    title: 'Recherche',
    description: 'Trouvez des propriétés par ville ou quartier.',
    target: '[data-tutorial="search"]',
    position: 'bottom',
    route: '/'
  },
  {
    id: 'country',
    title: 'Pays',
    description: 'Cliquez sur le drapeau pour changer de pays.',
    target: '[data-tutorial="country"]',
    position: 'bottom',
    route: '/'
  },
  {
    id: 'property-card',
    title: 'Propriétés',
    description: 'Glissez pour voir les photos, cliquez pour détails.',
    target: '[data-tutorial="property-card"]',
    position: 'top',
    route: '/'
  },
  {
    id: 'map',
    title: 'Carte',
    description: 'Visualisez les propriétés sur la carte.',
    target: '[data-tutorial="nav-map"]',
    position: 'top',
    route: '/'
  },
  {
    id: 'publish',
    title: 'Publier',
    description: 'Vendez ou louez votre bien.',
    target: '[data-tutorial="nav-publish"]',
    position: 'top',
    route: '/'
  },
  {
    id: 'messages',
    title: 'Messages',
    description: 'Discutez avec vendeurs et acheteurs.',
    target: '[data-tutorial="nav-messages"]',
    position: 'top',
    route: '/'
  },
  {
    id: 'profile',
    title: 'Profil',
    description: 'Gérez vos annonces et paramètres.',
    target: '[data-tutorial="nav-profile"]',
    position: 'top',
    route: '/'
  },
  {
    id: 'complete',
    title: 'Prêt ! 🎉',
    description: 'Bonne exploration de LaZone !',
    position: 'center'
  }
];

// Tutoriels mode Résidence
const fullResidenceTutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Bienvenue en Résidence ! 🏨',
    description: 'Découvrez les locations courte durée en Afrique.',
    position: 'center'
  },
  {
    id: 'search',
    title: 'Recherche',
    description: 'Trouvez des hébergements par ville ou quartier.',
    target: '[data-tutorial="search"]',
    position: 'bottom',
    route: '/'
  },
  {
    id: 'country',
    title: 'Pays',
    description: 'Cliquez sur le drapeau pour changer de pays.',
    target: '[data-tutorial="country"]',
    position: 'bottom',
    route: '/'
  },
  {
    id: 'property-card',
    title: 'Séjours',
    description: 'Parcourez villas, appartements et résidences disponibles.',
    target: '[data-tutorial="property-card"]',
    position: 'top',
    route: '/'
  },
  {
    id: 'map',
    title: 'Carte',
    description: 'Visualisez les hébergements sur la carte.',
    target: '[data-tutorial="nav-map"]',
    position: 'top',
    route: '/'
  },
  {
    id: 'publish',
    title: 'Publier',
    description: 'Proposez votre bien en location courte durée.',
    target: '[data-tutorial="nav-publish"]',
    position: 'top',
    route: '/'
  },
  {
    id: 'messages',
    title: 'Messages',
    description: 'Discutez avec hôtes et voyageurs.',
    target: '[data-tutorial="nav-messages"]',
    position: 'top',
    route: '/'
  },
  {
    id: 'profile',
    title: 'Profil',
    description: 'Gérez vos séjours et réservations.',
    target: '[data-tutorial="nav-profile"]',
    position: 'top',
    route: '/'
  },
  {
    id: 'complete',
    title: 'Prêt ! 🌴',
    description: 'Bon séjour avec LaZone Résidence !',
    position: 'center'
  }
];

const sectionTutorials: Record<TutorialSection, TutorialStep[]> = {
  full: fullTutorialSteps,
  home: [
    {
      id: 'home-intro',
      title: 'Accueil 🏠',
      description: 'Parcourez les propriétés de votre zone.',
      position: 'center'
    },
    {
      id: 'home-search',
      title: 'Recherche',
      description: 'Tapez une ville ou un quartier.',
      target: '[data-tutorial="search"]',
      position: 'bottom'
    },
    {
      id: 'home-filters',
      title: 'Filtres',
      description: 'Affinez par prix et type de bien.',
      target: '[data-tutorial="filters"]',
      position: 'bottom'
    },
    {
      id: 'home-country',
      title: 'Pays',
      description: 'Changez de pays via le drapeau.',
      target: '[data-tutorial="country"]',
      position: 'bottom'
    },
    {
      id: 'home-properties',
      title: 'Propriétés',
      description: 'Glissez les photos, cliquez pour détails.',
      target: '[data-tutorial="property-card"]',
      position: 'top'
    },
    {
      id: 'home-complete',
      title: 'C\'est parti ! ✨',
      description: 'Bonne exploration !',
      position: 'center'
    }
  ],
  map: [
    {
      id: 'map-country',
      title: 'Changer de pays 🌍',
      description: 'Sélectionnez un pays africain pour voir ses propriétés disponibles.',
      position: 'map-center'
    },
    {
      id: 'map-filters',
      title: 'Type de bien 🏠',
      description: 'Filtrez par Vente, Location ou Terrain selon vos besoins.',
      position: 'map-center'
    },
    {
      id: 'map-markers',
      title: 'Les marqueurs 📍',
      description: 'Les marqueurs orange groupent plusieurs biens. Cliquez dessus pour voir les détails.',
      position: 'map-center'
    },
    {
      id: 'map-zoom',
      title: 'Zoom + / - 🔍',
      description: 'Utilisez les boutons + et - pour zoomer et voir plus de détails.',
      position: 'map-center'
    }
  ],
  publish: [
    {
      id: 'publish-intro',
      title: 'Publier une annonce 📝',
      description: 'Créez votre annonce immobilière en quelques étapes simples.',
      position: 'bottom'
    },
    {
      id: 'publish-credits',
      title: 'Crédits disponibles 💳',
      description: 'Vous avez des annonces gratuites ou des crédits. Pro = 15/mois !',
      target: '[data-tutorial="publish-credits"]',
      position: 'bottom'
    },
    {
      id: 'publish-photos',
      title: 'Ajoutez vos photos 📷',
      description: 'Jusqu\'à 6 photos de qualité pour attirer les acheteurs.',
      target: '[data-tutorial="publish-photos"]',
      position: 'bottom'
    },
    {
      id: 'publish-details',
      title: 'Détails du bien',
      description: 'Type, prix, surface, chambres... Soyez précis !',
      target: '[data-tutorial="publish-details"]',
      position: 'bottom'
    },
    {
      id: 'publish-location',
      title: 'Localisation exacte 📍',
      description: 'Glissez le marqueur pour indiquer l\'emplacement précis.',
      target: '[data-tutorial="publish-location"]',
      position: 'top'
    },
    {
      id: 'publish-payment',
      title: 'Paiement 💰',
      description: 'Si pas de crédit, payez par Mobile Money ou achetez un abonnement.',
      position: 'bottom'
    },
    {
      id: 'publish-complete',
      title: 'Prêt à publier ! 🎉',
      description: 'Votre annonce sera visible après validation du paiement.',
      position: 'bottom'
    }
  ],
  messages: [
    {
      id: 'messages-intro',
      title: 'Messages 💬',
      description: 'Discutez avec vendeurs et acheteurs.',
      position: 'center'
    },
    {
      id: 'messages-search',
      title: 'Recherche',
      description: 'Recherchez une conversation.',
      target: '[data-tutorial="messages-search"]',
      position: 'bottom'
    },
    {
      id: 'messages-tabs',
      title: 'Filtres',
      description: 'Triez : Tous, Reçus, Envoyés, Archivés.',
      target: '[data-tutorial="messages-tabs"]',
      position: 'bottom'
    },
    {
      id: 'messages-list',
      title: 'Conversations',
      description: 'Cliquez pour ouvrir une discussion.',
      target: '[data-tutorial="messages-list"]',
      position: 'top'
    },
    {
      id: 'messages-complete',
      title: 'Connecté ! 📱',
      description: 'Répondez vite pour conclure.',
      position: 'center'
    }
  ],
  profile: [
    {
      id: 'profile-intro',
      title: 'Profil 👤',
      description: 'Gérez compte, crédits et annonces.',
      position: 'center'
    },
    {
      id: 'profile-info',
      title: 'Mon profil',
      description: 'Voir et modifier vos infos.',
      target: '[data-tutorial="profile-info"]',
      position: 'bottom'
    },
    {
      id: 'profile-credits',
      title: 'Mes crédits 💳',
      description: 'Gérez vos crédits pour publier. Pro = 15/mois, Premium = illimité.',
      target: '[data-tutorial="profile-credits"]',
      position: 'bottom'
    },
    {
      id: 'profile-pending',
      title: 'Annonces en attente ⏳',
      description: 'Vos annonces non payées apparaissent ici. Payez pour les activer.',
      target: '[data-tutorial="profile-pending"]',
      position: 'bottom'
    },
    {
      id: 'profile-listings',
      title: 'Mes annonces',
      description: 'Vos propriétés publiées et actives.',
      target: '[data-tutorial="profile-listings"]',
      position: 'bottom'
    },
    {
      id: 'profile-appointments',
      title: 'Mes RDV',
      description: 'Gérez vos rendez-vous de visite.',
      target: '[data-tutorial="profile-appointments"]',
      position: 'bottom'
    },
    {
      id: 'profile-settings',
      title: 'Paramètres',
      description: 'Notifications, sécurité, abonnement.',
      target: '[data-tutorial="profile-settings"]',
      position: 'bottom'
    },
    {
      id: 'profile-complete',
      title: 'Votre espace ! 🌟',
      description: 'Profil à jour = plus de succès.',
      position: 'center'
    }
  ]
};

// Tutoriels spécifiques au mode Résidence
const sectionResidenceTutorials: Record<TutorialSection, TutorialStep[]> = {
  full: fullResidenceTutorialSteps,
  home: [
    {
      id: 'home-intro',
      title: 'Accueil Résidence 🏨',
      description: 'Parcourez les hébergements disponibles.',
      position: 'center'
    },
    {
      id: 'home-search',
      title: 'Recherche',
      description: 'Tapez une ville ou un quartier.',
      target: '[data-tutorial="search"]',
      position: 'bottom'
    },
    {
      id: 'home-filters',
      title: 'Filtres',
      description: 'Filtrez par type : Villa, Appartement, Résidence.',
      target: '[data-tutorial="filters"]',
      position: 'bottom'
    },
    {
      id: 'home-country',
      title: 'Pays',
      description: 'Changez de destination via le drapeau.',
      target: '[data-tutorial="country"]',
      position: 'bottom'
    },
    {
      id: 'home-properties',
      title: 'Séjours',
      description: 'Découvrez les prix par nuit et les disponibilités.',
      target: '[data-tutorial="property-card"]',
      position: 'top'
    },
    {
      id: 'home-complete',
      title: 'Bon voyage ! 🌴',
      description: 'Trouvez votre prochain séjour !',
      position: 'center'
    }
  ],
  map: [
    {
      id: 'map-country',
      title: 'Changer de destination 🌍',
      description: 'Sélectionnez un pays africain pour voir les hébergements.',
      position: 'map-center'
    },
    {
      id: 'map-filters',
      title: 'Type d\'hébergement 🏨',
      description: 'Filtrez par Villa, Appartement ou Résidence.',
      position: 'map-center'
    },
    {
      id: 'map-markers',
      title: 'Les marqueurs 📍',
      description: 'Les marqueurs verts groupent plusieurs hébergements. Cliquez pour les détails.',
      position: 'map-center'
    },
    {
      id: 'map-zoom',
      title: 'Zoom + / - 🔍',
      description: 'Zoomez pour voir plus de détails sur les hébergements.',
      position: 'map-center'
    }
  ],
  publish: [
    {
      id: 'publish-intro',
      title: 'Publier un séjour 🏨',
      description: 'Proposez votre bien en location courte durée.',
      position: 'bottom'
    },
    {
      id: 'publish-credits',
      title: 'Crédits disponibles 💳',
      description: 'Vous avez des annonces gratuites ou des crédits. Pro = 15/mois !',
      target: '[data-tutorial="publish-credits"]',
      position: 'bottom'
    },
    {
      id: 'publish-photos',
      title: 'Ajoutez vos photos 📷',
      description: 'Jusqu\'à 6 photos pour séduire les voyageurs.',
      target: '[data-tutorial="publish-photos"]',
      position: 'bottom'
    },
    {
      id: 'publish-details',
      title: 'Détails du séjour',
      description: 'Prix par nuit, équipements, capacité d\'accueil...',
      target: '[data-tutorial="publish-details"]',
      position: 'bottom'
    },
    {
      id: 'publish-pricing',
      title: 'Tarification 💰',
      description: 'Définissez le prix par nuit et les remises longue durée.',
      target: '[data-tutorial="publish-pricing"]',
      position: 'bottom'
    },
    {
      id: 'publish-location',
      title: 'Localisation exacte 📍',
      description: 'Indiquez l\'emplacement précis de votre hébergement.',
      target: '[data-tutorial="publish-location"]',
      position: 'top'
    },
    {
      id: 'publish-payment',
      title: 'Paiement 💰',
      description: 'Si pas de crédit, payez par Mobile Money ou achetez un abonnement.',
      position: 'bottom'
    },
    {
      id: 'publish-complete',
      title: 'Prêt à accueillir ! 🎉',
      description: 'Votre séjour sera visible après validation du paiement.',
      position: 'bottom'
    }
  ],
  messages: [
    {
      id: 'messages-intro',
      title: 'Messages 💬',
      description: 'Discutez avec hôtes et voyageurs.',
      position: 'center'
    },
    {
      id: 'messages-search',
      title: 'Recherche',
      description: 'Recherchez une conversation.',
      target: '[data-tutorial="messages-search"]',
      position: 'bottom'
    },
    {
      id: 'messages-tabs',
      title: 'Filtres',
      description: 'Triez : Tous, Reçus, Envoyés, Archivés.',
      target: '[data-tutorial="messages-tabs"]',
      position: 'bottom'
    },
    {
      id: 'messages-list',
      title: 'Conversations',
      description: 'Cliquez pour ouvrir une discussion.',
      target: '[data-tutorial="messages-list"]',
      position: 'top'
    },
    {
      id: 'messages-complete',
      title: 'Connecté ! 📱',
      description: 'Répondez vite pour confirmer les réservations.',
      position: 'center'
    }
  ],
  profile: [
    {
      id: 'profile-intro',
      title: 'Profil 👤',
      description: 'Gérez compte, crédits et séjours.',
      position: 'center'
    },
    {
      id: 'profile-info',
      title: 'Mon profil',
      description: 'Voir et modifier vos infos.',
      target: '[data-tutorial="profile-info"]',
      position: 'bottom'
    },
    {
      id: 'profile-credits',
      title: 'Mes crédits 💳',
      description: 'Gérez vos crédits pour publier. Pro = 15/mois, Premium = illimité.',
      target: '[data-tutorial="profile-credits"]',
      position: 'bottom'
    },
    {
      id: 'profile-pending',
      title: 'Séjours en attente ⏳',
      description: 'Vos annonces non payées apparaissent ici. Payez pour les activer.',
      target: '[data-tutorial="profile-pending"]',
      position: 'bottom'
    },
    {
      id: 'profile-listings',
      title: 'Mes séjours',
      description: 'Vos hébergements publiés et actifs.',
      target: '[data-tutorial="profile-listings"]',
      position: 'bottom'
    },
    {
      id: 'profile-appointments',
      title: 'Réservations',
      description: 'Gérez vos demandes de réservation.',
      target: '[data-tutorial="profile-appointments"]',
      position: 'bottom'
    },
    {
      id: 'profile-settings',
      title: 'Paramètres',
      description: 'Notifications, calendrier, abonnement.',
      target: '[data-tutorial="profile-settings"]',
      position: 'bottom'
    },
    {
      id: 'profile-complete',
      title: 'Super hôte ! 🌟',
      description: 'Un profil complet attire plus de réservations.',
      position: 'center'
    }
  ]
};

interface TutorialContextType {
  isActive: boolean;
  currentStep: number;
  steps: TutorialStep[];
  currentSection: TutorialSection;
  startTutorial: () => void;
  startSectionTutorial: (section: TutorialSection) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  hasCompletedTutorial: boolean;
  resetTutorial: () => void;
  isResidenceMode: boolean;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export const TutorialProvider = ({ children }: { children: ReactNode }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentSection, setCurrentSection] = useState<TutorialSection>('full');
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(true);
  const [isResidenceMode, setIsResidenceMode] = useState(false);

  // Sync with app mode from localStorage
  useEffect(() => {
    const checkMode = () => {
      const mode = localStorage.getItem('lazone_app_mode');
      setIsResidenceMode(mode === 'residence');
    };
    
    checkMode();
    
    // Listen for storage changes
    window.addEventListener('storage', checkMode);
    
    // Also check periodically for same-tab changes
    const interval = setInterval(checkMode, 1000);
    
    return () => {
      window.removeEventListener('storage', checkMode);
      clearInterval(interval);
    };
  }, []);

  // Get the appropriate tutorials based on mode
  const tutorials = isResidenceMode ? sectionResidenceTutorials : sectionTutorials;
  const steps = tutorials[currentSection];

  useEffect(() => {
    const completed = localStorage.getItem('lazone_tutorial_completed');
    setHasCompletedTutorial(completed === 'true');
  }, []);

  const startTutorial = () => {
    setCurrentSection('full');
    setCurrentStep(0);
    setIsActive(true);
  };

  const startSectionTutorial = (section: TutorialSection) => {
    setCurrentSection(section);
    setCurrentStep(0);
    setIsActive(true);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeTutorial();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const skipTutorial = () => {
    setIsActive(false);
    if (currentSection === 'full') {
      localStorage.setItem('lazone_tutorial_completed', 'true');
      setHasCompletedTutorial(true);
    }
  };

  const completeTutorial = () => {
    setIsActive(false);
    if (currentSection === 'full') {
      localStorage.setItem('lazone_tutorial_completed', 'true');
      setHasCompletedTutorial(true);
    }
  };

  const resetTutorial = () => {
    localStorage.removeItem('lazone_tutorial_completed');
    setHasCompletedTutorial(false);
  };

  return (
    <TutorialContext.Provider value={{
      isActive,
      currentStep,
      steps,
      currentSection,
      startTutorial,
      startSectionTutorial,
      nextStep,
      prevStep,
      skipTutorial,
      completeTutorial,
      hasCompletedTutorial,
      resetTutorial,
      isResidenceMode
    }}>
      {children}
    </TutorialContext.Provider>
  );
};

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};
