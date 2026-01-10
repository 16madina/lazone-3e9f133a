import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Target, Heart, Users, Globe, Shield, Sparkles, Building2, MapPin } from 'lucide-react';
import { AppDownloadButtons } from '@/components/AppDownloadButtons';

const AboutPage = () => {
  const navigate = useNavigate();

  const values = [
    {
      icon: Heart,
      title: "Passion",
      description: "Nous sommes passionnés par l'immobilier africain et déterminés à le révolutionner."
    },
    {
      icon: Shield,
      title: "Confiance",
      description: "La sécurité et la transparence sont au cœur de chaque transaction."
    },
    {
      icon: Users,
      title: "Communauté",
      description: "Nous construisons une communauté d'acheteurs, vendeurs et professionnels de confiance."
    },
    {
      icon: Globe,
      title: "Accessibilité",
      description: "Rendre l'immobilier accessible à tous, partout en Afrique."
    }
  ];

  const team = [
    {
      name: "Fondateur & CEO",
      role: "Direction Générale",
      description: "Visionnaire passionné par la transformation digitale de l'immobilier en Afrique."
    },
    {
      name: "Directeur Technique",
      role: "Technologie & Innovation",
      description: "Expert en développement d'applications mobiles et plateformes web innovantes."
    },
    {
      name: "Directrice Marketing",
      role: "Croissance & Expansion",
      description: "Stratège en marketing digital spécialisée dans les marchés africains."
    },
    {
      name: "Responsable Opérations",
      role: "Excellence Opérationnelle",
      description: "Garant de la qualité des services et de la satisfaction client."
    }
  ];

  const stats = [
    { value: "18+", label: "Pays africains" },
    { value: "10K+", label: "Propriétés listées" },
    { value: "50K+", label: "Utilisateurs actifs" },
    { value: "24/7", label: "Support client" }
  ];

  return (
    <div className="min-h-screen bg-muted/30 pb-32">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary via-primary to-primary/80 text-primary-foreground pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-4 px-4 py-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">À propos de LaZone</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-8">
        {/* Hero Section */}
        <div className="bg-card rounded-2xl p-6 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
            <Building2 className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">LaZone</h2>
          <p className="text-primary font-medium mb-4">Immobilier en Afrique</p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            LaZone est la première plateforme immobilière panafricaine qui connecte 
            acheteurs, vendeurs et locataires à travers tout le continent africain.
          </p>
        </div>

        {/* Mission */}
        <div className="bg-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">Notre Mission</h2>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed mb-4">
            Démocratiser l'accès à l'immobilier en Afrique en créant une plateforme 
            sécurisée, transparente et accessible à tous. Nous croyons que chaque 
            Africain mérite de trouver le logement parfait, que ce soit pour acheter, 
            vendre ou louer.
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Notre vision est de devenir la référence incontournable de l'immobilier 
            en Afrique, en offrant une expérience utilisateur exceptionnelle et des 
            outils innovants pour faciliter chaque transaction immobilière.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {stats.map((stat, index) => (
            <div key={index} className="bg-card rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-primary">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Values */}
        <div className="bg-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">Nos Valeurs</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {values.map((value, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center">
                  <value.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-medium text-sm mb-1">{value.title}</h3>
                <p className="text-xs text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Team */}
        <div className="bg-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">Notre Équipe</h2>
          </div>
          <p className="text-muted-foreground text-sm mb-6">
            Une équipe diversifiée et passionnée, unie par la volonté de transformer 
            le marché immobilier africain.
          </p>
          <div className="space-y-4">
            {team.map((member, index) => (
              <div key={index} className="flex items-start gap-4 p-3 bg-muted/50 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-sm">{member.name}</h3>
                  <p className="text-xs text-primary mb-1">{member.role}</p>
                  <p className="text-xs text-muted-foreground">{member.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coverage */}
        <div className="bg-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">Notre Présence</h2>
          </div>
          <p className="text-muted-foreground text-sm mb-4">
            LaZone est présent dans plus de 18 pays africains, couvrant l'Afrique 
            de l'Ouest, l'Afrique Centrale, l'Afrique de l'Est et l'Afrique du Nord.
          </p>
          <div className="flex flex-wrap gap-2">
            {['Côte d\'Ivoire', 'Cameroun', 'Sénégal', 'Mali', 'Guinée', 'Algérie', 
              'Tunisie', 'Égypte', 'RD Congo', 'Bénin', 'Togo', 'Burkina Faso', 
              'Madagascar', 'Rwanda', 'Tanzanie', 'Kenya', 'Maroc', 'Nigeria'].map((country) => (
              <span key={country} className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full">
                {country}
              </span>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="bg-card rounded-2xl p-6 text-center">
          <h2 className="font-semibold mb-2">Contactez-nous</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Des questions ? Notre équipe est là pour vous aider.
          </p>
          <button 
            onClick={() => navigate('/settings/support')}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Contacter le support
          </button>
        </div>

        {/* App Download Section */}
        <AppDownloadButtons variant="footer" />

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          <p>LaZone © 2024 - Tous droits réservés</p>
          <p className="mt-1">Version 1.0.0</p>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
