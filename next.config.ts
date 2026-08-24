import type { NextConfig } from "next";

const esProd = process.env.NODE_ENV === "production";

/**
 * Origen de Supabase para el `connect-src`. Sale de la misma variable que usa
 * la app: Next carga los archivos .env antes de evaluar este config.
 *
 * Hoy no hay ninguna llamada a Supabase desde el navegador: todo pasa por server
 * actions y route handlers, y el cliente de browser se borró justamente por no
 * usarse. Con lo cual en rigor alcanzaría con 'self'. Se deja el origen igual
 * para que el día que aparezca una consulta del lado del cliente no falle en
 * silencio.
 */
const supabaseOrigen = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "";
  }
})();

/**
 * Content-Security-Policy.
 *
 * `script-src` lleva 'unsafe-inline' a propósito. En el App Router no hay forma
 * de evitarlo sin nonces: Next inyecta el payload RSC como <script> inline y su
 * contenido cambia en cada request, así que no se puede hashear. La alternativa
 * —generar un nonce por request desde proxy.ts— obliga a render dinámico en
 * TODA la app (adiós al prerender de /login, /registro y /verificar) y hay que
 * pasarle el nonce a mano al script de tema del layout raíz.
 *
 * Con lo cual esta política NO frena un XSS por inyección de script. Lo que sí
 * frena, y no es poco: exfiltración a dominios ajenos (`connect-src`), secuestro
 * del destino de los formularios (`form-action`), inyección de <base>
 * (`base-uri`), clickjacking (`frame-ancestors`) y vectores de plugin
 * (`object-src`). Si más adelante se quiere endurecer `script-src`, el camino
 * está documentado en node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md
 */
const csp = [
  "default-src 'self'",
  // 'unsafe-eval' sólo en dev: React lo usa para reconstruir en el browser los
  // stacks de error del servidor. En producción ni React ni Next lo necesitan.
  `script-src 'self' 'unsafe-inline'${esProd ? "" : " 'unsafe-eval'"}`,
  // Los componentes del kit usan style={{...}} (ancho de las barras de progreso,
  // conic-gradient del anillo, fondo del overlay del modal, escalas del logo).
  // El atributo `style` cae bajo style-src y un nonce no lo cubriría.
  "style-src 'self' 'unsafe-inline'",
  // data: para los QR de los certificados; blob: para los PDF que se arman en
  // el cliente antes de descargarlos.
  "img-src 'self' data: blob:",
  // next/font descarga las tipografías en build y las sirve desde /_next.
  "font-src 'self'",
  // En dev se agrega el websocket del HMR.
  `connect-src 'self'${supabaseOrigen ? ` ${supabaseOrigen}` : ""}${esProd ? "" : " ws: wss:"}`,
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // Sólo en producción: en dev la app corre sobre http://localhost.
  ...(esProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Redundante con frame-ancestors, pero lo entienden navegadores más viejos.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // La app no usa ninguna de estas APIs; se apagan para que tampoco las use
  // nada que llegue a inyectarse.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  // Aísla la ventana de cualquier opener cross-origin. Los window.open() de la
  // app (descarga de certificado, informe, verificación) son al mismo origen.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // HSTS sólo en producción: sobre http el navegador lo ignora, pero si se
  // desarrolla a través del túnel de Cloudflare quedaría fijado *.trycloudflare.com
  // entero en el browser. Sin `preload`: eso es un compromiso aparte, que se
  // agrega recién cuando el dominio definitivo esté estable.
  ...(esProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  // No anunciar la versión del framework en cada respuesta.
  poweredByHeader: false,

  // Allow the dev server to serve dev-only assets (HMR, /_next chunks)
  // when accessed through a Cloudflare quick tunnel (*.trycloudflare.com).
  allowedDevOrigins: ["*.trycloudflare.com"],

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
