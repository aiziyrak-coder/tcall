import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "@/components/providers/ClientProviders";
import { isLandingHost } from "@/lib/domains";
import { getServerHostname } from "@/lib/server-host";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "Tcall",
  description: "Real-time tarjima bilan audio qo'ng'iroq. Dunyo bilan o'z tilingizda gaplashing.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
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
  themeColor: "#f0faf5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const host = getServerHostname();
  const landing = isLandingHost(host);

  return (
    <html lang="uz" data-theme="light">
      <body className={`${inter.className} ${landing ? "landing-body" : "overflow-hidden"}`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("tcall:theme");if(t==="system"){t="light";try{localStorage.setItem("tcall:theme","light");}catch(e){}}var m=t==="dark"?"dark":"light";document.documentElement.dataset.theme=m;document.documentElement.style.colorScheme=m;}catch(e){document.documentElement.dataset.theme="light";document.documentElement.style.colorScheme="light";}try{var L=((navigator.language||"en").split("-")[0]||"en").toLowerCase();var RTL={ar:1,he:1,fa:1,ur:1,ps:1};var de=document.documentElement;de.lang=L;de.dir=RTL[L]?"rtl":"ltr";}catch(e){}try{if(document.body.classList.contains("landing-body"))return;var c=window.Capacitor;if(c&&c.isNativePlatform&&c.isNativePlatform()){var b=document.body,p=c.getPlatform&&c.getPlatform();b.classList.add("native-app");if(p)b.classList.add("native-"+p);return;}document.documentElement.classList.add("web-app");document.body.classList.add("web-app");document.documentElement.style.setProperty("--app-vh",window.innerHeight*0.01+"px");}catch(e){}})();`,
          }}
        />
        <ClientProviders landing={landing}>{children}</ClientProviders>
      </body>
    </html>
  );
}
