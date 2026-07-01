import Link from 'next/link'
import { verifySession } from '@/lib/dal'
import { requireEneagramaCompleto } from '@/lib/guards'
import { TyCGate } from '@/components/shared/tyc-gate'
import { getHumanDesign } from '@/modules/human-design/queries'
import { createClient } from '@/lib/supabase/server'
import { HumanDesignForm } from './human-design-form'

export const metadata = { title: 'Perfil de personalidad — TalentID' }

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
    .select('tiene_empate_dominante, dominantes_empate, test_eneagrama_dominante(puntaje_crudo, porcentaje, eneatipo(numero_eneatipo, nombre, descripcion))')
    .eq('postulante_id', (perfil as { id: string }).id)
    .single()

  return test as {
    tiene_empate_dominante: boolean
    dominantes_empate: number[] | null
    test_eneagrama_dominante: DominanteRow[]
  } | null
}

export default async function PerfilPersonalidadPage() {
  await verifySession()
  await requireEneagramaCompleto()

  const [hd, test] = await Promise.all([getHumanDesign(), getTestConDominantes()])

  const dominantes = test?.test_eneagrama_dominante ?? []
  const tieneEmpate = test?.tiene_empate_dominante ?? false

  return (
    <TyCGate>
      <div className="mx-auto max-w-xl px-4 py-8 space-y-10">

        {/* ── Sección Eneagrama ── */}
        <section className="space-y-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">Eneagrama</h1>
            <p className="mt-1 text-sm text-muted">Tu tipo de personalidad según el sistema ITA Riso-Hudson.</p>
          </div>

          {dominantes.length > 0 ? (
            <div className="rounded-xl border border-neutral-200 bg-surface shadow-card divide-y divide-neutral-100">

              {/* Encabezado con resultado y botón */}
              <div className="flex items-center justify-between gap-4 px-5 py-4">
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
                <Link
                  href="/postulante/eneagrama"
                  className="shrink-0 rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-neutral-200"
                >
                  Rehacer test →
                </Link>
              </div>

              {/* Aviso de empate */}
              {tieneEmpate && (
                <div className="px-5 py-3 bg-warning-bg">
                  <p className="text-sm font-semibold text-warning">Tu test arrojó un empate</p>
                  <p className="mt-0.5 text-sm text-warning">
                    Obtuviste el mismo puntaje en los tipos{' '}
                    {dominantes.map(d => `${d.eneatipo.numero_eneatipo} (${d.eneatipo.nombre})`).join(' y ')}.
                    Leé ambas descripciones y evaluá con cuál te identificás más, o rehacé el test.
                  </p>
                </div>
              )}

              {/* Descripción(es) */}
              {dominantes.map((d) => (
                <div key={d.eneatipo.numero_eneatipo} className="px-5 py-4">
                  {tieneEmpate && (
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
                      Tipo {d.eneatipo.numero_eneatipo} — {d.eneatipo.nombre}
                    </p>
                  )}
                  <p className="text-sm text-neutral-700 leading-relaxed">
                    {d.eneatipo.descripcion ?? '—'}
                  </p>
                </div>
              ))}

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
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600 text-[11px] font-black">
                ✦
              </div>
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
    </TyCGate>
  )
}
