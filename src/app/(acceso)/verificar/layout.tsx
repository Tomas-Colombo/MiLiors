import "./verificar.css";

/**
 * `/verificar` es el buscador y comparte la pantalla de acceso con /login; el
 * documento que muestra `/verificar/[id]` tiene su propio skin (`vf-*`), en
 * oscuro y fijo, porque imita al certificado emitido.
 *
 * Este layout existe sólo para cargar esa hoja: así `verificar.css` no viaja en
 * /login ni en /registro, que no usan ninguna de sus clases.
 */
export default function VerificarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
