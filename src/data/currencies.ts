export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

// Map country code to currency
export const countryCurrencyMap: Record<string, Currency> = {
  // Zone CFA BCEAO (Franc CFA - XOF)
  'BJ': { code: 'XOF', name: 'Franc CFA', symbol: 'FCFA' }, // Bénin
  'BF': { code: 'XOF', name: 'Franc CFA', symbol: 'FCFA' }, // Burkina Faso
  'CI': { code: 'XOF', name: 'Franc CFA', symbol: 'FCFA' }, // Côte d'Ivoire
  'GW': { code: 'XOF', name: 'Franc CFA', symbol: 'FCFA' }, // Guinée-Bissau
  'ML': { code: 'XOF', name: 'Franc CFA', symbol: 'FCFA' }, // Mali
  'NE': { code: 'XOF', name: 'Franc CFA', symbol: 'FCFA' }, // Niger
  'SN': { code: 'XOF', name: 'Franc CFA', symbol: 'FCFA' }, // Sénégal
  'TG': { code: 'XOF', name: 'Franc CFA', symbol: 'FCFA' }, // Togo
  
  // Zone CFA BEAC (Franc CFA - XAF)
  'CM': { code: 'XAF', name: 'Franc CFA', symbol: 'FCFA' }, // Cameroun
  'CF': { code: 'XAF', name: 'Franc CFA', symbol: 'FCFA' }, // Centrafrique
  'TD': { code: 'XAF', name: 'Franc CFA', symbol: 'FCFA' }, // Tchad
  'CG': { code: 'XAF', name: 'Franc CFA', symbol: 'FCFA' }, // Congo
  'GQ': { code: 'XAF', name: 'Franc CFA', symbol: 'FCFA' }, // Guinée équatoriale
  'GA': { code: 'XAF', name: 'Franc CFA', symbol: 'FCFA' }, // Gabon
  
  // Autres pays
  'DZ': { code: 'DZD', name: 'Dinar algérien', symbol: 'DA' },
  'AO': { code: 'AOA', name: 'Kwanza', symbol: 'Kz' },
  'BW': { code: 'BWP', name: 'Pula', symbol: 'P' },
  'BI': { code: 'BIF', name: 'Franc burundais', symbol: 'FBu' },
  'CV': { code: 'CVE', name: 'Escudo capverdien', symbol: '$' },
  'KM': { code: 'KMF', name: 'Franc comorien', symbol: 'FC' },
  'CD': { code: 'CDF', name: 'Franc congolais', symbol: 'FC' },
  'DJ': { code: 'DJF', name: 'Franc djiboutien', symbol: 'Fdj' },
  'EG': { code: 'EGP', name: 'Livre égyptienne', symbol: 'E£' },
  'ER': { code: 'ERN', name: 'Nakfa', symbol: 'Nfk' },
  'SZ': { code: 'SZL', name: 'Lilangeni', symbol: 'L' },
  'ET': { code: 'ETB', name: 'Birr', symbol: 'Br' },
  'GM': { code: 'GMD', name: 'Dalasi', symbol: 'D' },
  'GH': { code: 'GHS', name: 'Cedi', symbol: 'GH₵' },
  'GN': { code: 'GNF', name: 'Franc guinéen', symbol: 'FG' },
  'KE': { code: 'KES', name: 'Shilling kényan', symbol: 'KSh' },
  'LS': { code: 'LSL', name: 'Loti', symbol: 'L' },
  'LR': { code: 'LRD', name: 'Dollar libérien', symbol: 'L$' },
  'LY': { code: 'LYD', name: 'Dinar libyen', symbol: 'LD' },
  'MG': { code: 'MGA', name: 'Ariary', symbol: 'Ar' },
  'MW': { code: 'MWK', name: 'Kwacha', symbol: 'MK' },
  'MR': { code: 'MRU', name: 'Ouguiya', symbol: 'UM' },
  'MU': { code: 'MUR', name: 'Roupie mauricienne', symbol: '₨' },
  'MA': { code: 'MAD', name: 'Dirham', symbol: 'DH' },
  'MZ': { code: 'MZN', name: 'Metical', symbol: 'MT' },
  'NA': { code: 'NAD', name: 'Dollar namibien', symbol: 'N$' },
  'NG': { code: 'NGN', name: 'Naira', symbol: '₦' },
  'RW': { code: 'RWF', name: 'Franc rwandais', symbol: 'FRw' },
  'ST': { code: 'STN', name: 'Dobra', symbol: 'Db' },
  'SC': { code: 'SCR', name: 'Roupie seychelloise', symbol: '₨' },
  'SL': { code: 'SLE', name: 'Leone', symbol: 'Le' },
  'SO': { code: 'SOS', name: 'Shilling somalien', symbol: 'Sh' },
  'ZA': { code: 'ZAR', name: 'Rand', symbol: 'R' },
  'SS': { code: 'SSP', name: 'Livre sud-soudanaise', symbol: '£' },
  'SD': { code: 'SDG', name: 'Livre soudanaise', symbol: 'LS' },
  'TZ': { code: 'TZS', name: 'Shilling tanzanien', symbol: 'TSh' },
  'TN': { code: 'TND', name: 'Dinar tunisien', symbol: 'DT' },
  'UG': { code: 'UGX', name: 'Shilling ougandais', symbol: 'USh' },
  'ZM': { code: 'ZMW', name: 'Kwacha', symbol: 'ZK' },
  'ZW': { code: 'ZWL', name: 'Dollar zimbabwéen', symbol: 'Z$' },
};

