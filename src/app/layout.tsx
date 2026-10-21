import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Barlow_Condensed, Cinzel, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-card",
  display: "swap",
});

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bibliothèque de la Mosquée Salam du Plateau",
  description:
    "Service de maintenance numérique — gestion des abonnements et génération des cartes d'abonnement.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${sourceSans.variable} ${barlow.variable} ${cinzel.variable}`}>
      <body>{children}</body>
    </html>
  );
}
