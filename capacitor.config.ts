import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Eslatma: Android ilova endi Capacitor/WebView EMAS.
 * Haqiqiy native ilova: android/ (Kotlin + Jetpack Compose).
 * @see android/NATIVE_ANDROID.md
 */
const config: CapacitorConfig = {
  appId: "uz.vizara.tcall",
  appName: "Tcall",
  webDir: "mobile/www",
  android: {
    allowMixedContent: false,
    backgroundColor: "#f2f2f7",
  },
};

export default config;
