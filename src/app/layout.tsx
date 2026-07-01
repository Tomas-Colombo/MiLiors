import type { Metadata } from "next";
import { Inter, Fraunces, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TalentID",
  description: "Plataforma SaaS de reclutamiento — sistema de diseño TalentID.",
};

// Script inline en <head>: se ejecuta síncronamente durante el parseo del HTML,
// antes del primer paint, para aplicar el tema y el estado del sidebar sin flash.
// Se escribe en una sola línea para no romper el payload RSC de Next.js (JSONL).
// suppressHydrationWarning en <html> le dice a React que el className puede
// diferir entre servidor y cliente (la clase "dark" la agrega este script).
const BOOT_SCRIPT = `(function(){try{if(localStorage.getItem('talentid-theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}try{if(localStorage.getItem('talentid-sidebar-collapsed')==='true')document.documentElement.classList.add('sidebar-collapsed')}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${fraunces.variable} ${jetbrainsMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script
          type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }}
        />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
