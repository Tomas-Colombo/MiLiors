'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AlertTriangleIcon, ChevronRightIcon } from '@/components/icons'

/**
 * Barra fina que acompaña al postulante por toda el área mientras su informe o
 * su certificado estén desactualizados. No se cierra: desaparece sola cuando el
 * layout se vuelve a renderizar con el dato al día (las actions que regeneran
 * hacen revalidatePath, que invalida también los layouts ancestros).
 *
 * El informe tiene prioridad: el certificado se arma a partir de él, así que
 * regenerar el certificado antes no resuelve nada.
 */
export function AvisoDesactualizado({
  informe,
  certificado,
}: {
  informe: boolean
  certificado: boolean
}) {
  const pathname = usePathname()

  const aviso = informe
    ? { href: '/postulante/informe', texto: 'Tu informe está desactualizado' }
    : certificado
      ? { href: '/postulante/certificado', texto: 'Tu certificado está desactualizado' }
      : null

  // En la pantalla de destino ya hay un Alert completo con la explicación.
  if (!aviso || pathname === aviso.href) return null

  return (
    <div className="flex justify-center px-4 pt-3 sm:px-6 lg:px-8">
      <Link
        href={aviso.href}
        className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-warning-border bg-warning-bg px-3 py-1 text-xs font-medium text-warning-ink transition-opacity hover:opacity-80"
      >
        <AlertTriangleIcon size={13} strokeWidth={2.5} className="flex-none" />
        <span className="truncate">{aviso.texto}</span>
        <span className="flex flex-none items-center font-semibold">
          Actualizar
          <ChevronRightIcon size={13} strokeWidth={2.5} />
        </span>
      </Link>
    </div>
  )
}
