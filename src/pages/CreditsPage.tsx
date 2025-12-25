import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Coins, 
  Gift, 
  Crown, 
  Sparkles, 
  Package, 
  RefreshCw,
  Building2,
  Check,
  Star,
  Zap,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useCredits } from '@/hooks/useCredits';
import { CREDITS_PER_PRODUCT } from '@/services/storeKitService';

const CreditsPage = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const {
    availableCredits,
    freeCreditsRemaining,
    freeCreditsLimit,
    creditPacks,
    subscriptions,
    activeSubscription,
    purchaseProduct,
    restorePurchases,
    loading,
    purchasing,
    initialized,
    isMockMode,
  } = useCredits();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const isAgency = profile?.user_type === 'agence';
  const totalAvailable = freeCreditsRemaining + availableCredits;

  const handlePurchase = async (productId: string) => {
    await purchaseProduct(productId);
  };

  const handleRestore = async () => {
    await restorePurchases();
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between p-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-lg">Mes Crédits</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRestore}
            disabled={purchasing}
          >
            <RefreshCw className={`w-4 h-4 ${purchasing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Mock Mode Banner */}
        {isMockMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Mode démo - Les achats seront simulés
            </p>
          </motion.div>
        )}

        {/* Credits Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Coins className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Crédits disponibles</p>
                    <p className="text-3xl font-bold text-primary">{totalAvailable}</p>
                  </div>
                </div>
                {activeSubscription && (
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500">
                    <Crown className="w-3 h-3 mr-1" />
                    Abonné
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-green-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Gratuits</p>
                    <p className="font-semibold">{freeCreditsRemaining}/{freeCreditsLimit}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Achetés</p>
                    <p className="font-semibold">{availableCredits}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Credit Packs Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">Packs de crédits</h2>
          </div>

          {loading || !initialized ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {creditPacks.map((product, index) => {
                const credits = CREDITS_PER_PRODUCT[product.id] || 1;
                const isBestValue = product.id.includes('pack10');
                
                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <Card className={`relative overflow-hidden transition-all hover:shadow-lg ${isBestValue ? 'border-primary ring-1 ring-primary/30' : ''}`}>
                      {isBestValue && (
                        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-bl-lg font-medium">
                          -20%
                        </div>
                      )}
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            credits === 1 ? 'bg-blue-500/20' : 
                            credits === 5 ? 'bg-purple-500/20' : 'bg-amber-500/20'
                          }`}>
                            <Coins className={`w-5 h-5 ${
                              credits === 1 ? 'text-blue-500' : 
                              credits === 5 ? 'text-purple-500' : 'text-amber-500'
                            }`} />
                          </div>
                          <div>
                            <p className="font-semibold">{product.displayName}</p>
                            <p className="text-sm text-muted-foreground">{product.description}</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => handlePurchase(product.id)}
                          disabled={purchasing}
                          className={isBestValue ? 'bg-primary' : ''}
                        >
                          {product.displayPrice}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Subscriptions Section (for agencies) */}
        {isAgency && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-amber-500" />
              <h2 className="font-semibold text-lg">Abonnements Agence</h2>
            </div>

            {loading || !initialized ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {subscriptions.map((product, index) => {
                  const isActive = activeSubscription?.product_id === product.id;
                  const isPro = product.id.includes('pro');
                  const isPremium = product.id.includes('premium');
                  
                  const features = isPremium 
                    ? ['Annonces illimitées', 'Mise en avant', 'Support prioritaire', 'Badge Premium']
                    : isPro
                    ? ['30 annonces/mois', 'Badge Pro', 'Statistiques avancées']
                    : ['10 annonces/mois', 'Support email'];

                  return (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                    >
                      <Card className={`relative overflow-hidden transition-all ${
                        isPremium ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30' :
                        isPro ? 'bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30' :
                        ''
                      } ${isActive ? 'ring-2 ring-green-500' : ''}`}>
                        {isPremium && (
                          <div className="absolute top-0 right-0">
                            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-none rounded-bl-lg">
                              <Star className="w-3 h-3 mr-1" />
                              Populaire
                            </Badge>
                          </div>
                        )}
                        {isActive && (
                          <div className="absolute top-0 left-0">
                            <Badge className="bg-green-500 rounded-none rounded-br-lg">
                              <Check className="w-3 h-3 mr-1" />
                              Actif
                            </Badge>
                          </div>
                        )}
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center gap-2">
                            {isPremium && <Crown className="w-5 h-5 text-amber-500" />}
                            {isPro && <Zap className="w-5 h-5 text-purple-500" />}
                            {product.displayName}
                          </CardTitle>
                          <CardDescription>{product.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-1 mb-4">
                            {features.map((feature, i) => (
                              <li key={i} className="flex items-center gap-2 text-sm">
                                <Check className="w-4 h-4 text-green-500" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                          <Button
                            className="w-full"
                            variant={isPremium ? 'default' : 'outline'}
                            onClick={() => handlePurchase(product.id)}
                            disabled={purchasing || isActive}
                          >
                            {isActive ? 'Abonnement actif' : product.displayPrice}
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Help Text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-sm text-muted-foreground px-4"
        >
          Les crédits sont utilisés pour publier des annonces.
          {isAgency ? ' Les abonnements se renouvellent automatiquement chaque mois.' : ''}
        </motion.p>
      </div>
    </div>
  );
};

export default CreditsPage;
