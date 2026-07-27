import type { CapacitorConfig } from '@capacitor/cli';

// Production builds should NOT use a remote server URL.
// If you want hot-reload during local native development, set:
//   CAPACITOR_SERVER_URL="http://YOUR_IP:5173"
// then run: npx cap sync android/ios
const devServerUrl = process.env.CAPACITOR_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'com.lazone.afrique',
  appName: 'LaZone',
  webDir: 'dist',
  ...(devServerUrl
    ? {
        server: {
          url: devServerUrl,
          cleartext: true,
        },
      }
    : {}),
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
