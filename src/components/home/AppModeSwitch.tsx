import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Building2, ArrowRight } from 'lucide-react';
import { useAppStore, AppMode } from '@/stores/appStore';
import { cn } from '@/lib/utils';

interface AppModeSwitchProps {
  onSwitch: (mode: AppMode) => void;
}

export const AppModeSwitch = ({ onSwitch }: AppModeSwitchProps) => {
  const { appMode } = useAppStore();
  const isResidence = appMode === 'residence';
  const [showHint, setShowHint] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Show hint animation after 2 seconds, hide after 8 seconds or on interaction
  useEffect(() => {
    // Check if user has already seen the hint
    const hintSeen = localStorage.getItem('mode-switch-hint-seen');
    if (hintSeen) return;

    const showTimer = setTimeout(() => {
      setShowHint(true);
    }, 2000);

    const hideTimer = setTimeout(() => {
      setShowHint(false);
      localStorage.setItem('mode-switch-hint-seen', 'true');
    }, 10000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  const handleSwitch = () => {
    const newMode = isResidence ? 'lazone' : 'residence';
    onSwitch(newMode);
    setShowHint(false);
    setHasInteracted(true);
    localStorage.setItem('mode-switch-hint-seen', 'true');
  };

  return (
    <div className="relative">
      {/* Hint tooltip with arrow */}
      <AnimatePresence>
        {showHint && !hasInteracted && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute -bottom-12 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap"
          >
            <motion.div
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-medium shadow-lg",
                isResidence 
                  ? "bg-gradient-to-r from-orange-500 to-orange-600"
                  : "bg-gradient-to-r from-emerald-500 to-teal-600"
              )}
              animate={{ 
                y: [0, -3, 0],
              }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            >
              {/* Pointer arrow at top */}
              <div 
                className={cn(
                  "absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45",
                  isResidence 
                    ? "bg-orange-500"
                    : "bg-emerald-500"
                )}
              />
              
              <span>{isResidence ? 'Immobilier' : 'Résidence'}</span>
              <motion.div
                animate={{ x: [0, 3, 0] }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main switch button */}
      <motion.button
        onClick={handleSwitch}
        className={cn(
          "relative flex items-center gap-2 px-3 py-1.5 rounded-full",
          "backdrop-blur-xl border transition-all duration-300",
          "text-xs font-medium",
          isResidence 
            ? "bg-emerald-500/20 border-emerald-400/30 text-white hover:bg-emerald-500/30"
            : "bg-white/20 border-white/30 text-white hover:bg-white/30"
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={showHint && !hasInteracted ? {
          boxShadow: [
            `0 0 0 0 ${isResidence ? 'rgba(249, 115, 22, 0)' : 'rgba(20, 184, 166, 0)'}`,
            `0 0 0 8px ${isResidence ? 'rgba(249, 115, 22, 0.3)' : 'rgba(20, 184, 166, 0.3)'}`,
            `0 0 0 0 ${isResidence ? 'rgba(249, 115, 22, 0)' : 'rgba(20, 184, 166, 0)'}`,
          ]
        } : {}}
        transition={{
          boxShadow: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
        }}
      >
        <motion.div
          initial={false}
          animate={{ rotate: isResidence ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          {isResidence ? (
            <Building2 className="w-3.5 h-3.5" />
          ) : (
            <Home className="w-3.5 h-3.5" />
          )}
        </motion.div>
        
        <span className="hidden sm:inline">
          {isResidence ? 'Residence' : 'Immobilier'}
        </span>
        
        {/* Animated switch indicator */}
        <div className="relative w-8 h-4 bg-white/20 rounded-full overflow-hidden">
          <motion.div
            className={cn(
              "absolute top-0.5 w-3 h-3 rounded-full",
              isResidence ? "bg-emerald-400" : "bg-white"
            )}
            initial={false}
            animate={{ x: isResidence ? 17 : 2 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          />
        </div>
      </motion.button>
    </div>
  );
};
