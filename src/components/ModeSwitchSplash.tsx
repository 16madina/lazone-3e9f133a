import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { AppMode } from '@/stores/appStore';
import { getSoundInstance } from '@/hooks/useSound';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { AppLogo } from '@/components/AppLogo';

interface ModeSwitchSplashProps {
  targetMode: AppMode;
  onComplete: () => void;
}

// Trigger haptic feedback for stamp effect
const triggerStampHaptic = async () => {
  if (!Capacitor.isNativePlatform()) return;
  
  try {
    // Heavy impact for the stamp "boom" effect
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch (error) {
    console.error('Haptic error:', error);
  }
};

export const ModeSwitchSplash = ({ targetMode, onComplete }: ModeSwitchSplashProps) => {
  const isResidence = targetMode === 'residence';
  
  // Play stamp sound and haptic when stamp animation starts
  useEffect(() => {
    const stampTimer = setTimeout(() => {
      const sound = getSoundInstance();
      sound.playStampSound();
      triggerStampHaptic();
    }, 700); // Sync with stamp animation delay
    
    // Second stamp sound + haptic for the main title stamp
    const secondStampTimer = setTimeout(() => {
      const sound = getSoundInstance();
      sound.playStampSound();
      triggerStampHaptic();
    }, 900); // Sync with subtitle stamp animation

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 2200);

    return () => {
      clearTimeout(stampTimer);
      clearTimeout(secondStampTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center"
        style={{
          background: isResidence 
            ? 'linear-gradient(135deg, hsl(160 84% 39%), hsl(158 64% 52%), hsl(162 73% 46%))'
            : 'linear-gradient(135deg, hsl(24 95% 53%), hsl(32 98% 50%), hsl(20 90% 48%))'
        }}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }} />
        </div>

        {/* Pulsing Circles */}
        <motion.div
          className="absolute w-64 h-64 rounded-full"
          style={{ 
            background: 'rgba(255,255,255,0.1)',
            filter: 'blur(60px)'
          }}
          animate={{ 
            scale: [1, 1.5, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Logo Container with Stamp Effect */}
          <div className="relative mb-6">
            {/* Main Logo */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                type: "spring",
                stiffness: 200,
                damping: 15,
                delay: 0.2
              }}
            >
              <motion.div 
                className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl bg-white/25 backdrop-blur-xl flex items-center justify-center overflow-hidden p-4 relative"
                style={{
                  boxShadow: `
                    0 25px 50px -12px rgba(0, 0, 0, 0.4),
                    0 12px 24px -8px rgba(0, 0, 0, 0.3),
                    0 0 0 1px rgba(255, 255, 255, 0.2),
                    inset 0 1px 0 rgba(255, 255, 255, 0.3),
                    inset 0 -1px 0 rgba(0, 0, 0, 0.1)
                  `,
                  transform: 'perspective(1000px) rotateX(2deg)',
                }}
                animate={{
                  scale: [1, 1.03, 1],
                  boxShadow: [
                    `0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 12px 24px -8px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3), inset 0 -1px 0 rgba(0, 0, 0, 0.1)`,
                    `0 30px 60px -15px rgba(0, 0, 0, 0.5), 0 15px 30px -10px rgba(0, 0, 0, 0.4), 0 0 20px 2px rgba(255, 255, 255, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -1px 0 rgba(0, 0, 0, 0.1)`,
                    `0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 12px 24px -8px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3), inset 0 -1px 0 rgba(0, 0, 0, 0.1)`
                  ]
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1
                }}
              >
                {/* Logo glow effect */}
                <motion.div 
                  className="absolute inset-0 rounded-3xl"
                  animate={{
                    opacity: [0.4, 0.7, 0.4]
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1
                  }}
                  style={{
                    background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, transparent 60%)'
                  }}
                />
                <AppLogo 
                  className="w-full h-full object-contain relative z-10 drop-shadow-lg"
                  style={{
                    filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))'
                  }}
                />
              </motion.div>
            </motion.div>

            {/* Stamp on Logo */}
            <motion.div
              initial={{ 
                scale: 3, 
                opacity: 0,
                rotate: isResidence ? -25 : 20
              }}
              animate={{ 
                scale: 1, 
                opacity: 1,
                rotate: isResidence ? -12 : 8
              }}
              transition={{ 
                delay: 0.7,
                type: "spring",
                stiffness: 400,
                damping: 12,
              }}
              className={`absolute -bottom-4 ${isResidence ? '-right-6' : '-left-6'}`}
            >
              {/* Stamp Container */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="relative"
              >
                {/* Stamp Impact Effect */}
                <motion.div
                  initial={{ scale: 1.5, opacity: 0.8 }}
                  animate={{ scale: 2.5, opacity: 0 }}
                  transition={{ 
                    delay: 0.7,
                    duration: 0.4,
                    ease: "easeOut"
                  }}
                  className="absolute inset-0 bg-white/30 rounded-lg blur-md"
                />
                
                {/* The Stamp */}
                <div 
                  className="relative px-3 py-1.5 border-2 border-white rounded-md bg-white/10 backdrop-blur-sm"
                  style={{
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2)'
                  }}
                >
                  <span 
                    className="text-white font-bold text-sm tracking-wider uppercase"
                    style={{
                      textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                    }}
                  >
                    {isResidence ? 'Residence' : 'Immo'}
                  </span>
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-5xl sm:text-6xl font-bold text-white mb-3 font-display"
          >
            LaZone
          </motion.h1>
          
          {/* Subtitle with Stamp Animation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="relative"
          >
            <motion.div
              initial={{ scale: 2.5, opacity: 0, rotate: isResidence ? -8 : 6 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ 
                delay: 0.9,
                type: "spring",
                stiffness: 350,
                damping: 15,
              }}
              className="relative"
            >
              {/* Stamp Impact Ripple */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0.6 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ 
                  delay: 0.9,
                  duration: 0.5,
                  ease: "easeOut"
                }}
                className="absolute inset-0 bg-white/40 rounded-lg blur-lg"
              />
              
              <span 
                className="text-3xl sm:text-4xl font-bold text-white font-display px-5 py-2 border-2 border-white/80 rounded-lg inline-block"
                style={{
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}
              >
                {isResidence ? 'Residence' : 'Immobilier'}
              </span>
            </motion.div>
          </motion.div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="text-white/70 mt-5 text-base sm:text-lg"
          >
            {isResidence 
              ? 'Courts séjours • Vacances • Expériences'
              : 'Vente • Location • Investissement'
            }
          </motion.p>

          {/* Loading indicator */}
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 120 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            className="mt-8 h-1 bg-white/30 rounded-full overflow-hidden"
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ 
                duration: 1,
                repeat: 1,
                ease: "easeInOut"
              }}
              className="h-full w-full bg-white rounded-full"
            />
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};