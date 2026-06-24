import type { CapacitorConfig } from "@capacitor/cli";

/** Production server — local emas, haqiqiy tcall.vizara.uz */
const PRODUCTION_URL = process.env.TCALL_APP_URL || "https://tcall.vizara.uz";

const config: CapacitorConfig = {
  appId: "uz.vizara.tcall",
  appName: "Tcall",
  webDir: "mobile/www",
  server: {
    url: PRODUCTION_URL,
    cleartext: false,
    androidScheme: "https",
    allowNavigation: ["tcall.vizara.uz", "tcallapi.vizara.uz", "*.vizara.uz"],
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#f2f2f7",
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
  ios: {
    backgroundColor: "#f2f2f7",
    contentInset: "automatic",
    scheme: "Tcall",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: "#f2f2f7",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#f2f2f7",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    LocalNotifications: {
      smallIcon: "ic_stat_tcall",
      iconColor: "#007AFF",
      sound: "ringtone",
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
