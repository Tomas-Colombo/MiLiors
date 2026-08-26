'use client'

import { useState, useTransition, useCallback, useEffect, useRef } from 'react'
import { Button, Card, Badge, ProgressBar, Alert, Modal, ConfirmDialog } from '@/components/ui'
import { iniciarTest, guardarRespuesta, calcularEneatipo } from '@/modules/eneagrama/actions'
import { formatearFecha, MESES_ESPERA_REHACER } from '@/modules/eneagrama/rehacer-policy'
import { useRouter } from 'next/navigation'
import { BrandLogo } from '@/components/shared/brand-logo'
import {
  CheckIcon,
  ArrowRightIcon,
  ChevronLeftIcon,
  CalendarIcon,
  ShieldIcon,
  InfoIcon,
  HelpCircleIcon,
} from '@/components/icons'

const PREGUNTAS_POR_PAGINA = 15

/**
 * Guarda una respuesta reintentando una vez. Ahora que la navegación no espera
 * al guardado, una falla puntual pasaría desapercibida hasta el cálculo final;
 * el upsert es idempotente, así que reintentar no tiene costo.
 */
async function persistirRespuesta(
  testId: string,
  preguntaId: string,
  valor: number
): Promise<boolean> {
  for (let intento = 0; intento < 2; intento++) {
    try {
      const result = await guardarRespuesta(testId, preguntaId, valor)
      if (result.success) return true
    } catch {
      // Error de red: cae al reintento.
    }
  }
  return false
}

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

type EstadoRehacer = {
  puedeRehacer: boolean
  primeraVez: boolean
  esAjusteInicial: boolean
  /** ISO de la fecha desde la que podrá rehacerlo (null si ya puede). */
  disponibleDesde: string | null
}

type Props = {
  preguntas: Pregunta[]
  opciones: Opcion[]
  perfilId: string
  testId: string | null
  respuestasIniciales: Record<string, number>
  yaCompleto: boolean
  humanDesignCompleto: boolean
  estadoRehacer: EstadoRehacer
}

