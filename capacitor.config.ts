import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Eslatma: mobil/desktop ilovalar endi Capacitor/WebView EMAS.
 * Native ilovalar: platforms/android, platforms/ios, platforms/windows, platforms/linux
 * @see ARCHITECTURE.md
 */
const config: CapacitorConfig = {
  appId: "uz.tcall",
  appName: "Tcall",
  webDir: "mobile/www",
  android: {
    allowMixedContent: false,
    backgroundColor: "#f2f2f7",
  },
};

export default config;
