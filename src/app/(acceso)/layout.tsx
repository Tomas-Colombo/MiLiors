import { Newsreader, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "@/components/acceso/acceso.css";

/**
 * Pantalla pública de acceso: ingresar, crear cuenta, recuperar contraseña y
 * verificar un certificado. Las cuatro comparten el mismo chrome
 * (`AccesoChrome`) y la misma hoja de estilos.
 *
 * Antes cada ruta traía su propio layout con esta declaración de fuentes
 * copiada textual — tres archivos idénticos, y `recuperar-password` colgando de
 * un cuarto grupo con otro aspecto. Acá se declara una sola vez.
 *
 * La identidad tipográfica es propia de esta pantalla (Newsreader para la
 * itálica del titular, IBM Plex para el resto) y no la de la app autenticada,
 * que la define el layout raíz.
 */

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

export default function AccesoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${newsreader.variable} ${plexSans.variable} ${plexMono.variable}`}>
      {children}
    </div>
  );
}
