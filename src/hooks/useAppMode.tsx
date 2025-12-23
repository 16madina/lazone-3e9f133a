import { useEffect, useCallback } from 'react';
import { useAppStore, AppMode } from '@/stores/appStore';
import { toast } from '@/hooks/use-toast';

export const useAppMode = () => {
  const { appMode, setAppMode, isModeSwitching, setIsModeSwitching } = useAppStore();

  // Apply theme class to document root
  useEffect(() => {
    const root = document.documentElement;
    
    if (appMode === 'residence') {
      root.classList.add('residence');
    } else {
      root.classList.remove('residence');
    }

    // Persist to localStorage
    localStorage.setItem('lazone-app-mode', appMode);
  }, [appMode]);

  // Load from localStorage on mount + check for mode switch toast from push notification
  useEffect(() => {
    const savedMode = localStorage.getItem('lazone-app-mode') as AppMode | null;
    if (savedMode && (savedMode === 'lazone' || savedMode === 'residence')) {
      setAppMode(savedMode);
      if (savedMode === 'residence') {
        document.documentElement.classList.add('residence');
      }
    }

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