import type { CapacitorConfig } from "@capacitor/cli";

const PRODUCTION_URL = process.env.TCALL_APP_URL || "https://tcall.vizara.uz";

const config: CapacitorConfig = {
  appId: "uz.vizara.tcall",
  appName: "Tcall",
  webDir: "mobile/www",
  server: {
    url: `${PRODUCTION_URL}/login`,
    cleartext: false,
    allowNavigation: [
      "tcall.vizara.uz",
      "tcallapi.vizara.uz",
      "vizara.uz",
    ],
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#f2f2f7",
  },
  ios: {
    backgroundColor: "#f2f2f7",
    contentInset: "automatic",
    scheme: "Tcall",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#f2f2f7",
      androidSplashResourceName: "splash",
      showSpinner: true,
      androidSpinnerStyle: "large",
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#f2f2f7",
    },
    LocalNotifications: {
      smallIcon: "ic_stat_tcall",
      iconColor: "#007AFF",
    },
    Keyboard: {
      resize: "none",
    },
  },
};

export default config;
