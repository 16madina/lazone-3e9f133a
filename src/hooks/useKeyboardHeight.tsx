import { useState, useEffect, useRef } from 'react';

/**
 * Hook to detect iOS keyboard height using Visual Viewport API
 * Returns the keyboard height and a ref callback for scrolling into view
 */
export const useKeyboardHeight = () => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollTargetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    let lastHeight = viewport.height;

    const handleResize = () => {
      // Calculate keyboard height
      const keyboardH = window.innerHeight - viewport.height;
      const newKeyboardHeight = Math.max(0, keyboardH);
      
      // Only update if there's a significant change (more than 50px)
      if (Math.abs(newKeyboardHeight - keyboardHeight) > 50 || newKeyboardHeight === 0) {
        setKeyboardHeight(newKeyboardHeight);
        
        // Scroll to target element when keyboard opens
        if (newKeyboardHeight > 0 && scrollTargetRef.current) {
          setTimeout(() => {
            scrollTargetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        }
      }
      
      lastHeight = viewport.height;
    };

    viewport.addEventListener('resize', handleResize);
    viewport.addEventListener('scroll', handleResize);

    return () => {
      viewport.removeEventListener('resize', handleResize);
      viewport.removeEventListener('scroll', handleResize);
    };
  }, [keyboardHeight]);

  const isKeyboardVisible = keyboardHeight > 0;

  return { 
    keyboardHeight, 
    isKeyboardVisible,
    scrollTargetRef 
  };
};

export default useKeyboardHeight;
