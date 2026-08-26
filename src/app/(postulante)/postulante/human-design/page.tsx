import Link from 'next/link'
import { verifySession } from '@/lib/dal'
import { requireEneagramaCompleto } from '@/lib/guards'
import { getHumanDesign } from '@/modules/human-design/queries'
import { createClient } from '@/lib/supabase/server'
import { PERFILES_PROFESIONALES } from '@/modules/eneagrama/perfiles-profesionales'
import { evaluarRehacer, formatearFecha, MESES_ESPERA_REHACER } from '@/modules/eneagrama/rehacer-policy'
import { CheckIcon, ArrowRightIcon, InfoIcon } from '@/components/icons'
import { Alert } from '@/components/ui'
import { HumanDesignForm } from './human-design-form'

export const metadata = { title: 'Perfil de personalidad — MiLiors' }

type DominanteRow = {
  puntaje_crudo: number
  porcentaje: number
  eneatipo: {
    numero_eneatipo: number
    nombre: string
    descripcion: string | null
  }
}

async function getTestConDominantes() {
  const session = await verifySession()
  const supabase = await createClient()

  const { data: perfil } = await supabase
    .from('perfil_postulante')
    .select('id')
    .eq('usuario_id', session.id)
    .single()

  if (!perfil) return null

  const { data: test } = await supabase
    .from('test_eneagrama')
    .select('tiene_empate_dominante, dominantes_empate, veces_completado, fecha_realizacion, test_eneagrama_dominante(puntaje_crudo, porcentaje, eneatipo(numero_eneatipo, nombre, descripcion))')
    .eq('postulante_id', (perfil as { id: string }).id)
    .single()

  return test as {
    tiene_empate_dominante: boolean
    dominantes_empate: number[] | null
    veces_completado: number | null
    fecha_realizacion: string | null
    test_eneagrama_dominante: DominanteRow[]
  } | null
}

