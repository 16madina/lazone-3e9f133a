import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, HelpCircle, Home, CreditCard, Shield, MessageCircle, User, Building2, MapPin, Heart } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { SEOHead } from '@/components/SEOHead';

interface FaqCategory {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  questions: { question: string; answer: string }[];
}

const faqCategories: FaqCategory[] = [
  {
    id: "getting-started",
    title: "Premiers pas",
    icon: Home,
    questions: [
      {
        question: "Comment créer un compte sur LaZone ?",
        answer: "Pour créer un compte, cliquez sur l'icône profil en haut à droite, puis sur 'S'inscrire'. Remplissez vos informations personnelles (nom, email, pays, ville) et créez un mot de passe sécurisé. Vous recevrez un email de vérification pour activer votre compte."
      },
      {
        question: "L'application est-elle gratuite ?",
        answer: "Oui, LaZone est entièrement gratuite pour les utilisateurs. Vous pouvez rechercher des propriétés, contacter des vendeurs, publier des annonces et utiliser toutes les fonctionnalités sans frais. Des options premium pourront être proposées à l'avenir pour les professionnels."
      },
      {
        question: "Dans quels pays LaZone est-il disponible ?",
        answer: "LaZone est actuellement disponible dans plus de 18 pays africains : Côte d'Ivoire, Cameroun, Sénégal, Mali, Guinée, Algérie, Tunisie, Égypte, RD Congo, Bénin, Togo, Burkina Faso, Madagascar, Rwanda, Tanzanie, Kenya, Maroc et Nigeria. Nous continuons notre expansion."
      },
      {
        question: "Comment changer de pays sur l'application ?",
        answer: "Cliquez sur le drapeau en haut de l'écran d'accueil pour ouvrir le sélecteur de pays. Sélectionnez le pays dont vous souhaitez voir les propriétés. Les prix s'afficheront automatiquement dans la devise locale du pays sélectionné."
      }
    ]
  },
  {
    id: "publishing",
    title: "Publication d'annonces",
    icon: Building2,
    questions: [
      {
        question: "Comment publier une annonce ?",
        answer: "Cliquez sur le bouton '+' dans la barre de navigation en bas. Remplissez les informations de votre propriété : titre, type (maison, appartement, terrain, commercial), prix, surface, nombre de pièces, adresse et description. Ajoutez des photos de qualité et placez le marqueur sur la carte pour localiser précisément votre bien."
      },
      {
        question: "Combien de photos puis-je ajouter ?",
        answer: "Vous pouvez ajouter jusqu'à 10 photos par annonce. Nous recommandons d'ajouter au minimum 3-5 photos de bonne qualité montrant différentes pièces et angles de la propriété pour maximiser vos chances de contact."
      },
      {
        question: "Comment modifier ou supprimer mon annonce ?",
        answer: "Accédez à votre profil, puis à l'onglet 'Annonces'. Cliquez sur l'annonce à modifier. Vous pouvez éditer les informations, ajouter/supprimer des photos, ou désactiver temporairement l'annonce. Pour supprimer définitivement, utilisez l'option correspondante dans le menu."
      },
      {
        question: "Ma propriété n'apparaît pas sur la carte, pourquoi ?",
        answer: "Pour apparaître sur la carte, votre propriété doit avoir des coordonnées GPS précises. Lors de la publication, assurez-vous de placer correctement le marqueur sur la carte. Vous pouvez modifier l'emplacement en éditant votre annonce."
      },
      {
        question: "Quels types de biens puis-je publier ?",
        answer: "Vous pouvez publier tous types de biens immobiliers : maisons, appartements, terrains, et locaux commerciaux. Pour chaque type, indiquez s'il s'agit d'une vente, d'une location ou d'une location saisonnière."
      }
    ]
  },
  {
    id: "search",
    title: "Recherche de propriétés",
    icon: MapPin,
    questions: [
      {
        question: "Comment rechercher une propriété ?",
        answer: "Utilisez la barre de recherche en haut de l'écran d'accueil pour entrer des mots-clés. Vous pouvez aussi utiliser les filtres (icône filtre) pour affiner par type de transaction (achat/location), type de bien, et fourchette de prix. Les chips rapides permettent de filtrer par catégorie en un clic."
      },
      {
        question: "Comment utiliser la carte pour chercher ?",
        answer: "Cliquez sur l'onglet 'Carte' dans la navigation. La carte affiche toutes les propriétés de votre pays avec des marqueurs. Zoomez sur une zone qui vous intéresse et cliquez sur les marqueurs pour voir les détails. Vous pouvez aussi changer de pays via le bouton de filtre."
      },
      {
        question: "Puis-je sauvegarder des propriétés ?",
        answer: "Oui ! Cliquez sur l'icône cœur sur n'importe quelle carte de propriété pour l'ajouter à vos favoris. Retrouvez toutes vos propriétés sauvegardées dans votre profil, onglet 'Favoris'."
      },
      {
        question: "Les prix sont-ils négociables ?",
        answer: "Les prix affichés sont ceux fixés par les vendeurs. La négociation est possible directement avec le vendeur via notre messagerie. N'hésitez pas à utiliser le message rapide 'Le prix est-il négociable ?' lors de votre premier contact."
      }
    ]
  },
  {
    id: "contact",
    title: "Contact et rendez-vous",
    icon: MessageCircle,
    questions: [
      {
        question: "Comment contacter un vendeur ?",
        answer: "Sur la page de détail d'une propriété, plusieurs options s'offrent à vous : envoyer un message via notre messagerie intégrée, demander un rendez-vous de visite, appeler directement (si le vendeur a activé cette option), ou contacter via WhatsApp."
      },
      {
        question: "Comment prendre rendez-vous pour une visite ?",
        answer: "Cliquez sur 'Prendre rendez-vous' sur la page de la propriété. Sélectionnez une date et une heure qui vous conviennent, ajoutez un message optionnel. Le propriétaire recevra votre demande et pourra l'accepter ou proposer un autre créneau."
      },
      {
        question: "Où voir mes demandes de rendez-vous ou réservations ?",
        answer: "Accédez à votre profil, onglet 'Mes RDV' (mode Immobilier) ou 'Réservation' (mode Résidence). Vous y verrez toutes vos demandes (envoyées et reçues) avec leur statut : en attente, accepté ou refusé. Vous pouvez basculer entre vue liste et calendrier."
      },
      {
        question: "Puis-je partager mon numéro de téléphone ?",
        answer: "Lors d'une demande de rendez-vous, vous pouvez choisir de partager votre numéro de téléphone avec le vendeur en cochant l'option correspondante. Cela facilite la prise de contact directe si nécessaire."
      }
    ]
  },
  {
    id: "account",
    title: "Compte et profil",
    icon: User,
    questions: [
      {
        question: "Comment modifier mon profil ?",
        answer: "Allez dans votre profil, puis 'Paramètres' > 'Modifier le profil'. Vous pouvez changer votre photo, nom, téléphone et autres informations. Certaines informations comme l'email ne peuvent être modifiées pour des raisons de sécurité."
      },
      {
        question: "Comment vérifier mon email ?",
        answer: "Un email de vérification est envoyé lors de l'inscription. Si vous ne l'avez pas reçu, allez dans votre profil et cliquez sur 'Renvoyer l'email de vérification'. Vérifiez également vos spams. Un badge 'Vérifié' apparaîtra sur votre profil une fois confirmé."
      },
      {
        question: "Comment changer mon mot de passe ?",
        answer: "Accédez à 'Paramètres' > 'Modifier le mot de passe'. Entrez votre mot de passe actuel, puis le nouveau mot de passe deux fois pour confirmation. Utilisez un mot de passe fort avec lettres, chiffres et caractères spéciaux."
      },
      {
        question: "Comment supprimer mon compte ?",
        answer: "Allez dans 'Paramètres' > 'Gestion du compte' > 'Supprimer mon compte'. Attention : cette action est irréversible. Toutes vos données, annonces, messages et favoris seront définitivement supprimés."
      },
      {
        question: "Comment voir mon profil public ?",
        answer: "Cliquez sur la petite icône profil sous votre photo dans la page profil. Cela ouvre une vue de votre profil tel que les autres utilisateurs le voient, avec vos annonces actives et les avis reçus."
      }
    ]
  },
  {
    id: "social",
    title: "Fonctionnalités sociales",
    icon: Heart,
    questions: [
      {
        question: "Comment suivre un utilisateur ?",
        answer: "Visitez le profil public d'un utilisateur (en cliquant sur son nom depuis une annonce ou une conversation). Cliquez sur le bouton 'Suivre' pour recevoir ses nouvelles annonces. Gérez vos abonnements dans 'Profil' > petite icône profil > 'Abonnés/Abonnements'."
      },
      {
        question: "Comment laisser un avis sur un vendeur ?",
        answer: "Après avoir interagi avec un utilisateur (achat, location, visite), vous pouvez lui laisser un avis. Allez sur son profil public et utilisez le formulaire d'évaluation pour noter de 1 à 5 étoiles et laisser un commentaire."
      },
      {
        question: "Comment voir les avis sur un vendeur ?",
        answer: "Les avis sont visibles sur le profil public de chaque utilisateur. La note moyenne et tous les commentaires sont affichés, vous permettant d'évaluer la fiabilité d'un vendeur avant de le contacter."
      },
      {
        question: "Puis-je modifier ou supprimer mon avis ?",
        answer: "Oui, vous pouvez modifier votre avis en vous rendant sur le profil de l'utilisateur concerné. Votre avis précédent sera remplacé par le nouveau. Pour supprimer, contactez notre support."
      }
    ]
  },
  {
    id: "security",
    title: "Sécurité et signalements",
    icon: Shield,
    questions: [
      {
        question: "Comment signaler une annonce frauduleuse ?",
        answer: "Sur la page de l'annonce, cliquez sur les trois points en haut à droite, puis 'Signaler'. Sélectionnez le motif (spam, contenu inapproprié, fraude, fausse information, autre) et décrivez le problème. Notre équipe examinera le signalement sous 24-48h."
      },
      {
        question: "Comment signaler un utilisateur ?",
        answer: "Dans une conversation, ouvrez le menu (trois points) et sélectionnez 'Signaler l'utilisateur'. Décrivez le comportement problématique. Notre équipe de modération prendra les mesures nécessaires."
      },
      {
        question: "Mes données personnelles sont-elles protégées ?",
        answer: "Oui, nous prenons la protection de vos données très au sérieux. Vos informations sont chiffrées et stockées de manière sécurisée. Nous ne partageons jamais vos données avec des tiers sans votre consentement. Consultez notre politique de confidentialité pour plus de détails."
      },
      {
        question: "Comment éviter les arnaques immobilières ?",
        answer: "Quelques conseils : ne payez jamais avant d'avoir visité le bien, méfiez-vous des prix trop bas, vérifiez les documents de propriété, rencontrez le vendeur en personne, utilisez notre messagerie pour garder une trace des échanges. En cas de doute, signalez l'annonce."
      }
    ]
  },
  {
    id: "payments",
    title: "Prix et transactions",
    icon: CreditCard,
    questions: [
      {
        question: "Les prix incluent-ils les frais d'agence ?",
        answer: "Les prix affichés sont ceux définis par les vendeurs. Les frais d'agence, notaire ou autres sont généralement indiqués dans la description ou à discuter directement avec le vendeur. Vérifiez toujours le prix total avant de vous engager."
      },
      {
        question: "Puis-je payer via LaZone ?",
        answer: "Actuellement, LaZone est une plateforme de mise en relation. Les paiements se font directement entre acheteurs et vendeurs. Nous vous recommandons d'utiliser des moyens de paiement sécurisés et traçables."
      },
      {
        question: "Pourquoi les prix sont différents selon les pays ?",
        answer: "Les prix s'affichent automatiquement dans la devise locale du pays sélectionné (FCFA en Afrique de l'Ouest, Dinars en Algérie, etc.). C'est pour vous permettre de mieux comprendre les valeurs du marché local."
      },
      {
        question: "Comment négocier le prix ?",
        answer: "Contactez le vendeur via notre messagerie. Soyez courtois et expliquez votre offre. La négociation est courante dans l'immobilier, n'hésitez pas à utiliser le bouton rapide 'Le prix est-il négociable ?' pour initier la discussion."
      }
    ]
  }
];

const FaqPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredCategories = faqCategories.map(category => ({
    ...category,
    questions: category.questions.filter(q => 
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  const displayCategories = selectedCategory 
    ? filteredCategories.filter(c => c.id === selectedCategory)
    : filteredCategories;

  const totalQuestions = faqCategories.reduce((acc, cat) => acc + cat.questions.length, 0);

  return (
    <>
      <SEOHead 
        title="FAQ - Questions fréquentes"
        description="Trouvez les réponses à vos questions sur LaZone. Publication d'annonces, recherche, contact, compte et sécurité."
        canonical="/settings/faq"
      />
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
          <div>
            <h1 className="text-xl font-bold">FAQ</h1>
            <p className="text-sm text-primary-foreground/80">{totalQuestions} questions fréquentes</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Rechercher une question..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === null 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-card text-muted-foreground hover:bg-muted'
            }`}
          >
            Tout
          </button>
          {faqCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
                selectedCategory === category.id 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-card text-muted-foreground hover:bg-muted'
              }`}
            >
              <category.icon className="w-4 h-4" />
              {category.title}
            </button>
          ))}
        </div>

        {/* FAQ Categories */}
        {displayCategories.length > 0 ? (
          <div className="space-y-4">
            {displayCategories.map((category) => (
              <div key={category.id} className="bg-card rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-border flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <category.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold">{category.title}</h2>
                    <p className="text-xs text-muted-foreground">{category.questions.length} questions</p>
                  </div>
                </div>
                <Accordion type="single" collapsible className="px-4">
                  {category.questions.map((faq, index) => (
                    <AccordionItem key={index} value={`${category.id}-${index}`}>
                      <AccordionTrigger className="text-sm text-left py-4">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground pb-4">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-2xl p-8 text-center">
            <HelpCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <h3 className="font-medium mb-1">Aucun résultat</h3>
            <p className="text-sm text-muted-foreground">
              Aucune question ne correspond à votre recherche.
            </p>
          </div>
        )}

        {/* Contact Support */}
        <div className="bg-card rounded-2xl p-6 text-center">
          <HelpCircle className="w-10 h-10 mx-auto mb-3 text-primary" />
          <h3 className="font-semibold mb-2">Vous n'avez pas trouvé votre réponse ?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Notre équipe support est là pour vous aider.
          </p>
          <button 
            onClick={() => navigate('/settings/support')}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Contacter le support
          </button>
        </div>
      </div>
      </div>
    </>
  );
};

export default FaqPage;
