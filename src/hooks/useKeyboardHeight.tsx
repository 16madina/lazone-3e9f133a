import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook to detect iOS keyboard height using Visual Viewport API
 * Returns the keyboard height for layout adjustments
 */
export const useKeyboardHeight = () => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollTargetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const handleResize = () => {
      // Calculate keyboard height from visual viewport
      const keyboardH = Math.max(0, window.innerHeight - viewport.height);
      setKeyboardHeight(keyboardH);

      // Scroll to target element when keyboard opens
      if (keyboardH > 50 && scrollTargetRef.current) {
        setTimeout(() => {
          scrollTargetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    };

    viewport.addEventListener('resize', handleResize);

    return () => {
      viewport.removeEventListener('resize', handleResize);
    };
  }, []); // No dependencies - avoids stale closure

  const isKeyboardVisible = keyboardHeight > 50;

  return { 
    keyboardHeight, 
    isKeyboardVisible,
    scrollTargetRef 
  };
};

export default useKeyboardHeight;
