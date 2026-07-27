import { useNavigate } from 'react-router-dom';
import { ArrowLeft, HelpCircle, MessageCircle, Info, FileText, Search, GraduationCap } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useTutorial } from '@/hooks/useTutorial';
import { SEOHead } from '@/components/SEOHead';

const faqs = [
  {
    question: "Comment publier une annonce ?",
    answer: "Pour publier une annonce, cliquez sur le bouton '+' dans la barre de navigation, remplissez les informations de votre propriété, ajoutez des photos et validez votre annonce."
  },
  {
    question: "Comment contacter un vendeur ?",
    answer: "Sur la page de détail d'une propriété, cliquez sur le bouton 'Contacter' pour envoyer un message au vendeur via notre messagerie intégrée."
  },
  {
    question: "Comment modifier mon annonce ?",
    answer: "Allez dans votre profil, onglet 'Annonces' (ou 'Séjours' en mode Résidence), puis cliquez sur l'annonce que vous souhaitez modifier."
  },
  {
    question: "Comment supprimer mon compte ?",
    answer: "Dans les paramètres, allez dans 'Gestion du compte' puis cliquez sur 'Supprimer mon compte'. Cette action est irréversible."
  },
  {
    question: "Comment vérifier mon email ?",
    answer: "Un email de vérification vous est envoyé lors de l'inscription. Cliquez sur le lien dans l'email pour vérifier votre compte."
  },
  {
    question: "Comment signaler une annonce frauduleuse ?",
    answer: "Sur la page de l'annonce, cliquez sur les trois points en haut à droite puis sélectionnez 'Signaler'. Notre équipe examinera le signalement."
  },
  {
    question: "Les frais de service sont-ils inclus dans les prix ?",
    answer: "Les prix affichés sont ceux définis par les vendeurs. Les frais de service éventuels seront indiqués séparément lors de la transaction."
  },
  {
    question: "Comment ajouter une propriété aux favoris ?",
    answer: "Cliquez sur l'icône cœur sur la carte de propriété ou sur la page de détail pour l'ajouter à vos favoris."
  },
];

const HelpCenterPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { startTutorial, resetTutorial, hasCompletedTutorial } = useTutorial();

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartTutorial = () => {
    resetTutorial();
    navigate('/');
    setTimeout(() => {
      startTutorial();
    }, 500);
  };

  return (
    <>
      <SEOHead 
        title="Centre d'aide"
        description="Besoin d'aide ? Consultez notre centre d'aide LaZone pour des guides et réponses à vos questions."
        canonical="/settings/help"
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
          <h1 className="text-xl font-bold">Centre d'aide</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Rechercher dans l'aide..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tutorial Button */}
        <button 
          onClick={handleStartTutorial}
          className="w-full bg-gradient-to-r from-primary via-primary to-primary/80 p-4 rounded-2xl flex items-center gap-4 hover:opacity-90 transition-opacity"
        >
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="flex-1 text-left">
            <span className="font-semibold text-primary-foreground block">Tutoriel interactif</span>
            <span className="text-sm text-primary-foreground/80">
              {hasCompletedTutorial ? 'Revoir le guide' : 'Découvrir l\'application'}
            </span>
          </div>
        </button>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => navigate('/settings/faq')}
            className="bg-card p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-muted/50 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-primary" />
            </div>
            <span className="font-medium text-sm">FAQ complète</span>
          </button>
          <button 
            onClick={() => navigate('/settings/support')}
            className="bg-card p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-muted/50 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-primary" />
            </div>
            <span className="font-medium text-sm">Contacter le support</span>
          </button>
          <button 
            onClick={() => navigate('/settings/about')}
            className="bg-card p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-muted/50 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Info className="w-6 h-6 text-primary" />
            </div>
            <span className="font-medium text-sm">À propos de LaZone</span>
          </button>
          <button 
            onClick={() => navigate('/settings/legal')}
            className="bg-card p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-muted/50 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <FileText className="w-6 h-6 text-muted-foreground" />
            </div>
            <span className="font-medium text-sm">Mentions légales</span>
          </button>
        </div>

        {/* FAQ */}
        <div className="bg-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Questions fréquentes
            </h2>
          </div>
          <Accordion type="single" collapsible className="px-4">
            {filteredFaqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-sm text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          {filteredFaqs.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <HelpCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Aucun résultat trouvé</p>
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  );
};

export default HelpCenterPage;
