/**
 * Paleta de los documentos MiLiors (certificado e informe), en pantalla y en PDF.
 *
 * Son valores literales y no tokens de `globals.css` por dos motivos: react-pdf
 * no lee variables CSS, y estos documentos se ven siempre "en papel" —fondo
 * claro— aunque la app esté en modo oscuro. Los valores coinciden con los
 * tokens de marca (`--color-gold-*`) y con el navy de /verificar.
 */
export const DOC = {
  navy: '#16213a',
  navyMuted: '#8ea0bd',
  gold: '#c79a3f',
  goldDark: '#a4732a', // el único dorado que pasa AA sobre blanco
  goldLight: '#f0d089',
  goldBg: '#fdf6e6',
  ink: '#1a1d29',
  soft: '#3c414f',
  muted: '#6b7085',
  faint: '#9aa0b6',
  line: '#e6e7f0',
  bg: '#f7f8fb',
  white: '#ffffff',
} as const
