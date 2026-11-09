'use client'

import { useState } from 'react'
import { Card } from '@/components/ui'
import type { NotaData } from '@/modules/postulantes/actions'
import { NotasCandidato } from '@/components/shared/notas-candidato'

type Props = {
  postulanteId: string
  notasIniciales: NotaData[]
}

export function NotasPanel({ postulanteId, notasIniciales }: Props) {
  // Local optimistic state — Server Actions with revalidatePath handle the source of truth
  const [notas, setNotas] = useState<NotaData[]>(notasIniciales)

  return (
    <Card>
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h3 className="text-md font-bold text-ink">Notas privadas</h3>
        {notas.length > 0 && (
          <span className="text-xs tabular-nums text-muted">
            {notas.length} nota{notas.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <NotasCandidato
        postulanteId={postulanteId}
        notas={notas}
        onNotasChange={(actualizar) => setNotas((prev) => actualizar(prev))}
        listaClassName="max-h-[420px]"
      />
    </Card>
  )
}
