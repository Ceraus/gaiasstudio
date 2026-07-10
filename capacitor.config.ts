import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.clearviewglobal.clearplan",
  appName: "ClearPlan",
  webDir: "dist",
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      launchFadeOutDuration: 250,
      backgroundColor: "#0a0f1c",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0a0f1c",
      overlaysWebView: false
    },
    Keyboard: {
      resize: "body",
      style: "dark",
      resizeOnFullScreen: true
    }
  },
  ios: {
    scheme: "ClearPlan",
    contentInset: "automatic",
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: false
  },
  server: {
    androidScheme: "https",
    iosScheme: "clearplan"
  }
};

export default config;