export function EneagramaWizard({
  preguntas,
  opciones,
  perfilId,
  testId: testIdInicial,
  respuestasIniciales,
  yaCompleto,
  humanDesignCompleto,
  estadoRehacer,
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
  // Modal de preparación previo a responder. 'inicio' = primera vez / retomar,
  // 'rehacer' = sobrescribir un resultado existente.
  const [preparacionPara, setPreparacionPara] = useState<'inicio' | 'rehacer' | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  // Guardados de respuestas todavía en vuelo. Navegar entre secciones NO los
  // espera (la validación es local); calcular el resultado o reiniciar el test
  // sí, porque el servidor lee/borra las respuestas ya persistidas.
  const guardadosEnVuelo = useRef<Set<Promise<unknown>>>(new Set())

  const disponibleDesde = estadoRehacer.disponibleDesde ? new Date(estadoRehacer.disponibleDesde) : null

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

      // iniciarTest() borra las respuestas del test: hay que dejar que aterricen
      // los guardados en vuelo antes, o uno tardío las reviviría después.
      await Promise.allSettled([...guardadosEnVuelo.current])

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

      // Persistir fuera de cualquier transition: dentro de una, `isPending`
      // queda en true hasta que vuelve el server action y deshabilita
      // "Siguiente", que es lo que hacía sentir lento el paso de sección.
      const guardado = persistirRespuesta(testId, preguntaId, valor)
        .then((ok) => {
          if (!ok) setError('Error al guardar una respuesta. Verificá tu conexión.')
        })
        .finally(() => {
          guardadosEnVuelo.current.delete(guardado)
        })

      guardadosEnVuelo.current.add(guardado)
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
      // El cálculo lee las respuestas desde la base: acá sí hay que esperar a
      // que terminen los guardados en vuelo, si no el test figura incompleto.
      await Promise.allSettled([...guardadosEnVuelo.current])

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

  // ── Modal de preparación (previo a responder o a rehacer) ──────────────────
  const textoVigencia = estadoRehacer.primeraVez
    ? `El resultado refleja tu momento actual. Como es tu primer test, vas a poder repetirlo una vez sin esperar; a partir de ahí, cada ${MESES_ESPERA_REHACER} meses.`
    : estadoRehacer.esAjusteInicial
      ? `Esta repetición no tiene espera por ser el ajuste de tu primer resultado. Después vas a poder rehacer el test cada ${MESES_ESPERA_REHACER} meses.`
      : `El resultado refleja tu momento actual. Vas a poder rehacerlo nuevamente dentro de ${MESES_ESPERA_REHACER} meses.`

  const puntosPreparacion = [
    {
      icon: <CalendarIcon size={16} />,
      titulo: 'Tiempo estimado',
      texto: 'Alrededor de 20 minutos. Podés guardar el progreso y retomarlo cuando quieras.',
    },
    {
      icon: <HelpCircleIcon size={16} />,
      titulo: 'Sin apuro',
      texto: 'Buscá un momento tranquilo y elegí la primera opción que te represente.',
    },
    {
      icon: <ShieldIcon size={16} />,
      titulo: 'Respondé con honestidad',
      texto: 'Contestá desde cómo trabajás hoy, no desde cómo creés que deberías ser. No hay respuestas correctas ni incorrectas.',
    },
    {
      icon: <InfoIcon size={16} />,
      titulo: 'Vigencia del resultado',
      texto: textoVigencia,
    },
  ]

  const modalPreparacion = (
    <Modal
      open={preparacionPara !== null}
      onClose={() => setPreparacionPara(null)}
      icon={<BrandLogo size={44} />}
      title="Antes de empezar"
      footer={
        <>
          <Button variant="ghost" size="sm" className="flex-1" onClick={() => setPreparacionPara(null)}>
            Ahora no
          </Button>
          <Button
            size="sm"
            className="flex-1"
            loading={isPending}
            rightIcon={<ArrowRightIcon size={15} />}
            onClick={() => {
              const reiniciar = preparacionPara === 'rehacer'
              setPreparacionPara(null)
              handleIniciar(reiniciar)
            }}
          >
            {preparacionPara === 'rehacer' ? 'Entendido, rehacer' : 'Entendido, comenzar'}
          </Button>
        </>
      }
    >
      <ul className="space-y-3.5">
        {puntosPreparacion.map((p) => (
          <li key={p.titulo} className="flex gap-3">
            <span className="mt-0.5 flex-none text-primary-600">{p.icon}</span>
            <span>
              <span className="block text-[13.5px] font-semibold text-ink">{p.titulo}</span>
              <span className="block text-[13px] leading-snug text-muted">{p.texto}</span>
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  )

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
                empresas que usan MiLiors lo tienen muy en cuenta a la hora de evaluar
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
            {estadoRehacer.esAjusteInicial
              ? 'Podés rehacerlo una vez sin esperar para ajustar tu primer resultado. Esto sobrescribirá el resultado anterior.'
              : estadoRehacer.puedeRehacer
                ? 'Podés rehacer el test si querés actualizar tu perfil de personalidad. Esto sobrescribirá el resultado anterior.'
                : `El Eneagrama se puede rehacer cada ${MESES_ESPERA_REHACER} meses para que el resultado refleje un cambio real y no el momento del día.`}
          </p>

          {!estadoRehacer.puedeRehacer && disponibleDesde && (
            <div className="mt-4 rounded-lg border border-neutral-200 bg-primary-tint px-4 py-3 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Próxima repetición disponible</p>
              <p className="mt-0.5 text-sm font-semibold text-ink">{formatearFecha(disponibleDesde)}</p>
            </div>
          )}

          {error && <Alert tone="error" title={error} className="mt-4" />}

          <div className="mt-6 flex flex-col gap-3">
            <Button
              size="lg"
              className="w-full"
              rightIcon={<ArrowRightIcon size={16} />}
              onClick={() => router.push('/postulante')}
            >
              Ir a mi perfil
            </Button>
            {estadoRehacer.puedeRehacer && (
              <Button
                variant="ghost"
                size="lg"
                className="w-full"
                onClick={() => setPreparacionPara('rehacer')}
                loading={isPending}
              >
                Rehacer el test
              </Button>
            )}
          </div>
        </div>
        {modalPreparacion}
      </div>
    )
  }

  // ── Pantalla de inicio (sin test aún) ─────────────────────────────────────
  if (iniciando) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md text-center">
          <BrandLogo size={64} className="mx-auto mb-6" />
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
            onClick={() => setPreparacionPara('inicio')}
            rightIcon={<ArrowRightIcon size={16} />}
          >
            Comenzar el test
          </Button>
        </div>
        {modalPreparacion}
      </div>
    )
  }

  // ── Wizard principal ───────────────────────────────────────────────────────
  const esUltimaPagina = paginaActual === totalPaginas - 1
  const todasRespondidas = preguntas.length === totalRespondidas

  return (
    <div ref={containerRef} className="mx-auto max-w-2xl px-4 py-8">
      <ConfirmDialog
        open={mostrarConfirmCancelar}
        onClose={() => setMostrarConfirmCancelar(false)}
        onConfirm={handleConfirmarCancelar}
        tone="destructive"
        title="¿Cancelar el test?"
        cancelLabel="Seguir respondiendo"
        confirmLabel="Sí, cancelar"
      >
        <Alert tone="warning">
          Tus respuestas no se guardan como historial: si salís ahora perdés lo respondido en esta
          sección y vas a tener que empezar de nuevo.
        </Alert>
      </ConfirmDialog>

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
          <div className="group relative flex-1">
            <Button
              onClick={handleSiguiente}
              disabled={!paginaCompleta}
              className="w-full"
              rightIcon={<ArrowRightIcon size={16} />}
            >
              Siguiente
            </Button>
            {!paginaCompleta && (
              <div
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-max max-w-[16rem] -translate-x-1/2 rounded-md bg-neutral-900 px-3 py-2 text-center text-xs font-medium text-white shadow-lg group-hover:block"
              >
                Respondé todas las preguntas de esta secci&oacute;n para continuar
                <span className="absolute left-1/2 top-full -ml-1 border-4 border-transparent border-t-neutral-900" />
              </div>
            )}
          </div>
        ) : (
          <div className="group relative flex-1">
            <Button
              onClick={handleFinalizar}
              disabled={!todasRespondidas || isPending}
              loading={isPending}
              className="w-full"
            >
              {isPending ? 'Calculando tu Eneatipo...' : 'Finalizar y ver mi resultado'}
            </Button>
            {!todasRespondidas && !isPending && (
              <div
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-max max-w-[16rem] -translate-x-1/2 rounded-md bg-neutral-900 px-3 py-2 text-center text-xs font-medium text-white shadow-lg group-hover:block"
              >
                Respond&eacute; todas las preguntas de esta secci&oacute;n para continuar
                <span className="absolute left-1/2 top-full -ml-1 border-4 border-transparent border-t-neutral-900" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
