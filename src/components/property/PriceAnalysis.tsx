import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, TrendingUp, TrendingDown, Minus, AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface PriceAnalysisProps {
  price: number;
  city: string;
  country: string;
  propertyType: 'house' | 'apartment' | 'land' | 'commercial';
  transactionType: 'sale' | 'rent';
  listingType: 'long_term' | 'short_term';
  area: number;
  bedrooms?: number;
  pricePerNight?: number;
  variant?: 'compact' | 'full';
}

interface AnalysisResult {
  rating: 'competitive' | 'slightly_high' | 'high' | 'very_high' | 'below_market' | 'unknown';
  confidence: 'high' | 'medium' | 'low';
  percentageVsMarket: number;
  summary: string;
  details: string;
}

interface MarketStats {
  avgPrice: number;
  avgPricePerSqm: number;
  sampleSize: number;
  avgPricePerNight?: number;
}

const ratingConfig = {
  competitive: {
    label: 'Prix compétitif',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    icon: TrendingDown,
  },
  below_market: {
    label: 'En dessous du marché',
    color: 'text-green-600',
    bgColor: 'bg-green-600/10',
    borderColor: 'border-green-600/30',
    icon: TrendingDown,
  },
  slightly_high: {
    label: 'Légèrement élevé',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    icon: Minus,
  },
  high: {
    label: 'Prix élevé',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    icon: TrendingUp,
  },
  very_high: {
    label: 'Prix très élevé',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    icon: TrendingUp,
  },
  unknown: {
    label: 'Non déterminé',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    borderColor: 'border-muted',
    icon: AlertCircle,
  },
};

export const PriceAnalysis = ({
  price,
  city,
  country,
  propertyType,
  transactionType,
  listingType,
  area,
  bedrooms,
  pricePerNight,
  variant = 'full',
}: PriceAnalysisProps) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [marketStats, setMarketStats] = useState<MarketStats | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const analyzePrice = async () => {
    if (!price || !city || !area) {
      toast({
        title: 'Informations manquantes',
        description: 'Veuillez renseigner le prix, la ville et la superficie.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-price', {
        body: {
          price,
          city,
          country,
          propertyType,
          transactionType,
          listingType,
          area,
          bedrooms,
          pricePerNight,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setAnalysis(data.analysis);
        setMarketStats(data.marketStats);
        setHasAnalyzed(true);
        setExpanded(true);
      } else {
        throw new Error(data?.error || 'Erreur lors de l\'analyse');
      }
    } catch (error: any) {
      console.error('Price analysis error:', error);
      
      if (error.message?.includes('429')) {
        toast({
          title: 'Limite atteinte',
          description: 'Trop de requêtes. Veuillez réessayer dans quelques instants.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erreur d\'analyse',
          description: 'Impossible d\'analyser le prix pour le moment.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const config = analysis ? ratingConfig[analysis.rating] : null;
  const RatingIcon = config?.icon || AlertCircle;

  if (variant === 'compact') {
    return (
      <div className="space-y-2">
        {!hasAnalyzed ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={analyzePrice}
            disabled={loading || !price || !city || !area}
            className="w-full gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Analyser le prix avec l'IA
          </Button>
        ) : analysis && config ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-3 rounded-lg border ${config.bgColor} ${config.borderColor}`}
          >
            <div className="flex items-center gap-2">
              <RatingIcon className={`w-4 h-4 ${config.color}`} />
              <span className={`font-medium ${config.color}`}>{config.label}</span>
              {analysis.percentageVsMarket !== 0 && (
                <span className="text-xs text-muted-foreground">
                  ({analysis.percentageVsMarket > 0 ? '+' : ''}{analysis.percentageVsMarket}% vs marché)
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{analysis.summary}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={analyzePrice}
              className="mt-2 h-6 px-2 text-xs"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Réanalyser'}
            </Button>
          </motion.div>
        ) : null}
      </div>
    );
  }

  // Full variant for property detail page
  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Analyse du prix par l'IA</h3>
        </div>
        {hasAnalyzed && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        )}
      </div>

      {!hasAnalyzed ? (
        <Button
          onClick={analyzePrice}
          disabled={loading}
          className="w-full gap-2"
          variant="outline"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {loading ? 'Analyse en cours...' : 'Analyser ce prix'}
        </Button>
      ) : (
        <AnimatePresence>
          {analysis && config && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              {/* Rating Badge */}
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bgColor} ${config.borderColor} border`}>
                <RatingIcon className={`w-4 h-4 ${config.color}`} />
                <span className={`font-medium ${config.color}`}>{config.label}</span>
                {analysis.percentageVsMarket !== 0 && (
                  <span className={`text-sm ${config.color}`}>
                    ({analysis.percentageVsMarket > 0 ? '+' : ''}{analysis.percentageVsMarket}%)
                  </span>
                )}
              </div>

              {/* Summary */}
              <p className="text-sm font-medium">{analysis.summary}</p>

              {expanded && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-3"
                >
                  {/* Details */}
                  <p className="text-sm text-muted-foreground">{analysis.details}</p>

                  {/* Market Stats */}
                  {marketStats && marketStats.sampleSize > 0 && (
                    <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Données du marché ({marketStats.sampleSize} annonces)
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Prix moyen:</span>
                          <span className="ml-1 font-medium">{marketStats.avgPrice.toLocaleString()} FCFA</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Prix/m²:</span>
                          <span className="ml-1 font-medium">{marketStats.avgPricePerSqm.toLocaleString()} FCFA</span>
                        </div>
                        {marketStats.avgPricePerNight && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Prix moyen/nuit:</span>
                            <span className="ml-1 font-medium">{marketStats.avgPricePerNight.toLocaleString()} FCFA</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Confidence indicator */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Fiabilité:</span>
                    <div className="flex gap-1">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${
                            (analysis.confidence === 'high' && i <= 3) ||
                            (analysis.confidence === 'medium' && i <= 2) ||
                            (analysis.confidence === 'low' && i <= 1)
                              ? 'bg-primary'
                              : 'bg-muted'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="capitalize">{analysis.confidence === 'high' ? 'Élevée' : analysis.confidence === 'medium' ? 'Moyenne' : 'Faible'}</span>
                  </div>

                  <Button
                    onClick={analyzePrice}
                    disabled={loading}
                    variant="ghost"
                    size="sm"
                    className="w-full"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    Réanalyser
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};
