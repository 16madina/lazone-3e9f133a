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
  'balcon', 'balcons', // contient "con"
  'seconde', 'secondes', 'second', 'seconds', // contient "con"
  'condition', 'conditions', 'conditionné', 'conditionnée', // contient "con"
  'confort', 'confortable', 'confortables', // contient "con"  
  'concierge', 'conciergerie', // contient "con"
  'connexion', 'connecté', 'connectée', // contient "con"
  'construction', 'construit', 'construite', // contient "con"
  'conservé', 'conservée', 'conservation', // contient "con"
  'contemporain', 'contemporaine', // contient "con"
  'contrat', 'contrats', 'contact', 'contacts', // contient "con"
  'contrôle', 'contrôlé', // contient "con"
  'convivial', 'conviviale', // contient "con"
  'économie', 'économique', 'économiques', // contient "con" via normalisation
  'réception', // contient "con" via normalisation
  'conception', // contient "con"
  'reconnu', 'reconnue', // contient "con"
  'occasion', 'occasions', // contient "con"
  'bacon', // contient "con"
  'icone', 'icône', // contient "con"
  'découvrir', 'découverte', // contient potentiellement des patterns
  'reculé', 'reculée', // contient "cul"
  'culte', 'culture', 'culturel', 'culturelle', // contient "cul"
  'particulier', 'particulière', 'particuliers', // contient "cul"
  'véhicule', 'véhicules', // contient "cul"
  'circuler', 'circulation', // contient "cul"
  'calculer', 'calcul', // contient "cul"
  'spectaculaire', // contient "cul"
  'masculin', 'masculine', // contient "cul"
  'difficulté', 'difficultés', // contient "cul"
  'faculté', 'facultatif', // contient "cul"
  'inculpé', 'inculquer', // contient "cul"
  'bascule', 'basculer', // contient "cul"
  'articulation', // contient "cul"
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
