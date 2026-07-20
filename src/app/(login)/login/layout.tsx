import { Newsreader, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./login.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${newsreader.variable} ${plexSans.variable} ${plexMono.variable}`}>
      {children}
    </div>
  );
}
