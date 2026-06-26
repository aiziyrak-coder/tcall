import type { Metadata } from "next";
import { isLandingHost } from "@/lib/domains";
import { getServerHostname } from "@/lib/server-host";
import { AppHome } from "@/components/AppHome";
import { LandingPage } from "@/components/landing/LandingPage";

export async function generateMetadata(): Promise<Metadata> {
  const host = getServerHostname();
  if (isLandingHost(host)) {
    return {
      title: "Tcall — Til chegarasisiz suhbat va qo'ng'iroq",
      description:
        "Real-time tarjima, video qo'ng'iroq va xavfsiz chat. Android, iOS, Windows, Linux uchun native ilovalar. Web ilova: web.tcall.uz",
      openGraph: {
        title: "Tcall — Translate · Call · Connect",
        description: "Til chegarasisiz global muloqot platformasi",
        url: "https://tcall.uz",
      },
      robots: { index: true, follow: true },
    };
  }
  return {
    title: "Tcall",
    description: "Real-time tarjima bilan audio va video qo'ng'iroq.",
    robots: { index: false, follow: false },
  };
}

export default function HomePage() {
  const host = getServerHostname();
  if (isLandingHost(host)) {
    return <LandingPage />;
  }
  return <AppHome />;
}
