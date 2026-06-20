'use client'

import { useState, useTransition, useCallback } from 'react'
import { Button, Card, Badge, ProgressBar, Alert } from '@/components/ui'
import { iniciarTest, guardarRespuesta, calcularEneatipo } from '@/modules/eneagrama/actions'
import { useRouter } from 'next/navigation'
import { SparklesIcon, CheckIcon, ArrowRightIcon } from '@/components/icons'

const PREGUNTAS_POR_PAGINA = 15

type Pregunta = {
  id: string
  numero_pregunta: number
  enunciado: string
  eneatipo_asociado: number
}

type Opcion = {
  id: string
  valor_numerico: number
  texto_opcion: string
}

type Props = {
  preguntas: Pregunta[]
  opciones: Opcion[]
  perfilId: string
  testId: string | null
  respuestasIniciales: Record<string, number>
  yaCompleto: boolean
}

export function EneagramaWizard({
  preguntas,
  opciones,
  perfilId,
  testId: testIdInicial,
  respuestasIniciales,
  yaCompleto,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [testId, setTestId] = useState<string | null>(testIdInicial)
  const [respuestas, setRespuestas] = useState<Record<string, number>>(respuestasIniciales)
  const [paginaActual, setPaginaActual] = useState(() => {
    // Calcular en qué página está basándose en el progreso guardado
    const respondidas = Object.keys(respuestasIniciales).length
    if (respondidas === 0) return 0
    const paginaGuardada = Math.floor(respondidas / PREGUNTAS_POR_PAGINA)
    return Math.min(paginaGuardada, Math.ceil(preguntas.length / PREGUNTAS_POR_PAGINA) - 1)
  })
  const [error, setError] = useState<string | null>(null)
  const [completado, setCompletado] = useState(yaCompleto)
  const [eneatipoResultado, setEneatipoResultado] = useState<number | null>(null)
  const [iniciando, setIniciando] = useState(!testIdInicial)

  const totalPaginas = Math.ceil(preguntas.length / PREGUNTAS_POR_PAGINA)
  const preguntasPagina = preguntas.slice(
    paginaActual * PREGUNTAS_POR_PAGINA,
    (paginaActual + 1) * PREGUNTAS_POR_PAGINA
  )
  const totalRespondidas = Object.keys(respuestas).length
  const progreso = Math.round((totalRespondidas / preguntas.length) * 100)
  const paginaCompleta = preguntasPagina.every((p) => respuestas[p.id] !== undefined)

  // Iniciar o reiniciar el test
  function handleIniciar(reiniciar = false) {
    setError(null)
    startTransition(async () => {
      if (reiniciar) {
        setRespuestas({})
        setPaginaActual(0)
        setCompletado(false)
        setEneatipoResultado(null)
      }

      const result = await iniciarTest(perfilId)
      if (!result.success) {
        setError(result.error)
        return
      }
      setTestId(result.data.testId)
      setIniciando(false)
    })
  }

  // Guardar respuesta — actualización optimista + persistencia en background
  const handleRespuesta = useCallback(
    (preguntaId: string, valor: number) => {
      if (!testId) return

      // Actualizar estado local inmediatamente (optimistic)
      setRespuestas((prev) => ({ ...prev, [preguntaId]: valor }))

      // Persistir en background sin bloquear la UI
      startTransition(async () => {
        const result = await guardarRespuesta(testId, preguntaId, valor)
        if (!result.success) {
          setError('Error al guardar una respuesta. Verificá tu conexión.')
        }
      })
    },
    [testId]
  )

  // Avanzar página
  function handleSiguiente() {
    if (!paginaCompleta) {
      setError('Respondé todas las preguntas de esta sección antes de continuar.')
      return
    }
    setError(null)
    if (paginaActual < totalPaginas - 1) {
      setPaginaActual((p) => p + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Retroceder página
  function handleAnterior() {
    setError(null)
    if (paginaActual > 0) {
      setPaginaActual((p) => p - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Calcular eneatipo al finalizar
  function handleFinalizar() {
    if (!testId) return
    setError(null)

    startTransition(async () => {
      const result = await calcularEneatipo(testId)
      if (!result.success) {
        setError(result.error)
        return
      }
      setEneatipoResultado(result.data.eneatipoNumero)
      setCompletado(true)
    })
  }

  // ── Pantalla de resultado recién obtenido ──────────────────────────────────
  if (completado && eneatipoResultado) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md text-center">
          <div
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl shadow-primary"
            style={{ background: 'var(--gradient-brand-soft)' }}
          >
            <SparklesIcon size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            ¡Test completado!
          </h1>
          <p className="mt-3 text-muted">Tu eneatipo es</p>
          <div className="my-6 text-7xl font-black text-primary-600">{eneatipoResultado}</div>
          <p className="mb-8 text-sm text-muted">
            Tu informe de personalidad se está generando. Podés acceder a él desde tu perfil.
          </p>
          <Button
            size="lg"
            className="w-full"
            rightIcon={<ArrowRightIcon size={16} />}
            onClick={() => router.push('/postulante')}
          >
            Ir a mi perfil
          </Button>
        </div>
      </div>
    )
  }

  // ── Pantalla de resultado previo (ya completó antes, no acaba de terminar) ─
  if (completado && yaCompleto && !eneatipoResultado) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md text-center">
          <div
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: 'var(--gradient-brand)' }}
          >
            <CheckIcon size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">
            Ya completaste el Eneagrama
          </h1>
          <p className="mt-3 text-sm text-muted">
            Podés rehacer el test si querés actualizar tu perfil de personalidad.
            Esto sobrescribirá el resultado anterior.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Button
              size="lg"
              className="w-full"
              rightIcon={<ArrowRightIcon size={16} />}
              onClick={() => router.push('/postulante')}
            >
              Ir a mi perfil
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="w-full"
              onClick={() => handleIniciar(true)}
              loading={isPending}
            >
              Rehacer el test
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Pantalla de inicio (sin test aún) ─────────────────────────────────────
  if (iniciando) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md text-center">
          <div
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl shadow-primary"
            style={{ background: 'var(--gradient-brand-soft)' }}
          >
            <SparklesIcon size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">
            Test de Eneagrama
          </h1>
          <p className="mt-3 text-sm text-muted">
            135 preguntas organizadas en 9 secciones. Podés guardar tu progreso y
            retomarlo cuando quieras. Respondé con honestidad.
          </p>
          <div className="my-6 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-white p-3 shadow-card">
              <div className="text-xl font-black text-primary-600">135</div>
              <div className="text-xs text-muted">preguntas</div>
            </div>
            <div className="rounded-lg bg-white p-3 shadow-card">
              <div className="text-xl font-black text-primary-600">9</div>
              <div className="text-xs text-muted">secciones</div>
            </div>
            <div className="rounded-lg bg-white p-3 shadow-card">
              <div className="text-xl font-black text-primary-600">~20&apos;</div>
              <div className="text-xs text-muted">estimado</div>
            </div>
          </div>
          {error && <Alert tone="error" title={error} className="mb-4" />}
          <Button
            size="lg"
            className="w-full"
            loading={isPending}
            onClick={() => handleIniciar(false)}
            rightIcon={<ArrowRightIcon size={16} />}
          >
            Comenzar el test
          </Button>
        </div>
      </div>
    )
  }

  // ── Wizard principal ───────────────────────────────────────────────────────
  const esUltimaPagina = paginaActual === totalPaginas - 1
  const todasRespondidas = preguntas.length === totalRespondidas

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header con progreso */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold text-ink">
            Sección {paginaActual + 1} de {totalPaginas}
          </div>
          <Badge tone="primary">{progreso}% completado</Badge>
        </div>
        {/* showValue=false porque Badge ya muestra el porcentaje */}
        <ProgressBar value={progreso} showValue={false} />
        <p className="mt-2 text-xs text-muted">
          {totalRespondidas} de {preguntas.length} preguntas respondidas
        </p>
      </div>

      {/* Preguntas de la página actual */}
      <div className="space-y-4">
        {preguntasPagina.map((pregunta) => (
          <Card key={pregunta.id} padding="lg">
            <div className="mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">
                Pregunta {pregunta.numero_pregunta}
              </span>
              <p className="mt-1 text-[15px] font-medium leading-relaxed text-ink">
                {pregunta.enunciado}
              </p>
            </div>

            {/* Opciones de respuesta */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
              {opciones.map((opcion) => {
                const seleccionada = respuestas[pregunta.id] === opcion.valor_numerico
                return (
                  <button
                    key={opcion.id}
                    type="button"
                    onClick={() => handleRespuesta(pregunta.id, opcion.valor_numerico)}
                    className={[
                      'rounded-lg border-2 px-2 py-3 text-center text-xs font-semibold transition-all',
                      seleccionada
                        ? 'border-primary-600 bg-primary-50 text-primary-600'
                        : 'border-neutral-200 bg-white text-soft hover:border-primary-600 hover:text-primary-600',
                    ].join(' ')}
                  >
                    <div className="text-lg font-black">{opcion.valor_numerico}</div>
                    <div className="mt-0.5 leading-tight">{opcion.texto_opcion}</div>
                  </button>
                )
              })}
            </div>
          </Card>
        ))}
      </div>

      {/* Error */}
      {error && <Alert tone="error" title={error} className="mt-4" />}

      {/* Navegación */}
      <div className="mt-6 flex items-center gap-3">
        {paginaActual > 0 && (
          <Button
            variant="secondary"
            onClick={handleAnterior}
            disabled={isPending}
            className="flex-1"
          >
            ← Anterior
          </Button>
        )}

        {!esUltimaPagina ? (
          <Button
            onClick={handleSiguiente}
            disabled={!paginaCompleta || isPending}
            className="flex-1"
            rightIcon={<ArrowRightIcon size={16} />}
          >
            Siguiente
          </Button>
        ) : (
          <Button
            onClick={handleFinalizar}
            disabled={!todasRespondidas || isPending}
            loading={isPending}
            className="flex-1"
          >
            {isPending ? 'Calculando tu Eneatipo...' : 'Finalizar y ver mi resultado'}
          </Button>
        )}
      </div>
    </div>
  )
}
