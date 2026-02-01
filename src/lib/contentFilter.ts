// Content filtering utility for inappropriate words
// This list covers French inappropriate content relevant to African markets

const inappropriateWords = [
  // Insultes et vulgarités (French)
  'merde', 'putain', 'connard', 'connasse', 'salope', 'enculé', 'nique', 'niquer',
  'bordel', 'foutre', 'baiser', 'pute', 'cul', 'bite', 'couille', 'chier',
  'enfoiré', 'bâtard', 'abruti', 'crétin', 'débile', 'con', 'conne', 'idiot',
  'imbécile', 'taré', 'tarlouze', 'pd', 'pédé', 'gouine', 'tantouze',
  
  // Termes racistes et discriminatoires
  'négro', 'nègre', 'bougnoule', 'bamboula', 'macaque', 'singe',
  
  // Arnaques et fraudes
  'arnaque', 'escroquerie', 'faux papiers', 'documents falsifiés',
  
  // Contenu adulte
  'xxx', 'porno', 'pornographie', 'sexe', 'escort', 'prostitution',
  'massage érotique', 'rencontre coquine', 'plan cul',
  
  // Drogues
  'drogue', 'cannabis', 'cocaïne', 'héroïne', 'dealer', 'shit', 'weed',
  
  // Violence
  'tuer', 'assassiner', 'meurtre', 'violence', 'terroriste', 'bombe',
  
  // Spam indicators
  'gagnez argent facile', 'devenir riche', 'bitcoin gratuit', 'crypto gratuit',
  'cliquez ici', 'offre limitée', 'urgent',
];

// Variations and leetspeak patterns
const leetSpeakMap: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '@': 'a',
  '$': 's',
};

function normalizeLeetSpeak(text: string): string {
  let normalized = text.toLowerCase();
  for (const [leet, letter] of Object.entries(leetSpeakMap)) {
    normalized = normalized.split(leet).join(letter);
  }
  return normalized;
}

