import { HelpCircle } from 'lucide-react';
import { useTutorial, TutorialSection } from '@/hooks/useTutorial';
import { motion } from 'framer-motion';

interface SectionTutorialButtonProps {
  section: TutorialSection;
  className?: string;
  variant?: 'floating' | 'inline';
}

const SectionTutorialButton = ({ section, className = '', variant = 'floating' }: SectionTutorialButtonProps) => {
  const { startSectionTutorial, isActive, isResidenceMode } = useTutorial();

  if (isActive) return null;

  const handleClick = () => {
    startSectionTutorial(section);
  };

  if (variant === 'inline') {
    return (
      <button
        onClick={handleClick}
        className={`flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors ${className}`}
      >
        <HelpCircle className="w-4 h-4" />
        <span>Aide</span>
      </button>
    );
  }

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, type: 'spring', stiffness: 260, damping: 20 }}
      onClick={handleClick}
      className={`fixed z-40 w-12 h-12 rounded-full backdrop-blur-sm shadow-lg flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all ${
        isResidenceMode 
          ? 'bg-emerald-500/90 hover:bg-emerald-500' 
          : 'bg-primary/90 hover:bg-primary'
      } ${className}`}
      style={{ bottom: 'calc(80px + var(--app-sab))', right: '16px' }}
      aria-label="Aide de cette section"
    >
      <HelpCircle className="w-5 h-5" />
    </motion.button>
  );
};

export default SectionTutorialButton;
