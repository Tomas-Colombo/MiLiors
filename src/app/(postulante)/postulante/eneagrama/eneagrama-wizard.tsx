'use client'

import { useState, useTransition, useCallback, useEffect, useRef } from 'react'
import { Button, Card, Badge, ProgressBar, Alert } from '@/components/ui'
import { iniciarTest, guardarRespuesta, calcularEneatipo } from '@/modules/eneagrama/actions'
import { useRouter } from 'next/navigation'
import { SparklesIcon, CheckIcon, ArrowRightIcon, ChevronLeftIcon } from '@/components/icons'

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
  humanDesignCompleto: boolean
}

export function EneagramaWizard({
  preguntas,
  opciones,
  perfilId,
  testId: testIdInicial,
  respuestasIniciales,
  yaCompleto,
  humanDesignCompleto,
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
  const [eneatipoNombre, setEneatipoNombre] = useState<string | null>(null)
  const [iniciando, setIniciando] = useState(!testIdInicial)
  const [resultadoInvalido, setResultadoInvalido] = useState(false)
  const [mostrarConfirmCancelar, setMostrarConfirmCancelar] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

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

  // Scroll al inicio de la página de preguntas cada vez que cambia,
  // después de que el nuevo contenido ya se haya montado.
  useEffect(() => {
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [paginaActual])

  // Avanzar página
  function handleSiguiente() {
    if (!paginaCompleta) {
      setError('Respondé todas las preguntas de esta sección antes de continuar.')
      return
    }
    setError(null)
    if (paginaActual < totalPaginas - 1) {
      setPaginaActual((p) => p + 1)
    }
  }

  // Retroceder página
  function handleAnterior() {
    setError(null)
    if (paginaActual > 0) {
      setPaginaActual((p) => p - 1)
    }
  }

  // Calcular eneatipo al finalizar
  function handleFinalizar() {
    if (!testId) return
    setError(null)
    setResultadoInvalido(false)

    startTransition(async () => {
      const result = await calcularEneatipo(testId)
      if (!result.success) {
        if (result.error === 'TEST_INVALIDO') {
          setResultadoInvalido(true)
          return
        }
        setError(result.error)
        return
      }
      setEneatipoResultado(result.data.eneatipoNumero)
      setEneatipoNombre(result.data.eneatipoNombre)
      setCompletado(true)
    })
  }

  // Volver a intentar tras un test inválido: limpia el estado local del intento
  // fallido y muestra primero la plantilla "Comenzar el test" — no se vuelve a
  // llamar iniciarTest() (ni se toca el resultado anterior en la base) hasta que
  // el usuario confirma explícitamente que quiere empezar de nuevo.
  function handleReintentar() {
    setResultadoInvalido(false)
    setRespuestas({})
    setPaginaActual(0)
    setCompletado(false)
    setEneatipoResultado(null)
    setEneatipoNombre(null)
    setIniciando(true)
  }

  // Cancelar el test en curso: como las respuestas se sobrescriben (no hay
  // histórico), salir implica perder lo respondido hasta ahora.
  function handleConfirmarCancelar() {
    setMostrarConfirmCancelar(false)
    router.push('/postulante')
  }

  // ── Pantalla de test inválido (respuestas sin variación suficiente) ────────
  if (resultadoInvalido) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="rounded-2xl bg-surface p-8 text-center shadow-card">
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: 'var(--color-error-bg)' }}
            >
              <span className="text-2xl">⚠️</span>
            </div>
            <Badge tone="warning" className="mb-3">No pudimos calcular tu resultado</Badge>
            <h1 className="text-xl font-extrabold tracking-tight text-ink">
              Tus respuestas no permiten calcular un perfil confiable
            </h1>
            <div className="mt-4 space-y-3 text-left text-sm leading-relaxed text-muted">
              <p>
                El Eneagrama puede ser uno de los activos más valiosos de tu perfil: las
                empresas que usan TalentID lo tienen muy en cuenta a la hora de evaluar
                candidatos, porque revela fortalezas, estilos de trabajo y patrones de
                comportamiento reales.
              </p>
              <p>
                Para que el resultado sea genuino, cada respuesta tiene que reflejar
                honestamente cuánto te identificás con cada afirmación, sin buscar &ldquo;la
                opción correcta&rdquo;. El test no tiene respuestas buenas ni malas — sí tiene
                resultados que aportan información real, y otros que no.
              </p>
              <p>
                Esta vez tus respuestas fueron demasiado uniformes y no generaron variación
                suficiente para identificar tu perfil. Te invitamos a rehacerlo con calma,
                pensando cada afirmación.
              </p>
            </div>
            <div className="mt-6">
              <Button
                size="lg"
                className="w-full"
                onClick={handleReintentar}
                loading={isPending}
                rightIcon={<ArrowRightIcon size={16} />}
              >
                Rehacer el test
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Pantalla de resultado recién obtenido ──────────────────────────────────
  if (completado && eneatipoResultado) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Card resultado eneagrama */}
          <div className="rounded-2xl bg-surface p-8 text-center shadow-card">
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl shadow-primary"
              style={{ background: 'var(--gradient-brand-soft)' }}
            >
              <CheckIcon size={28} className="text-white" />
            </div>
            <Badge tone="success" className="mb-3">Eneagrama completo</Badge>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">
              {eneatipoNombre ?? `Eneatipo ${eneatipoResultado}`}
            </h1>
            <p className="mt-1 text-sm text-muted">Tipo {eneatipoResultado}</p>
          </div>

          {/* Propuesta Human Design — solo si no fue completado aún */}
          {!humanDesignCompleto ? (
            <div className="mt-6 rounded-2xl bg-surface p-6 shadow-card">
              <div className="mb-1 text-base font-bold text-ink">¿Agregás tu Human Design?</div>
              <p className="mb-5 text-sm text-muted">
                Si conocés tu carta, podés incorporarla ahora y el informe de personalidad
                combinará ambos sistemas para un resultado más completo.
              </p>
              <div className="flex flex-col gap-3">
                <Button
                  size="lg"
                  className="w-full"
                  rightIcon={<ArrowRightIcon size={16} />}
                  onClick={() => router.push('/postulante/human-design')}
                >
                  Agregar Human Design
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  className="w-full"
                  onClick={() => router.push('/postulante')}
                >
                  Continuar sin Human Design
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-6">
              <Button
                size="lg"
                className="w-full"
                onClick={() => router.push('/postulante')}
              >
                Ir a mi perfil
              </Button>
            </div>
          )}
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
            <div className="rounded-lg bg-surface p-3 shadow-card">
              <div className="text-xl font-black text-primary-600">135</div>
              <div className="text-xs text-muted">preguntas</div>
            </div>
            <div className="rounded-lg bg-surface p-3 shadow-card">
              <div className="text-xl font-black text-primary-600">9</div>
              <div className="text-xs text-muted">secciones</div>
            </div>
            <div className="rounded-lg bg-surface p-3 shadow-card">
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
    <div ref={containerRef} className="mx-auto max-w-2xl px-4 py-8">
      {/* Modal de confirmación al cancelar */}
      {mostrarConfirmCancelar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl">
            <h3 className="text-base font-bold text-ink">¿Cancelar el test?</h3>
            <div className="mt-3 rounded-lg border border-warning-border bg-warning-bg px-3 py-3">
              <p className="text-sm text-warning">
                Tus respuestas no se guardan como historial: si salís ahora perdés lo
                respondido en esta sección y vas a tener que empezar de nuevo.
              </p>
            </div>
            <div className="mt-4 flex gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={() => setMostrarConfirmCancelar(false)}
              >
                Seguir respondiendo
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={handleConfirmarCancelar}
              >
                Sí, cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancelar */}
      <button
        type="button"
        onClick={() => setMostrarConfirmCancelar(true)}
        disabled={isPending}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink disabled:opacity-50"
      >
        <ChevronLeftIcon size={15} />
        Cancelar
      </button>

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
                        : 'border-neutral-200 bg-surface text-soft hover:border-primary-600 hover:text-primary-600',
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
