import type { ReactNode } from 'react'
import { DOC } from '@/lib/constants/documento'
import { BrandLogo } from './brand-logo'

/**
 * Chrome compartido de los documentos MiLiors en pantalla (certificado e
 * informe). Es el espejo HTML de lo que dibujan los `pdf-template.tsx`: mismo
 * navy, mismo dorado, misma cabecera de marca.
 *
 * Se renderiza siempre en claro —no sigue el modo oscuro de la app— porque lo
 * que muestra es un documento impreso.
 */

export function Papel({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-xl bg-white text-[#1a1d29]">{children}</div>
}

export function PapelHeader({
  titulo,
  meta,
  bg = DOC.navy,
}: {
  /** Etiqueta del documento, a la derecha (ej. "Certificado verificado"). */
  titulo: string
  /** Líneas chicas bajo la etiqueta (ID, fecha de emisión). */
  meta?: ReactNode
  /** Navy de la cabecera. Se cambia sólo para que el papel entone con el fondo
   *  donde vive (la pantalla de acceso usa un navy propio, más frío). */
  bg?: string
}) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
      style={{ backgroundColor: bg, borderBottom: `3px solid ${DOC.gold}` }}
    >
      <div>
        <div className="flex items-center gap-2.5">
          <BrandLogo size={28} />
          <span className="text-[22px] font-bold leading-none text-white">MiLiors</span>
        </div>
        <p className="mt-1.5 text-[11px] italic" style={{ color: DOC.goldLight }}>
          Talentos al Servicio del Mundo
        </p>
      </div>
      <div className="text-right">
        <span
          className="inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
          style={{ border: `1px solid ${DOC.gold}`, color: DOC.goldLight }}
        >
          {titulo}
        </span>
        {meta && (
          <div className="mt-1 text-[10px]" style={{ color: DOC.navyMuted }}>
            {meta}
          </div>
        )}
      </div>
    </div>
  )
}

/** Ficha de identidad: nombre grande, línea dorada de contexto y datos sueltos. */
export function PapelIdentidad({
  nombre,
  subtitulo,
  children,
}: {
  nombre: string
  subtitulo?: string | null
  /** Datos de contacto u otra línea secundaria. */
  children?: ReactNode
}) {
  return (
    <div className="rounded-lg px-4 py-4" style={{ backgroundColor: DOC.bg }}>
      <h2 className="text-[22px] font-extrabold leading-tight" style={{ color: DOC.navy }}>
        {nombre}
      </h2>
      {subtitulo && (
        <p className="mt-0.5 text-[13px] font-bold" style={{ color: DOC.goldDark }}>
          {subtitulo}
        </p>
      )}
      {children && <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12px]" style={{ color: DOC.soft }}>{children}</div>}
    </div>
  )
}

/** Título de sección numerado, con la regla dorada del documento. */
export function PapelSectionHead({ n, children }: { n: number; children: string }) {
  return (
    <div className="border-b pb-1" style={{ borderColor: DOC.line }}>
      <h3 className="text-[11px] font-bold uppercase tracking-[0.09em]" style={{ color: DOC.navy }}>
        {n}. {children}
      </h3>
      <div className="mt-[3px] h-[2px] w-12" style={{ backgroundColor: DOC.gold }} />
    </div>
  )
}
