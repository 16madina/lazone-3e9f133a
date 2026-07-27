import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Globe, Coins, Check } from 'lucide-react';
import { useState } from 'react';

const languages = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
];

const currencies = [
  { code: 'XOF', name: 'Franc CFA (BCEAO)', symbol: 'FCFA' },
  { code: 'XAF', name: 'Franc CFA (BEAC)', symbol: 'FCFA' },
  { code: 'GNF', name: 'Franc Guinéen', symbol: 'GNF' },
  { code: 'MAD', name: 'Dirham Marocain', symbol: 'MAD' },
  { code: 'NGN', name: 'Naira Nigérian', symbol: '₦' },
  { code: 'KES', name: 'Shilling Kenyan', symbol: 'KES' },
  { code: 'ZAR', name: 'Rand Sud-Africain', symbol: 'R' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'USD', name: 'Dollar US', symbol: '$' },
];

const RegionalSettingsPage = () => {
  const navigate = useNavigate();
  const [selectedLanguage, setSelectedLanguage] = useState('fr');
  const [selectedCurrency, setSelectedCurrency] = useState('XOF');

  return (
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
          <h1 className="text-xl font-bold">Paramètres régionaux</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Language */}
        <div className="bg-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Langue
            </h2>
          </div>
          <div className="divide-y divide-border">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSelectedLanguage(lang.code)}
                className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{lang.flag}</span>
                  <span className="font-medium text-sm">{lang.name}</span>
                </div>
                {selectedLanguage === lang.code && (
                  <Check className="w-5 h-5 text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Currency */}
        <div className="bg-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold flex items-center gap-2">
              <Coins className="w-5 h-5 text-primary" />
              Devise
            </h2>
          </div>
          <div className="divide-y divide-border max-h-80 overflow-y-auto">
            {currencies.map((currency) => (
              <button
                key={currency.code}
                onClick={() => setSelectedCurrency(currency.code)}
                className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="font-medium text-sm text-left">{currency.name}</p>
                  <p className="text-xs text-muted-foreground">{currency.symbol}</p>
                </div>
                {selectedCurrency === currency.code && (
                  <Check className="w-5 h-5 text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegionalSettingsPage;
