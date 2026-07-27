import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Shield, Users, Baby, ChevronRight } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';

const legalPages = [
  {
    id: 'terms',
    title: "Conditions d'utilisation",
    description: "Règles d'utilisation de LaZone",
    icon: FileText,
  },
  {
    id: 'privacy',
    title: "Politique de confidentialité",
    description: "Comment nous protégeons vos données",
    icon: Shield,
  },
  {
    id: 'community',
    title: "Règles de la communauté",
    description: "Bonnes pratiques et comportements",
    icon: Users,
  },
  {
    id: 'child-safety',
    title: "Sécurité et protection (enfants)",
    description: "Protection des mineurs",
    icon: Baby,
  },
];

const LegalPage = () => {
  const navigate = useNavigate();

  return (
    <>
      <SEOHead 
        title="Mentions légales"
        description="Consultez les mentions légales, conditions d'utilisation et politique de confidentialité de LaZone."
        canonical="/settings/legal"
      />
      <div className="min-h-screen bg-muted/30 pb-32">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary via-primary to-primary/80 text-primary-foreground pt-[var(--app-sat)]">
        <div className="flex items-center gap-4 px-4 py-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Mentions légales</h1>
        </div>
      </div>

      <div className="px-4 py-6">
        <div className="bg-card rounded-2xl overflow-hidden divide-y divide-border">
          {legalPages.map((page) => (
            <button
              key={page.id}
              onClick={() => navigate(`/settings/legal/${page.id}`)}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <page.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">{page.title}</p>
                  <p className="text-xs text-muted-foreground">{page.description}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Dernière mise à jour : Décembre 2025
        </p>
      </div>
      </div>
    </>
  );
};

export default LegalPage;
