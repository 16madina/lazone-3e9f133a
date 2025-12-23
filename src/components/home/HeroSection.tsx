import { Sparkles, Home, Building2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import heroBg from '@/assets/hero-bg.jpg';
import { useAppMode } from '@/hooks/useAppMode';

export const HeroSection = () => {
  const { isResidence, switchMode } = useAppMode();

  const handleModeSwitch = () => {
    switchMode(isResidence ? 'lazone' : 'residence');
  };

  return (
    <div 
      className="relative overflow-hidden rounded-3xl p-6 mb-6"
      style={{
        backgroundImage: `url(${heroBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />

      {/* Animated Mode Badge - Bottom Left Corner */}
      <button
        onClick={handleModeSwitch}
        className="absolute left-3 bottom-3 z-20"
      >
        <div
          className={`
            flex items-center gap-2 px-3 py-2 rounded-xl
            backdrop-blur-md border border-white/20
            cursor-pointer
            ${isResidence 
              ? 'bg-gradient-to-r from-teal-500/80 to-teal-600/60 shadow-[0_0_15px_rgba(20,184,166,0.4)]' 
              : 'bg-gradient-to-r from-primary/80 to-primary/60 shadow-[0_0_15px_rgba(249,115,22,0.4)]'
            }
          `}
        >
          <div>
            {isResidence ? (
              <Home className="w-4 h-4 text-white" />
            ) : (
              <Building2 className="w-4 h-4 text-white" />
            )}
          </div>
          
          <div className="flex flex-col items-start">
            <span className="text-[10px] text-white/70 leading-tight">
              Passer en
            </span>
            <span className="text-xs font-semibold text-white leading-tight">
              {isResidence ? 'LaZone' : 'Résidence'}
            </span>
          </div>
          
          <ArrowRight className="w-3 h-3 text-white/70" />
        </div>
      </button>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-white/80" />
          <span className="text-sm text-white/80 font-medium">
            {isResidence 
              ? 'Trouvez votre séjour idéal en Afrique'
              : 'Découvrez votre futur chez-vous en Afrique'
            }
          </span>
        </div>

        <h1 className="font-display text-3xl font-bold text-white mb-2">
          {isResidence ? (
            <>
              Réservez votre
              <br />
              <span className="text-white/90">résidence de rêve</span>
            </>
          ) : (
            <>
              Trouvez la propriété
              <br />
              <span className="text-white/90">de vos rêves</span>
            </>
          )}
        </h1>

        <p className="text-white/70 text-sm">
          {isResidence 
            ? 'Des centaines de résidences disponibles pour vos séjours'
            : 'Des milliers de propriétés disponibles en Afrique'
          }
        </p>
      </div>
    </div>
  );
};
