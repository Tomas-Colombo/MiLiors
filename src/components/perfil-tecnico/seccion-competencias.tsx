'use client'

import { Alert, Button, ProgressBar } from '@/components/ui'
import { CompetenciasBuscador } from './competencias-buscador'
import { CompetenciasSeleccionadas } from './competencias-seleccionadas'
import { useSeleccionCompetencias } from './use-seleccion-competencias'
import type { CompetenciaItem } from '@/modules/perfil-tecnico/queries'

/**
 * Editor de habilidades y tecnologías.
 *
 * Es la única sección del perfil técnico que no guarda fila por fila: se arma
 * la selección completa en el cliente y se envía de una con "Guardar selección".
 */
export function SeccionCompetencias({
  catalogo,
  actuales,
}: {
  catalogo: CompetenciaItem[]
  actuales: CompetenciaItem[]
}) {
  const seleccion = useSeleccionCompetencias(catalogo, actuales)
  const { total, max, feedback, isPending } = seleccion

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-bold text-ink">Habilidades y tecnologías</h2>
          <p className="text-[13px] text-muted">
            Seleccioná hasta {max} habilidades y tecnologías del catálogo, o agregá las tuyas.
            Después indicá tu nivel en cada una.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-primary-ghost-hover px-3 py-1 text-[12px] font-semibold text-primary-600">
          {total}/{max} seleccionadas
        </span>
      </div>

      {/* El porcentaje no se repite: ya está al lado, como "3/15 seleccionadas". */}
      <ProgressBar value={Math.round((total / max) * 100)} showValue={false} />

      <CompetenciasBuscador seleccion={seleccion} />

      <CompetenciasSeleccionadas
        seleccionadas={seleccion.seleccionadas}
        onSetNivel={seleccion.setNivel}
        onRemove={seleccion.removeItem}
        onClearAll={seleccion.clearAll}
      />

      {feedback && <Alert tone={feedback.ok ? 'success' : 'error'}>{feedback.msg}</Alert>}

      <Button type="button" onClick={seleccion.guardar} disabled={isPending}>
        {isPending ? 'Guardando…' : 'Guardar selección'}
      </Button>
    </div>
  )
}