export default async function PerfilPersonalidadPage() {
  await verifySession()
  await requireEneagramaCompleto()

  const [hd, test] = await Promise.all([getHumanDesign(), getTestConDominantes()])

  const dominantes = test?.test_eneagrama_dominante ?? []
  const tieneEmpate = test?.tiene_empate_dominante ?? false
  const estadoRehacer = evaluarRehacer(test?.veces_completado ?? 0, test?.fecha_realizacion ?? null)

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-10">

      {/* ── Sección Eneagrama ── */}
      <section className="space-y-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Eneagrama</h1>
          <p className="mt-1 text-sm text-muted">Tu tipo de personalidad según el sistema ITA Riso-Hudson.</p>
        </div>

        {/* Introducción: qué es y para qué se usa acá */}
        <div className="rounded-xl border border-neutral-200 bg-surface px-5 py-4 shadow-card">
          <p className="text-sm font-semibold text-ink">¿Qué es el Eneagrama?</p>
          <p className="mt-1 text-sm text-muted leading-relaxed">
            Es un modelo que agrupa la personalidad en 9 patrones según qué te motiva a la hora de trabajar y decidir.
            En MiLiors lo usamos para traducir ese resultado a información laboral concreta: en qué aportás valor,
            en qué contextos rendís mejor y qué conviene desarrollar.
          </p>
          <p className="mt-2 text-xs text-muted">
            El resultado refleja tu momento actual: se puede rehacer cada {MESES_ESPERA_REHACER} meses.
            {estadoRehacer.esAjusteInicial && ' Como es tu primer resultado, tenés una repetición sin espera.'}
          </p>
        </div>

        {dominantes.length > 0 ? (
          <div className="rounded-xl border border-neutral-200 bg-surface shadow-card divide-y divide-neutral-100 overflow-hidden border-l-4 border-l-primary-600">

            {/* Encabezado con resultado y botón */}
            <div className="flex items-center justify-between gap-4 bg-primary-tint px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-0.5">
                  {tieneEmpate ? 'Empate de dominante' : 'Resultado actual'}
                </p>
                <p className="text-lg font-bold text-ink">
                  {tieneEmpate
                    ? dominantes.map(d => `Tipo ${d.eneatipo.numero_eneatipo}`).join(' / ')
                    : `Tipo ${dominantes[0].eneatipo.numero_eneatipo} — ${dominantes[0].eneatipo.nombre}`
                  }
                </p>
              </div>
              {estadoRehacer.puedeRehacer ? (
                <Link
                  href="/postulante/eneagrama"
                  className="shrink-0 rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-neutral-200"
                >
                  Rehacer test →
                </Link>
              ) : (
                estadoRehacer.disponibleDesde && (
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-muted">Podés rehacerlo desde</p>
                    <p className="text-sm font-semibold text-ink">{formatearFecha(estadoRehacer.disponibleDesde)}</p>
                  </div>
                )
              )}
            </div>

            {/* Aviso de empate */}
            {tieneEmpate && (
              <div className="px-5 py-4">
                <Alert tone="warning" title="Tu test arrojó un empate">
                  Obtuviste el mismo puntaje en los tipos{' '}
                  {dominantes.map(d => `${d.eneatipo.numero_eneatipo} (${d.eneatipo.nombre})`).join(' y ')}.
                  Leé ambas descripciones y evaluá con cuál te identificás más, o rehacé el test.
                </Alert>
              </div>
            )}

            {/* Descripción y lectura profesional de cada dominante */}
            {dominantes.map((d) => {
              const numero = d.eneatipo.numero_eneatipo
              const perfil = PERFILES_PROFESIONALES[numero]
              return (
                <div key={numero} className="px-5 py-4 space-y-4">
                  {tieneEmpate && (
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Tipo {numero} — {d.eneatipo.nombre}
                    </p>
                  )}

                  <p className="text-sm text-neutral-700 leading-relaxed">
                    {d.eneatipo.descripcion ?? perfil?.resumen ?? '—'}
                  </p>

                  {perfil && (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-primary-600 mb-2">
                            Tus fortalezas
                          </p>
                          <ul className="space-y-1.5">
                            {perfil.fortalezas.map((f) => (
                              <li key={f} className="flex gap-2 text-sm text-neutral-700 leading-snug">
                                <span className="mt-0.5 shrink-0 text-primary-600"><CheckIcon size={13} /></span>
                                {f}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-primary-600 mb-2">
                            A desarrollar
                          </p>
                          <ul className="space-y-1.5">
                            {perfil.desarrollos.map((x) => (
                              <li key={x} className="flex gap-2 text-sm text-neutral-700 leading-snug">
                                <span className="mt-0.5 shrink-0 text-primary-600"><ArrowRightIcon size={13} /></span>
                                {x}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="rounded-lg bg-neutral-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">
                          Entorno donde rendís mejor
                        </p>
                        <p className="text-sm text-neutral-700 leading-snug">{perfil.entorno}</p>
                      </div>
                    </>
                  )}
                </div>
              )
            })}

          </div>
        ) : (
          <div className="rounded-xl border border-neutral-200 bg-surface px-5 py-4 shadow-card flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-ink">Completá el test de Eneagrama</p>
              <p className="mt-0.5 text-xs text-muted">Aún no tenés un resultado registrado.</p>
            </div>
            <Link
              href="/postulante/eneagrama"
              className="shrink-0 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
            >
              Ir al test →
            </Link>
          </div>
        )}
      </section>

      {/* Divisor */}
      <hr className="border-neutral-200" />

      {/* ── Sección Human Design ── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-ink">Human Design</h2>
          <p className="mt-1 text-sm text-muted">Tu carta de Human Design enriquece el informe combinado de personalidad.</p>
        </div>

        {!hd && (
          <div className="flex items-start gap-3 rounded-xl bg-primary-tint px-4 py-3 ring-1 ring-primary-ring">
            <span className="mt-0.5 shrink-0 text-primary-600">
              <InfoIcon size={17} />
            </span>
            <div>
              <p className="text-sm font-semibold text-primary-700">Sección opcional</p>
              <p className="mt-0.5 text-sm text-primary-600">
                Completá tu carta solo si ya la conocés. Una vez guardada, no podrás eliminar esta información.
              </p>
            </div>
          </div>
        )}

        <HumanDesignForm hd={hd} />
      </section>

    </div>
  )
}