export const formatPriceWithCurrency = (price: number, countryCode: string | null): string => {
  const currency = countryCode ? countryCurrencyMap[countryCode] : null;
  
  if (!currency) {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  }
  
  return new Intl.NumberFormat('fr-FR').format(price) + ' ' + currency.symbol;
};

export const getCurrencyByCountry = (countryCode: string | null): Currency | null => {
  if (!countryCode) return null;
  return countryCurrencyMap[countryCode] || null;
};

// Taux de change approximatifs USD vers devises locales (mis à jour périodiquement)
// Ces taux sont indicatifs et servent d'estimation pour l'affichage
export const usdExchangeRates: Record<string, number> = {
  // Franc CFA (XOF/XAF) - environ 615 FCFA pour 1 USD
  'XOF': 615,
  'XAF': 615,
  
  // Autres devises africaines (taux approximatifs décembre 2024)
  'DZD': 135,    // Dinar algérien
  'AOA': 830,    // Kwanza angolais
  'BWP': 13.5,   // Pula botswanais
  'BIF': 2850,   // Franc burundais
  'CVE': 102,    // Escudo cap-verdien
  'KMF': 455,    // Franc comorien
  'CDF': 2750,   // Franc congolais
  'DJF': 178,    // Franc djiboutien
  'EGP': 31,     // Livre égyptienne
  'ERN': 15,     // Nakfa érythréen
  'SZL': 18.5,   // Lilangeni swazi
  'ETB': 56,     // Birr éthiopien
  'GMD': 67,     // Dalasi gambien
  'GHS': 12.5,   // Cedi ghanéen
  'GNF': 8600,   // Franc guinéen
  'KES': 153,    // Shilling kényan
  'LSL': 18.5,   // Loti lesothan
  'LRD': 187,    // Dollar libérien
  'LYD': 4.85,   // Dinar libyen
  'MGA': 4500,   // Ariary malgache
  'MWK': 1680,   // Kwacha malawite
  'MRU': 39.5,   // Ouguiya mauritanien
  'MUR': 44,     // Roupie mauricienne
  'MAD': 10,     // Dirham marocain
  'MZN': 64,     // Metical mozambicain
  'NAD': 18.5,   // Dollar namibien
  'NGN': 1550,   // Naira nigérian
  'RWF': 1250,   // Franc rwandais
  'STN': 23,     // Dobra santoméen
  'SCR': 13.5,   // Roupie seychelloise
  'SLE': 22.5,   // Leone sierra-léonais
  'SOS': 570,    // Shilling somalien
  'ZAR': 18.5,   // Rand sud-africain
  'SSP': 1300,   // Livre sud-soudanaise
  'SDG': 600,    // Livre soudanaise
  'TZS': 2500,   // Shilling tanzanien
  'TND': 3.1,    // Dinar tunisien
  'UGX': 3750,   // Shilling ougandais
  'ZMW': 26,     // Kwacha zambien
  'ZWL': 14000,  // Dollar zimbabwéen
};

/**
 * Convertit un prix USD en devise locale
 * @param usdPrice Prix en USD (ex: 14.99)
 * @param countryCode Code pays ISO (ex: "CI" pour Côte d'Ivoire)
 * @returns Prix estimé en devise locale formaté, ou null si pas de conversion disponible
 */
export const convertUsdToLocal = (usdPrice: number, countryCode: string | null): string | null => {
  if (!countryCode) return null;
  
  const currency = countryCurrencyMap[countryCode];
  if (!currency) return null;
  
  const rate = usdExchangeRates[currency.code];
  if (!rate) return null;
  
  const localPrice = Math.round(usdPrice * rate);
  
  // Formater avec séparateurs de milliers
  const formattedPrice = new Intl.NumberFormat('fr-FR').format(localPrice);
  
  return `~${formattedPrice} ${currency.symbol}`;
};

/**
 * Parse un prix affiché par StoreKit (ex: "$14.99") et retourne le montant en USD
 */
export const parseUsdPrice = (displayPrice: string): number | null => {
  // Enlever le symbole $ et convertir en nombre
  const match = displayPrice.match(/[\d.,]+/);
  if (!match) return null;
  
  // Remplacer la virgule par un point pour les formats européens
  const priceStr = match[0].replace(',', '.');
  const price = parseFloat(priceStr);
  
  return isNaN(price) ? null : price;
};
