import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSoundInstance } from '@/hooks/useSound';
import logoLazone from '@/assets/logo-lazone.png';
import heroBg1 from '@/assets/hero-bg.jpg';
import heroBg2 from '@/assets/hero-bg-2.jpg';
import heroBg3 from '@/assets/hero-bg-3.jpg';
import heroBg4 from '@/assets/hero-bg-4.jpg';
import splashBg5 from '@/assets/splash-bg-5.jpg';
import splashBg6 from '@/assets/splash-bg-6.jpg';
import splashBg7 from '@/assets/splash-bg-7.jpg';
import splashBg8 from '@/assets/splash-bg-8.jpg';
import splashBg9 from '@/assets/splash-bg-9.jpg';
import splashBg10 from '@/assets/splash-bg-10.jpg';
import splashBg11 from '@/assets/splash-bg-11.jpg';
import splashBg12 from '@/assets/splash-bg-12.jpg';
import splashBg13 from '@/assets/splash-bg-13.jpg';
import splashBg14 from '@/assets/splash-bg-14.jpg';
import splashBg15 from '@/assets/splash-bg-15.jpg';

interface SplashScreenProps {
  onComplete: () => void;
}

const backgroundImages = [
  heroBg1, heroBg2, heroBg3, heroBg4,
  splashBg5, splashBg6, splashBg7, splashBg8,
  splashBg9, splashBg10, splashBg11, splashBg12,
  splashBg13, splashBg14, splashBg15
];

export const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [phase, setPhase] = useState<'logo' | 'text' | 'exit'>('logo');
  // Prefer a public path for the splash logo (more reliable for PWA/native), fallback to bundled asset.
  const primaryLogoSrc = `${import.meta.env.BASE_URL}images/logo-lazone.png`;
  const [logoSrc, setLogoSrc] = useState<string>(primaryLogoSrc);

  // Random background image selected once per mount
  const backgroundImage = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * backgroundImages.length);
    return backgroundImages[randomIndex];
  }, []);

  useEffect(() => {
    // Play startup sound after a short delay
    const soundTimer = setTimeout(() => {
      try {
        const sound = getSoundInstance();
        sound.playStartupSound();
      } catch (error) {
        console.log('Could not play startup sound');
      }
    }, 500);

    // Phase 1: Logo animation (0-1s)
    const textTimer = setTimeout(() => setPhase('text'), 1000);
    // Phase 2: Text animation (1-3s), then exit
    const exitTimer = setTimeout(() => setPhase('exit'), 4200);
    // Complete and unmount
    const completeTimer = setTimeout(() => onComplete(), 4800);

    return () => {
      clearTimeout(soundTimer);
      clearTimeout(textTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase !== 'exit' ? (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(249,115,22,0.8)), url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Background pattern */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.1 }}
              transition={{ duration: 1 }}
              className="absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                backgroundSize: '40px 40px',
              }}
            />
          </div>

          {/* Animated circles */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, opacity: 0.3 }}
                animate={{ scale: 4, opacity: 0 }}
                transition={{
                  duration: 2,
                  delay: i * 0.4,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border-2 border-white/30"
              />
            ))}
          </div>

          {/* Logo container */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 20,
              duration: 0.8,
            }}
            className="relative z-10"
          >
            {/* Pulsing glow effect */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: [0.3, 0.6, 0.3], 
                scale: [1, 1.3, 1],
              }}
              transition={{ 
                duration: 2, 
                ease: 'easeInOut',
                repeat: Infinity,
              }}
              className="absolute inset-0 blur-3xl bg-white/50 rounded-full"
            />
            
            {/* Logo - Extra Large with pulse */}
            <motion.img
              src={logoSrc}
              alt="LaZone"
              className="w-80 h-80 object-contain relative z-10 drop-shadow-2xl"
              onError={() => {
                // If the public path fails for any reason, fall back to the bundled asset.
                if (logoSrc !== logoLazone) setLogoSrc(logoLazone);
              }}
              initial={{ filter: 'brightness(0) invert(1)', scale: 0.9 }}
              animate={{
                filter: 'brightness(1) invert(0)',
                scale: [1, 1.05, 1],
              }}
              transition={{
                filter: { duration: 0.5, delay: 0.3 },
                scale: { duration: 2, ease: 'easeInOut', repeat: Infinity, delay: 0.5 },
              }}
            />
          </motion.div>

          {/* Slogan */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 relative z-10 px-8"
          >
            <motion.p
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6, ease: 'easeOut' }}
              className="text-center text-white text-xl font-medium leading-relaxed drop-shadow-lg"
            >
              Trouvez votre chez vous dans votre Zone
            </motion.p>
          </motion.div>

          {/* Loading indicator */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5, duration: 0.5 }}
            className="absolute bottom-20 flex flex-col items-center gap-4"
          >
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                  className="w-2.5 h-2.5 rounded-full bg-white"
                />
              ))}
            </div>
          </motion.div>

          {/* Bottom decoration */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 1, duration: 1, ease: 'easeInOut' }}
            className="absolute bottom-0 left-0 right-0 h-1 bg-white/30 origin-left"
          />
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999]"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(249,115,22,0.8)), url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}
    </AnimatePresence>
  );
};