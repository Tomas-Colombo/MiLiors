import { requireEneagramaCompleto } from '@/lib/guards'
import { TyCGate } from '@/components/shared/tyc-gate'
import { Card, Badge, EmptyState } from '@/components/ui'
import { FileIcon } from '@/components/icons'
import { getMisPostulaciones } from '@/modules/puestos/queries'
import { ESTADO_POSTULACION } from '@/lib/constants/enums'
import type { BadgeProps } from '@/components/ui/badge'

export const metadata = { title: 'Mis postulaciones — TalentID' }

type Tone = NonNullable<BadgeProps['tone']>

const estadoTone: Record<string, Tone> = {
  [ESTADO_POSTULACION.ENVIADA]: 'info',
  [ESTADO_POSTULACION.VISTO]: 'primary',
  [ESTADO_POSTULACION.PROCESO_FINALIZADO]: 'error',
  [ESTADO_POSTULACION.CERRADA]: 'warning',
}

const estadoLabel: Record<string, string> = {
  [ESTADO_POSTULACION.ENVIADA]: 'Enviada',
  [ESTADO_POSTULACION.VISTO]: 'Vista',
  [ESTADO_POSTULACION.PROCESO_FINALIZADO]: 'Descartada',
  [ESTADO_POSTULACION.CERRADA]: 'Cerrada',
}

export default async function MisPostulacionesPage() {
  await requireEneagramaCompleto()
  const postulaciones = await getMisPostulaciones()

  return (
    <TyCGate>
      <div className="mx-auto max-w-4xl px-6 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Mis postulaciones</h1>
          <p className="mt-1 text-muted">{postulaciones.length} postulación{postulaciones.length !== 1 ? 'es' : ''}</p>
        </div>

        {postulaciones.length === 0 ? (
          <EmptyState
            icon={<FileIcon size={24} />}
            title="Todavía no postulaste a ningún puesto"
            description="Explorá los puestos disponibles y encontrá tu próxima oportunidad."
          />
        ) : (
          <div className="space-y-3">
            {postulaciones.map((p) => (
              <Card key={p.id} padding="md">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-ink truncate">
                      {p.titulo_puesto ?? 'Puesto'}
                    </p>
                    {p.nombre_empresa && (
                      <p className="text-[13px] text-muted">{p.nombre_empresa}</p>
                    )}
                    <p className="mt-1 text-xs text-neutral-400">
                      Postulado el{' '}
                      {new Date(p.fecha_postulacion).toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <Badge tone={estadoTone[p.estado] ?? 'neutral'} dot>
                    {estadoLabel[p.estado] ?? p.estado}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </TyCGate>
  )
}
