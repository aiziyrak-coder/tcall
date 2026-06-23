import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "Tcall — Til chegarasisiz video qo'ng'iroq",
  description:
    "Real-time tarjima bilan video qo'ng'iroq platformasi. Dunyo bilan o'z tilingizda gaplashing.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
