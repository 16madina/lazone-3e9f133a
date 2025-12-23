import { useEffect, useCallback, useRef } from 'react';
import { useAppStore, AppMode } from '@/stores/appStore';
import { toast } from '@/hooks/use-toast';

export const useAppMode = () => {
  const { appMode, setAppMode, isModeSwitching, setIsModeSwitching } = useAppStore();
  const hasHydrated = useRef(false);

  // Load from localStorage on mount FIRST (before any persist happens)
  useEffect(() => {
    if (hasHydrated.current) return;
    
    const savedMode = localStorage.getItem('lazone-app-mode') as AppMode | null;
    if (savedMode && (savedMode === 'lazone' || savedMode === 'residence')) {
      setAppMode(savedMode);
      if (savedMode === 'residence') {
        document.documentElement.classList.add('residence');
      } else {
        document.documentElement.classList.remove('residence');
      }
    }
    
    hasHydrated.current = true;

    // Check if we need to show a toast from a push notification mode switch
    const toastData = sessionStorage.getItem('mode-switch-toast');
    if (toastData) {
      try {
        const { title, description } = JSON.parse(toastData);
        // Small delay to ensure toast system is ready
        setTimeout(() => {
          toast({ title, description });
        }, 500);
      } catch (e) {
        console.error('Error parsing mode-switch-toast:', e);
      }
      sessionStorage.removeItem('mode-switch-toast');
    }
  }, [setAppMode]);

  // Apply theme class to document root AND persist ONLY after hydration
  useEffect(() => {
    if (!hasHydrated.current) return;
    
    const root = document.documentElement;
    
    if (appMode === 'residence') {
      root.classList.add('residence');
    } else {
      root.classList.remove('residence');
    }

    // Persist to localStorage
    localStorage.setItem('lazone-app-mode', appMode);
  }, [appMode]);

  const switchMode = useCallback((newMode: AppMode) => {
    setIsModeSwitching(true);
    
    // Small delay before actually switching for splash to show
    setTimeout(() => {
      setAppMode(newMode);
    }, 100);
  }, [setAppMode, setIsModeSwitching]);

  const completeModeSwitch = useCallback(() => {
    setIsModeSwitching(false);
  }, [setIsModeSwitching]);

  return {
    appMode,
    isResidence: appMode === 'residence',
    isLazone: appMode === 'lazone',
    isModeSwitching,
    switchMode,
    completeModeSwitch,
  };
};