function removeAccents(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeText(text: string): string {
  let normalized = text.toLowerCase();
  normalized = removeAccents(normalized);
  normalized = normalizeLeetSpeak(normalized);
  // Remove repeated characters (e.g., "meeeerde" -> "merde")
  normalized = normalized.replace(/(.)\1{2,}/g, '$1$1');
  // Remove spaces between letters (e.g., "m e r d e" -> "merde")
  normalized = normalized.replace(/\s+/g, ' ');
  return normalized;
}

export interface ContentFilterResult {
  isClean: boolean;
  flaggedWords: string[];
  originalText: string;
  cleanedText?: string;
}

// Phrases autorisées (contexte légitime, comme les restrictions d'hébergement)
const allowedPhrases = [
  'pas de drogue',
  'pas d\'alcool',
  'non fumeur',
  'pas de fête',
  'pas de violence',
  'interdit drogue',
  'drogue interdite',
  'alcool interdit',
  'sans drogue',
  'sans alcool',
];

// Mots légitimes contenant des sous-chaînes inappropriées (faux positifs)
const allowedWords = [
  // Mots contenant "con"
  'balcon', 'balcons', 'balconnet',
  'seconde', 'secondes', 'second', 'seconds', 'secondaire',
  'condition', 'conditions', 'conditionné', 'conditionnée', 'conditionner', 'climatisation',
  'confort', 'confortable', 'confortables', 'confortablement', 'inconfort',
  'concierge', 'conciergerie',
  'connexion', 'connecté', 'connectée', 'connecter', 'déconnecté',
  'construction', 'construit', 'construite', 'construire', 'reconstruction',
  'conservé', 'conservée', 'conservation', 'conserver',
  'contemporain', 'contemporaine', 'contemporains',
  'contrat', 'contrats', 'contact', 'contacts', 'contacter',
  'contrôle', 'contrôlé', 'contrôler', 'contrôleur',
  'convivial', 'conviviale', 'convivialité',
  'économie', 'économique', 'économiques', 'économiser',
  'réception', 'réceptionniste',
  'conception', 'concevoir',
  'reconnu', 'reconnue', 'reconnaître', 'reconnaissance',
  'occasion', 'occasions', 'occasionnel',
  'bacon', 'icone', 'icône', 'icônes',
  'découvrir', 'découverte', 'découvertes',
  'confiance', 'confident', 'confidentiel', 'confidentialité',
  'confirmer', 'confirmation', 'confirmé',
  'congé', 'congés', 'congélateur',
  'conseil', 'conseils', 'conseiller', 'conseillé',
  'consigne', 'consignes',
  'consolider', 'consolidé', 'consolidation',
  'consommation', 'consommer', 'consommateur',
  'constant', 'constante', 'constamment',
  'consulter', 'consultation', 'consultant',
  'contenu', 'contenus', 'contenir', 'conteneur',
  'contexte', 'contextuel',
  'continuer', 'continu', 'continuité',
  'contribuer', 'contribution', 'contributeur',
  'convention', 'conventionnel', 'conventions',
  'conversation', 'converser',
  'convertir', 'conversion', 'converti',
  'convaincre', 'convaincu', 'convaincant',
  'convenir', 'convenable', 'convenance',
  'inconvénient', 'inconvénients',
  'économe', 'économat',
  'icône', 'iconique',
  'abricot', 'maçon', 'maçonnerie', 'façon', 'façons', 'leçon', 'leçons',
  'garçon', 'garçons', 'garçonnière',
  'rançon', 'ançois', 'français', 'française',
  
  // Mots contenant "cul"
  'reculé', 'reculée', 'reculer',
  'culte', 'culture', 'culturel', 'culturelle', 'culturels', 'multiculturel',
  'particulier', 'particulière', 'particuliers', 'particulièrement',
  'véhicule', 'véhicules', 'véhiculer',
  'circuler', 'circulation', 'circulaire',
  'calculer', 'calcul', 'calculatrice', 'calculateur',
  'spectaculaire', 'spectaculairement',
  'masculin', 'masculine', 'masculinité',
  'difficulté', 'difficultés', 'difficile',
  'faculté', 'facultatif', 'facultative',
  'inculpé', 'inculquer',
  'bascule', 'basculer', 'basculement',
  'articulation', 'articuler', 'articulé',
  'curriculum', 'curricula',
  'minuscule', 'majuscule',
  'ridicule', 'ridiculiser',
  'molécule', 'moléculaire',
  'véhiculaire',
  'inculte', 'inculture',
  'occulte', 'occulter',
  'sculpture', 'sculpteur', 'sculpter', 'sculpté',
  'agricole', 'agriculture', 'agriculteur',
  'apiculture', 'apiculteur',
  'aviculture',
  'horticulture', 'horticulteur',
  'pisciculture',
  'sylviculture',
  'aquaculture',
  
  // Mots contenant "bite"
  'habite', 'habiter', 'habitant', 'habitants', 'habitat', 'habitation', 'habitable',
  'cohabiter', 'cohabitation',
  'orbite', 'orbital', 'orbitale',
  'arbitre', 'arbitrer', 'arbitrage', 'arbitraire',
  
  // Mots contenant "couille"
  'bouilloire', 'bouillir', 'bouillant', 'bouillante', 'bouillon', 'bouillonner',
  'aiguille', 'aiguilles', 'aiguiller', 'aiguillage',
  'cueillir', 'cueillette',
  'accueillir', 'accueil', 'accueillant', 'accueillante',
  'recueillir', 'recueil',
  'feuille', 'feuilles', 'feuillage', 'feuilleter',
  'mouiller', 'mouillé', 'mouillée',
  'rouille', 'rouillé', 'rouiller',
  'brouillon', 'brouillard',
  'chatouiller', 'chatouillement',
  'fouiller', 'fouille', 'fouilles',
  'grenouille', 'grenouilles',
  'citrouille',
  'débrouiller', 'débrouillard',
  'embrouiller', 'embrouillé',
  'gribouiller', 'gribouillage',
  'patrouille', 'patrouiller',
  'quille', 'quilles', 'quilleur',
  'vanille', 'vanillé',
  
  // Mots contenant "chier"
  'fichier', 'fichiers',
  'afficher', 'affiche', 'affiches', 'affichage',
  'clocher', 'clochers',
  'cocher', 'cochée', 'décochée',
  'rocher', 'rochers', 'rocheux',
  'plancher', 'planchers',
  'archer', 'archers',
  'boucher', 'boucherie',
  'cacher', 'caché', 'cachée', 'cachette',
  'approcher', 'approche', 'rapprocher',
  'empêcher', 'empêchement',
  'chercher', 'chercheur', 'rechercher', 'recherche',
  'déclencher', 'déclenchement', 'déclencheur',
  'marcher', 'marche', 'marcheur', 'démarche',
  'toucher', 'touchant', 'retoucher',
  'trébucher',
  'accrocher', 'accroche', 'décrocher',
  'brancher', 'branchement', 'débrancher',
  
  // Mots contenant "pute"
  'dispute', 'disputer', 'disputé',
  'réputation', 'réputé', 'réputée',
  'imputer', 'imputation',
  'amputer', 'amputation',
  'député', 'députés', 'députée',
  'computer', 'computeur',
  'permuter', 'permutation',
  'supputer', 'supputation',
  
  // Mots contenant "tuer"
  'situer', 'situé', 'située', 'situation',
  'habituer', 'habitué', 'habitude', 'habituel',
  'accentuer', 'accentué', 'accentuation',
  'effectuer', 'effectué',
  'fluctuer', 'fluctuation',
  'ponctuer', 'ponctuation', 'ponctuel',
  'perpétuer', 'perpétuel',
  'évaluer', 'évaluation', 'évaluateur',
  'continuer', 'continu', 'continuité',
  'constituer', 'constitution', 'constitué',
  'instituer', 'institution', 'institut',
  'restituer', 'restitution',
  'substituer', 'substitution', 'substitut',
  'actuel', 'actuelle', 'actuellement', 'actualité',
  'virtuel', 'virtuelle', 'virtuellement',
  'mutuel', 'mutuelle', 'mutuellement',
  'statuer', 'statue', 'statues', 'statuette',
  'tatouage', 'tatouer', 'tatoué',
  
  // Mots contenant "nique" 
  'pique-nique', 'piquenique', 'piqueniquer',
  'unique', 'uniquement', 'unicité',
  'technique', 'techniques', 'technicien', 'technicienne', 'techniquement',
  'chronique', 'chroniques', 'chroniqueur',
  'communiquer', 'communication', 'communiqué',
  'botanique', 'botaniques', 'botaniste',
  'mécanique', 'mécaniques', 'mécanicien',
  'électronique', 'électroniques',
  'économique', 'économiques',
  'historique', 'historiques', 'historiquement',
  'géographique', 'géographiques',
  'pratique', 'pratiques', 'pratiquement', 'pratiquer',
  'authentique', 'authentiques', 'authenticité',
  'artistique', 'artistiques',
  'fantastique', 'fantastiques',
  'magnifique', 'magnifiques', 'magnifiquement',
  'classique', 'classiques',
  'romantique', 'romantiques', 'romantisme',
  'exotique', 'exotiques', 'exotisme',
  'rustique', 'rustiques',
  'tropique', 'tropiques', 'tropical', 'tropicale',
  'dynamique', 'dynamiques', 'dynamisme',
  'panoramique', 'panoramiques',
  'céramique', 'céramiques',
  'organique', 'organiques',
  'biologique', 'biologiques', 'biologiquement',
  'écologique', 'écologiques', 'écologiquement',
  'symbolique', 'symboliques',
  'ethnique', 'ethniques',
  'clinique', 'cliniques',
  'comique', 'comiques',
  'ironique', 'ironiques', 'ironiquement',
  'cynique', 'cyniques',
  'tonique', 'toniques',
  'phonique', 'phoniques',
  'sonique', 'soniques',
  'harmonique', 'harmoniques',
  'symphonique', 'symphoniques',
  'olympique', 'olympiques',
  'académique', 'académiques',
  'scientifique', 'scientifiques', 'scientifiquement',
  'spécifique', 'spécifiques', 'spécifiquement',
  'pacifique', 'pacifiques',
  'juridique', 'juridiques',
  'médique', 'médical', 'médicaux',
  'logique', 'logiques', 'logiquement',
  'magique', 'magiques',
  'tragique', 'tragiques', 'tragiquement',
  'stratégique', 'stratégiques',
  'énergétique', 'énergétiques',
  'esthétique', 'esthétiques',
  'politique', 'politiques', 'politiquement',
  'domestique', 'domestiques',
  'plastique', 'plastiques',
  'élastique', 'élastiques',
  'acoustique', 'acoustiques',
  'aquatique', 'aquatiques',
  'automatique', 'automatiques', 'automatiquement',
  'informatique', 'informatiques', 'informaticien',
  'mathématique', 'mathématiques',
  'thématique', 'thématiques',
  'systématique', 'systématiques',
  'problématique', 'problématiques',
  'pragmatique', 'pragmatiques',
  'diplomatique', 'diplomatiques',
  'caractéristique', 'caractéristiques',
  'statistique', 'statistiques',
  'linguistique', 'linguistiques',
  'touristique', 'touristiques',
  'artistique', 'artistiques',
  'réaliste', 'réalistique',
  'optimiste', 'optimistique',
  'pessimiste',
  'futuriste', 'futuristique',
  'minimaliste', 'minimalistique',
  
  // Mots contenant "bombe"
  'bombé', 'bombée', 'bombement',
  'plomberie', 'plombier', 'plomb',
  'colombe', 'colombes',
  'rhomboïde',
  
  // Mots contenant "taré"
  'notaire', 'notariat', 'notarié',
  'guitare', 'guitares', 'guitariste',
  'militaire', 'militaires',
  'solitaire', 'solitaires',
  'solidaire', 'solidaires', 'solidarité',
  'sanitaire', 'sanitaires',
  'unitaire', 'unitaires',
  'prioritaire', 'prioritaires',
  'alimentaire', 'alimentaires',
  'élémentaire', 'élémentaires',
  'supplémentaire', 'supplémentaires',
  'complémentaire', 'complémentaires',
  'documentaire', 'documentaires',
  'budgétaire', 'budgétaires',
  'propriétaire', 'propriétaires',
  'locataire', 'locataires',
  'secrétaire', 'secrétaires', 'secrétariat',
  'commentaire', 'commentaires',
  'anniversaire', 'anniversaires',
  'nécessaire', 'nécessaires',
  'volontaire', 'volontaires', 'volontariat',
  'involontaire', 'involontaires',
  'autoritaire', 'autoritaires',
  'communautaire', 'communautaires',
  'humanitaire', 'humanitaires',
  'héréditaire', 'héréditaires',
  'publicitaire', 'publicitaires',
  'universitaire', 'universitaires',
  'sédentaire', 'sédentaires',
  'intérimaire', 'intérimaires',
  'imaginaire', 'imaginaires',
  'ordinaire', 'ordinaires', 'extraordinaire',
  'culinaire', 'culinaires',
  'liminaire', 'préliminaire', 'préliminaires',
  'originaire', 'originaires',
  'disciplinaire', 'disciplinaires',
  'vétérinaire', 'vétérinaires',
  'luminaire', 'luminaires',
  'binaire', 'binaires',
  'tertiaire', 'tertiaires',
  'secondaire', 'secondaires',
  'primaire', 'primaires',
  
  // Mots contenant "pd" ou "pédé"
  'expédier', 'expédition', 'expéditeur', 'expédié',
  'pédestre', 'pédestres',
  'pédagogie', 'pédagogique', 'pédagogiques', 'pédagogue',
  'pédale', 'pédales', 'pédaler', 'pédalier',
  'pédiatrie', 'pédiatre', 'pédiatrique',
  'encyclopédie', 'encyclopédique',
  'orthopédie', 'orthopédique',
  'bipède', 'bipèdes',
  'quadrupède', 'quadrupèdes',
];

/**
 * Remove allowed phrases from text before filtering
 */
function removeAllowedPhrases(text: string): string {
  let cleanedText = text.toLowerCase();
  for (const phrase of allowedPhrases) {
    const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    cleanedText = cleanedText.replace(regex, '');
  }
  return cleanedText;
}

/**
 * Remove allowed words (legitimate words that contain inappropriate substrings)
 */
function removeAllowedWords(text: string): string {
  let cleanedText = text;
  for (const word of allowedWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    cleanedText = cleanedText.replace(regex, '');
  }
  return cleanedText;
}

/**
 * Check if text contains inappropriate content
 */
export function filterContent(text: string): ContentFilterResult {
  if (!text || typeof text !== 'string') {
    return { isClean: true, flaggedWords: [], originalText: text };
  }

  // Remove allowed phrases and words before checking for inappropriate content
  const textWithoutAllowedPhrases = removeAllowedPhrases(text);
  const textWithoutAllowedWords = removeAllowedWords(textWithoutAllowedPhrases);
  const normalizedText = normalizeText(textWithoutAllowedWords);
  const flaggedWords: string[] = [];

  for (const word of inappropriateWords) {
    const normalizedWord = normalizeText(word);
    // Check for whole word match or as part of compound words
    const regex = new RegExp(`\\b${normalizedWord}\\b|${normalizedWord}`, 'gi');
    if (regex.test(normalizedText)) {
      flaggedWords.push(word);
    }
  }

  return {
    isClean: flaggedWords.length === 0,
    flaggedWords: [...new Set(flaggedWords)], // Remove duplicates
    originalText: text,
  };
}

/**
 * Check multiple text fields at once
 */
export function filterMultipleFields(fields: Record<string, string>): {
  isClean: boolean;
  results: Record<string, ContentFilterResult>;
  allFlaggedWords: string[];
} {
  const results: Record<string, ContentFilterResult> = {};
  const allFlaggedWords: string[] = [];

  for (const [fieldName, text] of Object.entries(fields)) {
    const result = filterContent(text);
    results[fieldName] = result;
    allFlaggedWords.push(...result.flaggedWords);
  }

  return {
    isClean: allFlaggedWords.length === 0,
    results,
    allFlaggedWords: [...new Set(allFlaggedWords)],
  };
}

/**
 * Get a user-friendly message for content violations
 */
export function getContentViolationMessage(flaggedWords: string[]): string {
  if (flaggedWords.length === 0) return '';
  
  return `Votre contenu contient des termes inappropriés et ne peut pas être publié. Veuillez modifier votre texte et réessayer.`;
}
