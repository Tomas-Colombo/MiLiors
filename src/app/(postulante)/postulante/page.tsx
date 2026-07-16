import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { requireEneagramaCompleto } from '@/lib/guards'
import { TyCGate } from '@/components/shared/tyc-gate'
import { VisibilityToggle } from '@/modules/visibilidad/visibility-toggle'
import {
  UserIcon,
  GridIcon,
  FileIcon,
  ShieldIcon,
  SearchIcon,
  CheckCircleIcon,
  ArrowRightIcon,
} from '@/components/icons'
import Link from 'next/link'
import { EneatipoRadar } from './eneatipo-radar'

export const metadata = { title: 'Inicio — TalentID' }

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

const QUICK_LINKS = [
  {
    href: '/postulante/perfil',
    icon: <UserIcon size={17} />,
    title: 'Perfil técnico',
    desc: 'Formación, experiencia e idiomas',
  },
  {
    href: '/postulante/informe',
    icon: <FileIcon size={17} />,
    title: 'Informe de personalidad',
    desc: 'Tu perfil generado por IA',
  },
  {
    href: '/postulante/certificado',
    icon: <ShieldIcon size={17} />,
    title: 'Certificado',
    desc: 'PDF verificable con QR',
  },
  {
    href: '/postulante/puestos',
    icon: <SearchIcon size={17} />,
    title: 'Buscar puestos',
    desc: 'Explorá oportunidades',
  },
  {
    href: '/postulante/postulaciones',
    icon: <CheckCircleIcon size={17} />,
    title: 'Mis postulaciones',
    desc: 'Estado de tus aplicaciones',
  },
  {
    href: '/postulante/human-design',
    icon: <GridIcon size={17} />,
    title: 'Perfil de personalidad',
    desc: 'Tipo energético y autoridad',
  },
]

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

  let puntajes: { eneatipo_numero: number; puntaje_crudo: number }[] = []
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
      const [{ data: puntajesData }, { data: dominantesData }] = await Promise.all([
        supabase
          .from('resultado_puntaje_eneagrama')
          .select('eneatipo_numero, puntaje_crudo')
          .eq('test_eneagrama_id', testId)
          .order('eneatipo_numero'),
        supabase
          .from('test_eneagrama_dominante')
          .select('eneatipo:eneatipo_id(numero_eneatipo, nombre)')
          .eq('test_eneagrama_id', testId),
      ])

      if (puntajesData) {
        puntajes = puntajesData as { eneatipo_numero: number; puntaje_crudo: number }[]
      }

      if (dominantesData) {
        dominantes = (dominantesData as { eneatipo: { numero_eneatipo: number; nombre: string } | null }[])
          .filter((d): d is { eneatipo: { numero_eneatipo: number; nombre: string } } => d.eneatipo !== null)
          .map((d) => ({ numero: d.eneatipo.numero_eneatipo, nombre: d.eneatipo.nombre }))
      }
    }
  }

  const nombrePrimero = nombre.split(' ')[0]
  // El radar sólo muestra datos cuando hay un resultado válido persistido (9 puntajes
  // + al menos un dominante). Si el test fue inválido y nunca se persistió, no hay nada que mostrar.
  const tieneRadar = puntajes.length === 9 && dominantes.length > 0

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
          <p className="mt-1 text-sm text-muted">Bienvenido a tu espacio en TalentID.</p>
        </div>

        <div className="flex gap-6 items-start flex-wrap lg:flex-nowrap">

          {/* ─── Columna principal: Radar ─── */}
          <div className="flex-1 min-w-0">
            <div
              className="rounded-[14px] bg-surface p-8"
              style={{ border: '1px solid var(--color-border-soft)' }}
            >
              <div className="mb-6 flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--color-accent-violet)' }}>
                    Perfil de eneagrama
                  </p>
                  <h2
                    className="text-xl font-semibold leading-snug"
                    style={{ fontFamily: 'var(--font-heading), Georgia, serif', color: 'var(--color-ink)' }}
                  >
                    Distribución de los 9 eneatipos
                  </h2>
                  <p className="mt-1 text-xs text-muted max-w-xs">
                    Visualización de forma y proporción relativa entre los 9 ejes.
                  </p>
                </div>

                {dominantes.length > 0 && (
                  <div
                    className="flex-none rounded-xl px-5 py-3 text-center"
                    style={{ background: 'var(--color-accent-violet-bg)', minWidth: 132 }}
                  >
                    <p className="text-[11px] text-muted mb-0.5">
                      {dominantes.length > 1 ? 'Tus eneatipos' : 'Tu eneatipo'}
                    </p>
                    <p
                      className="text-3xl font-semibold leading-none"
                      style={{ fontFamily: 'var(--font-heading), Georgia, serif', color: 'var(--color-accent-violet)' }}
                    >
                      {dominantes.map((d) => d.numero).join(' / ')}
                    </p>
                    <p className="text-[11px] font-medium mt-1.5" style={{ color: 'var(--color-ink)' }}>
                      {dominantes.map((d) => ENEATIPO_NOMBRES[d.numero] ?? d.nombre).join(' · ')}
                    </p>
                  </div>
                )}
              </div>

              {tieneRadar ? (
                <div className="flex justify-center">
                  <div style={{ width: '100%', maxWidth: 440, padding: '0 40px' }}>
                    <EneatipoRadar puntajes={puntajes} dominantes={dominantes.map((d) => d.numero)} size={440} />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-16">
                  <p className="text-sm text-muted">Completá el test de Eneagrama para ver tu gráfico.</p>
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
            <div
              className="rounded-[14px] bg-surface px-5 py-4"
              style={{ border: '1px solid var(--color-border-soft)' }}
            >
              <h2
                className="text-[11px] font-semibold uppercase tracking-widest mb-3"
                style={{ color: 'var(--color-accent-violet)' }}
              >
                Accesos rápidos
              </h2>
              <div className="flex flex-col gap-0.5">
                {QUICK_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-[9px] px-3 py-2.5 transition-colors group hover:bg-accent-violet-bg"
                    style={{ color: 'var(--color-ink)' }}
                  >
                    <span className="flex-none" style={{ color: 'var(--color-accent-violet)' }}>{item.icon}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-semibold leading-tight">{item.title}</span>
                      <span className="block text-[11px] text-muted leading-tight mt-0.5">{item.desc}</span>
                    </span>
                    <ArrowRightIcon
                      size={13}
                      className="flex-none text-neutral-300 group-hover:text-primary-600 transition-colors"
                    />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </TyCGate>
  )
}
