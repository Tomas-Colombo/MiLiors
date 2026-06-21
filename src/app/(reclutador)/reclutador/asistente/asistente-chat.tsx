'use client'

import { useState, useTransition } from 'react'
import { Card, Alert } from '@/components/ui'
import { Button } from '@/components/ui'
import { Field, Textarea } from '@/components/ui'
import { SparklesIcon, Spinner } from '@/components/icons'
import { consultarAsistente } from '@/modules/asistente/actions'

type PuestoOption = {
  id: string
  titulo_puesto: string
}

type HistorialItem = {
  pregunta: string
  respuesta: string
}

type Props = {
  // The recruiter arrives from the candidate detail page with postulanteId pre-filled.
  // In MVP we don't implement a full candidate search dropdown here — the expected flow is:
  //   1. Recruiter browses /reclutador/postulantes
  //   2. Opens a candidate detail
  //   3. Clicks "Consultar Asistente IA" which passes ?postulante=<id>
  // The postulanteId is therefore a URL parameter, not a user-typed value.
  postulanteId: string
  nombrePostulante: string
  puestos: PuestoOption[]
  // Optional pre-selected position from searchParams
  puestoIdInicial?: string
}

export function AsistenteChat({
  postulanteId,
  nombrePostulante,
  puestos,
  puestoIdInicial,
}: Props) {
  const [puestoId, setPuestoId] = useState(puestoIdInicial ?? '')
  const [pregunta, setPregunta] = useState('')
  const [historial, setHistorial] = useState<HistorialItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleConsultar() {
    setError(null)
    if (!puestoId) {
      setError('Seleccioná un puesto antes de consultar.')
      return
    }
    if (!pregunta.trim()) {
      setError('Escribí tu pregunta.')
      return
    }

    const preguntaSnapshot = pregunta.trim()
    startTransition(async () => {
      const result = await consultarAsistente(postulanteId, puestoId, preguntaSnapshot)
      if (!result.success) {
        setError(result.error)
        return
      }
      setHistorial((prev) => [
        ...prev,
        { pregunta: preguntaSnapshot, respuesta: result.data.respuesta },
      ])
      setPregunta('')
    })
  }

  return (
    <div className="space-y-6">
      {/* Candidate context — read-only, sourced from Server Component */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-tint text-primary-600 text-[13px] font-bold">
            {nombrePostulante.charAt(0).toUpperCase()}
          </span>
          <div>
            <p className="text-[13px] text-muted">Candidato seleccionado</p>
            <p className="text-[15px] font-semibold text-ink">{nombrePostulante}</p>
          </div>
        </div>

        {/* Position selector */}
        <Field label="Puesto a evaluar" required>
          <select
            value={puestoId}
            onChange={(e) => setPuestoId(e.target.value)}
            className="w-full h-10 rounded-md border border-neutral-300 bg-surface px-3.5 text-sm text-ink focus:border-primary-600 focus:outline-none focus:ring-[3px] focus:ring-primary-50"
          >
            <option value="">— Seleccioná un puesto —</option>
            {puestos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.titulo_puesto}
              </option>
            ))}
          </select>
        </Field>
      </Card>

      {/* Conversation history — rendered in chronological order */}
      {historial.length > 0 && (
        <div className="space-y-4">
          {historial.map((item, i) => (
            <div key={i} className="space-y-2">
              {/* Question bubble */}
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-xl rounded-tr-sm bg-primary-600 px-4 py-3 text-[13px] text-white">
                  {item.pregunta}
                </div>
              </div>
              {/* Response bubble */}
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-xl rounded-tl-sm border border-neutral-200 bg-surface px-4 py-3 text-[13px] text-ink leading-relaxed whitespace-pre-wrap shadow-card">
                  <div className="flex items-center gap-1.5 mb-2 text-[11px] text-primary-600 font-semibold">
                    <SparklesIcon size={12} />
                    Asistente IA
                  </div>
                  {item.respuesta}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <Card>
        <Field label="Tu pregunta">
          <Textarea
            value={pregunta}
            onChange={(e) => setPregunta(e.target.value)}
            placeholder="Ej: ¿Es un buen candidato para un rol de liderazgo? ¿Cómo maneja el conflicto?"
            rows={4}
            onKeyDown={(e) => {
              // Ctrl/Cmd + Enter to submit
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault()
                handleConsultar()
              }
            }}
          />
        </Field>

        {error && <Alert tone="error" className="mt-3">{error}</Alert>}

        <div className="mt-4 flex items-center justify-between">
          <p className="text-[11.5px] text-neutral-400">
            Ctrl + Enter para enviar · Las respuestas no se guardan al cerrar la sesión
          </p>
          <Button
            leftIcon={isPending ? <Spinner size={15} /> : <SparklesIcon size={15} />}
            loading={isPending}
            onClick={handleConsultar}
            disabled={!puestoId || !pregunta.trim()}
          >
            Consultar
          </Button>
        </div>
      </Card>
    </div>
  )
}
