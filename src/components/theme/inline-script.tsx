// Helper para inyectar scripts inline que corren de forma síncrona durante el
// parseo del HTML (antes del primer paint), evitando el flash de contenido
// servidor/cliente desincronizado. Ver: node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
