import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "@/components/providers/ClientProviders";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "Tcall",
  description: "Real-time tarjima bilan audio qo'ng'iroq. Dunyo bilan o'z tilingizda gaplashing.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Tcall",
    startupImage: "/logo-icon.png",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/logo-icon.png", type: "image/png", sizes: "512x512" },
      { url: "/logo.png", type: "image/png", sizes: "743x159" },
    ],
    apple: [{ url: "/logo-icon.png", type: "image/png" }],
    shortcut: "/favicon.ico",
  },
  formatDetection: { telephone: false },
  other: { "mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#007AFF",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body className={`${inter.className} overflow-hidden`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var L=((navigator.language||"en").split("-")[0]||"en").toLowerCase();var RTL={ar:1,he:1,fa:1,ur:1,ps:1};var de=document.documentElement;de.lang=L;de.dir=RTL[L]?"rtl":"ltr";}catch(e){}try{var c=window.Capacitor;if(c&&c.isNativePlatform&&c.isNativePlatform()){var b=document.body,p=c.getPlatform&&c.getPlatform();b.classList.add("native-app");if(p)b.classList.add("native-"+p);return;}document.documentElement.classList.add("web-app");document.body.classList.add("web-app");document.documentElement.style.setProperty("--app-vh",window.innerHeight*0.01+"px");}catch(e){}})();`,
          }}
        />
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
