/**
 * Preloads critical assets (logo, splash backgrounds) for instant display.
 * This runs early in the app lifecycle to cache images before they're needed.
 */

// Critical assets to preload
const CRITICAL_ASSETS = [
  // Logo - public path (primary) and bundled path
  `${import.meta.env.BASE_URL}images/logo-lazone.png`,
];

// Dynamically import splash backgrounds for preloading
const SPLASH_BACKGROUNDS = [
  () => import('@/assets/hero-bg.jpg'),
  () => import('@/assets/hero-bg-2.jpg'),
  () => import('@/assets/hero-bg-3.jpg'),
  () => import('@/assets/hero-bg-4.jpg'),
  () => import('@/assets/splash-bg-5.jpg'),
  () => import('@/assets/splash-bg-6.jpg'),
  () => import('@/assets/splash-bg-7.jpg'),
  () => import('@/assets/splash-bg-8.jpg'),
  () => import('@/assets/splash-bg-9.jpg'),
  () => import('@/assets/splash-bg-10.jpg'),
  () => import('@/assets/splash-bg-11.jpg'),
  () => import('@/assets/splash-bg-12.jpg'),
  () => import('@/assets/splash-bg-13.jpg'),
  () => import('@/assets/splash-bg-14.jpg'),
  () => import('@/assets/splash-bg-15.jpg'),
];

/**
 * Preloads an image by creating an Image element and loading it.
 * Returns a promise that resolves when the image is loaded.
 */
function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => {
      console.warn(`[preloadAssets] Failed to preload: ${src}`);
      resolve(); // Don't reject, just continue
    };
    img.src = src;
  });
}

/**
 * Preloads all critical assets.
 * Call this early in the app lifecycle.
 */
export async function preloadCriticalAssets(): Promise<void> {
  try {
    // Preload logo immediately (highest priority)
    const logoPromises = CRITICAL_ASSETS.map(preloadImage);
    
    // Preload splash backgrounds in parallel (lower priority)
    const bgPromises = SPLASH_BACKGROUNDS.map(async (importFn) => {
      try {
        const module = await importFn();
        const src = module.default;
        return preloadImage(src);
      } catch (error) {
        console.warn('[preloadAssets] Failed to import background:', error);
      }
    });

    // Wait for logo first (critical)
    await Promise.all(logoPromises);
    
    // Then wait for backgrounds (can be async)
    await Promise.all(bgPromises);
    
    console.log('[preloadAssets] All critical assets preloaded');
  } catch (error) {
    console.warn('[preloadAssets] Error during preload:', error);
  }
}

/**
 * Starts preloading assets without blocking.
 * Useful to call immediately on app start.
 */
export function startPreloading(): void {
  // Use requestIdleCallback if available, otherwise setTimeout
  if ('requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(() => {
      preloadCriticalAssets();
    });
  } else {
    setTimeout(() => {
      preloadCriticalAssets();
    }, 0);
  }
}
