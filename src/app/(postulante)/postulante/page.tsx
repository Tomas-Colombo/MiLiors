import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { requireEneagramaCompleto } from '@/lib/guards'
import { TyCGate } from '@/components/shared/tyc-gate'
import { VisibilityToggle } from '@/modules/visibilidad/visibility-toggle'
import {
  SearchIcon,
  StarIcon,
  UsersIcon,
  BarChartIcon,
} from '@/components/icons'
import Link from 'next/link'
import { PERFILES_PROFESIONALES } from '@/modules/eneagrama/perfiles-profesionales'
import { QuickLinksPostulante } from './quick-links'

export const metadata = { title: 'Inicio — MiLiors' }

const ENEATIPO_NOMBRES: Record<number, string> = {
  1: 'El reformador',
  2: 'El ayudador',
  3: 'El triunfador',
  4: 'El individualista',
  5: 'El investigador',
  6: 'El leal',
  7: 'El entusiasta',
  8: 'El desafiador',
  9: 'El pacificador',
}

export default async function PostulanteDashboard() {
  const session = await verifySession()
  await requireEneagramaCompleto()

  const supabase = await createClient()

  const { data: perfil } = await supabase
    .from('perfil_postulante')
    .select('id, nombre_completo, perfil_en_busqueda')
    .eq('usuario_id', session.id)
    .single()

  const perfilTyped = perfil as {
    id: string
    nombre_completo: string
    perfil_en_busqueda: boolean
  } | null

  const nombre = perfilTyped?.nombre_completo ?? session.email
  const perfilEnBusqueda = perfilTyped?.perfil_en_busqueda ?? false
  const perfilId = perfilTyped?.id

  let dominantes: { numero: number; nombre: string }[] = []

  if (perfilId) {
    const { data: testData } = await supabase
      .from('test_eneagrama')
      .select('id')
      .eq('postulante_id', perfilId)
      .single()

    if (testData) {
      const testId = (testData as { id: string }).id

      // Misma fuente de verdad que el perfil de personalidad: todos los dominantes
      // (puede haber 1, 2 o 3 en caso de empate legítimo), sin recortar a uno solo.
      const { data: dominantesData } = await supabase
        .from('test_eneagrama_dominante')
        .select('eneatipo:eneatipo_id(numero_eneatipo, nombre)')
        .eq('test_eneagrama_id', testId)

      if (dominantesData) {
        dominantes = (dominantesData as { eneatipo: { numero_eneatipo: number; nombre: string } | null }[])
          .filter((d): d is { eneatipo: { numero_eneatipo: number; nombre: string } } => d.eneatipo !== null)
          .map((d) => ({ numero: d.eneatipo.numero_eneatipo, nombre: d.eneatipo.nombre }))
      }
    }
  }

  const nombrePrimero = nombre.split(' ')[0]
  // En caso de empate se muestra el primer dominante y se avisa del empate: el
  // detalle de ambos vive en el perfil de personalidad.
  const principal = dominantes[0]
  const perfilProfesional = principal ? PERFILES_PROFESIONALES[principal.numero] : undefined

  return (
    <TyCGate>
      <div className="min-h-screen px-8 py-10" style={{ background: 'var(--color-page)' }}>

        {/* Saludo */}
        <div className="mb-8">
          <h1
            className="text-3xl font-semibold"
            style={{ fontFamily: 'var(--font-heading), Georgia, serif', color: 'var(--color-ink)' }}
          >
            ¡Hola, {nombrePrimero}!
          </h1>
          <p className="mt-1 text-sm text-muted">Bienvenido a tu espacio en MiLiors.</p>
        </div>

        <div className="flex gap-6 items-start flex-wrap lg:flex-nowrap">

          {/* ─── Columna principal: Perfil profesional ─── */}
          <div className="flex-1 min-w-0">
            <div
              className="rounded-[14px] bg-surface p-8"
              style={{ border: '1px solid var(--color-border-soft)' }}
            >
              {perfilProfesional && principal ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--color-accent-violet)' }}>
                    Tu perfil profesional
                  </p>
                  <h2 className="text-2xl font-semibold leading-snug" style={{ color: 'var(--color-ink)' }}>
                    {perfilProfesional.titulo}
                  </h2>
                  <p className="mt-1 text-xs text-muted">
                    Resultado de tu test de eneagrama · Tipo {principal.numero} —{' '}
                    {ENEATIPO_NOMBRES[principal.numero] ?? principal.nombre}
                    {dominantes.length > 1 && (
                      <> · Empate con {dominantes.slice(1).map((d) => `tipo ${d.numero}`).join(', ')}</>
                    )}
                  </p>

                  <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
                    {perfilProfesional.resumen}
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    {[
                      { icon: <StarIcon size={16} />, label: 'Fortaleza principal', text: perfilProfesional.fortaleza },
                      { icon: <UsersIcon size={16} />, label: 'Entorno donde rendís mejor', text: perfilProfesional.entorno },
                      { icon: <BarChartIcon size={16} />, label: 'Área a desarrollar', text: perfilProfesional.desarrollo },
                    ].map((b) => (
                      <div
                        key={b.label}
                        className="rounded-[10px] px-4 py-3.5"
                        style={{ background: 'var(--color-page)', border: '1px solid var(--color-border-soft)' }}
                      >
                        <div className="flex items-center gap-2 mb-1.5" style={{ color: 'var(--color-accent-violet)' }}>
                          {b.icon}
                          <span className="text-[11px] font-semibold uppercase tracking-wide">{b.label}</span>
                        </div>
                        <p className="text-[13px] leading-snug" style={{ color: 'var(--color-ink)' }}>{b.text}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex items-center gap-3 flex-wrap">
                    <Link
                      href="/postulante/puestos"
                      className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
                    >
                      <SearchIcon size={15} />
                      Buscar puestos para tu perfil
                    </Link>
                    <Link href="/postulante/informe" className="text-sm font-semibold text-muted hover:text-ink transition-colors">
                      Ver informe completo →
                    </Link>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center py-16">
                  <p className="text-sm text-muted">Completá el test de Eneagrama para ver tu perfil profesional.</p>
                </div>
              )}
            </div>
          </div>

          {/* ─── Columna lateral ─── */}
          <div className="w-full lg:w-72 xl:w-80 flex-none flex flex-col gap-4">

            {/* Visibilidad */}
            <div
              className="rounded-[14px] bg-surface px-5 py-4"
              style={{ border: '1px solid var(--color-border-soft)' }}
            >
              <h2
                className="text-[11px] font-semibold uppercase tracking-widest mb-3"
                style={{ color: 'var(--color-accent-violet)' }}
              >
                Visibilidad en búsquedas
              </h2>
              <VisibilityToggle initialValue={perfilEnBusqueda} />
            </div>

            {/* Accesos rápidos */}
            <QuickLinksPostulante />
          </div>
        </div>
      </div>
    </TyCGate>
  )
}
