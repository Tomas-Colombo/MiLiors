import { DownloadIcon } from '@/components/icons'

/**
 * Botón de descarga de los .xlsx de admin.
 *
 * Es un <a> y no un <button>: la descarga la resuelve el navegador con la
 * respuesta de la ruta, sin JavaScript de por medio, así que la pantalla puede
 * seguir siendo un server component.
 *
 * El href lo arma quien lo usa, con los filtros vigentes ya adentro: lo que se
 * descarga tiene que ser exactamente lo que se está viendo.
 */
export function ExportarExcel({
  href,
  nota,
  label = 'Descargar Excel',
}: {
  href: string
  /** Aclaración corta al lado del botón: qué trae el archivo. */
  nota?: string
  label?: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <a
        href={href}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-neutral-200 bg-surface px-3 text-[12.5px] font-medium text-muted transition-colors hover:border-primary-300 hover:bg-primary-tint hover:text-primary-600"
      >
        <DownloadIcon size={14} />
        {label}
      </a>
      {nota && <span className="text-[11px] text-muted">{nota}</span>}
    </div>
  )
}

/**
 * Versión inerte para los `loading.tsx`.
 *
 * El botón no depende de datos, así que en el esqueleto se pinta tal cual en vez
 * de como una barra gris: lo que ya se sabe se muestra, y sólo late lo que falta
 * llegar. Es un <span> porque durante la carga todavía no hay filtros que meter
 * en el href, y un enlace a medias descargaría el archivo sin filtrar.
 */
export function ExportarExcelSkeleton({
  nota,
  label = 'Descargar Excel',
}: {
  nota?: string
  label?: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="inline-flex h-9 items-center gap-1.5 rounded-md border border-neutral-200 bg-surface px-3 text-[12.5px] font-medium text-muted">
        <DownloadIcon size={14} />
        {label}
      </span>
      {nota && <span className="text-[11px] text-muted">{nota}</span>}
    </div>
  )
}
