import type { CapacitorConfig } from '@capacitor/cli';





// Live web shell (like KiDi+): UI/JS updates without a new Play build.
// Local hot-reload: set NATIVE_APP_URL=http://YOUR_LAN_IP:5173 before cap sync.
const nativeAppUrl = process.env.NATIVE_APP_URL || "https://lazoneapp.com";

const config: CapacitorConfig = {
  appId: 'com.lazone.afrique',
  appName: 'LaZone',
  webDir: 'dist',
  server: {
    url: nativeAppUrl,
    cleartext: nativeAppUrl.startsWith("http://"),
    androidScheme: "https",
    allowNavigation: [
      "lazoneapp.com",
      "www.lazoneapp.com",
      "*.lovable.app",
      "*.lovableproject.com",
      "*.stripe.com",
    ],
  },

  ios: {
    // Let the webview extend under the iOS status bar; we handle safe areas in CSS per-page.
    contentInset: 'never',
    preferredContentMode: 'mobile',
    scrollEnabled: true,
    allowsLinkPreview: true,
    backgroundColor: '#fafaf8'
  },
  android: {
    backgroundColor: '#fafaf8',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    // Support for foldables and large screens
    minWebViewVersion: 60,
    overrideUserAgent: 'LaZone Mobile App'
  },
  plugins: {
    // Capacitor 8: inject correct --safe-area-inset-* on Android WebViews
    SystemBars: {
      insetsHandling: 'css',
      style: 'LIGHT',
    },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 0,
      showSpinner: false,
      backgroundColor: '#fafaf8',
      splashFullScreen: false,
      splashImmersive: false
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    },
    StatusBar: {
      overlaysWebView: true,
      style: 'LIGHT',
      backgroundColor: '#ea580c'
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    Camera: {
      presentationStyle: 'fullScreen'
    }
  }
};

export default config;
