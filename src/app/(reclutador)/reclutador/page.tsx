import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { TyCGate } from '@/components/shared/tyc-gate'
import { Card } from '@/components/ui'
import { redirect } from 'next/navigation'
import {
  BuildingIcon,
  FileIcon,
  SearchIcon,
  PlusIcon,
  ArrowRightIcon,
} from '@/components/icons'
import Link from 'next/link'

export const metadata = { title: 'Inicio — TalentID Reclutador' }

export default async function ReclutadorDashboard() {
  const session = await verifySession()
  const supabase = await createClient()

  const { data: reclutador } = await supabase
    .from('perfil_reclutador')
    .select('id, nombre_reclutador, empresa_id, empresa(nombre_empresa)')
    .eq('usuario_id', session.id)
    .single()

  // Redirect to onboarding if no company linked
  if (!reclutador || !(reclutador as { empresa_id: string | null }).empresa_id) {
    redirect('/reclutador/onboarding')
  }

  type ReclutadorRow = {
    id: string
    nombre_reclutador: string
    empresa_id: string
    empresa: { nombre_empresa: string } | null
  }

  const rec = reclutador as ReclutadorRow

  // Fast count queries
  const puestosRes = await supabase
    .from('puesto')
    .select('*', { count: 'exact', head: true })
    .eq('reclutador_id', rec.id)
    .eq('activo', true)

  const puestosIds = await supabase
    .from('puesto')
    .select('id')
    .eq('reclutador_id', rec.id)

  const idList = (puestosIds.data ?? []).map((p: unknown) => (p as { id: string }).id)

  const postulacionesRes = idList.length > 0
    ? await supabase
        .from('postulacion')
        .select('*', { count: 'exact', head: true })
        .in('puesto_id', idList)
    : { count: 0 }

  const puestosActivos = puestosRes.count ?? 0
  const postulacionesRecibidas = postulacionesRes.count ?? 0

  const QUICK_LINKS = [
    {
      href: '/reclutador/puestos',
      icon: <BuildingIcon size={20} className="text-primary-600" />,
      title: 'Mis puestos',
      desc: 'Gestioná tus vacantes activas y cerradas',
    },
    {
      href: '/reclutador/puestos/nuevo',
      icon: <PlusIcon size={20} className="text-primary-600" />,
      title: 'Publicar puesto',
      desc: 'Nueva vacante con perfil psicológico deseado',
    },
    {
      href: '/reclutador/postulaciones',
      icon: <FileIcon size={20} className="text-primary-600" />,
      title: 'Postulaciones',
      desc: 'Candidatos que aplicaron a tus puestos',
    },
    {
      href: '/reclutador/postulantes',
      icon: <SearchIcon size={20} className="text-primary-600" />,
      title: 'Buscar candidatos',
      desc: 'Explorá el banco de talentos disponibles',
    },
  ]

  return (
    <TyCGate>
      <div className="mx-auto max-w-4xl px-6 py-10 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold text-ink">
            ¡Hola, {rec.nombre_reclutador.split(' ')[0]}!
          </h1>
          <p className="mt-1 text-sm text-muted">{rec.empresa?.nombre_empresa ?? 'Tu empresa'}</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4">
          <Card padding="lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Puestos activos
            </p>
            <p className="mt-2 text-3xl font-black text-ink">{puestosActivos}</p>
          </Card>
          <Card padding="lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Postulaciones recibidas
            </p>
            <p className="mt-2 text-3xl font-black text-ink">{postulacionesRecibidas}</p>
          </Card>
        </div>

        {/* Accesos rápidos */}
        <div>
          <h2 className="text-[13.5px] font-bold text-ink mb-3">Accesos rápidos</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {QUICK_LINKS.map((item) => (
              <Link key={item.href} href={item.href} className="block group">
                <Card padding="md" className="h-full transition-shadow hover:shadow-card-raised">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        {item.icon}
                        <span className="text-[13.5px] font-semibold text-ink">{item.title}</span>
                      </div>
                      <p className="text-xs text-muted leading-relaxed">{item.desc}</p>
                    </div>
                    <ArrowRightIcon
                      size={14}
                      className="mt-1 flex-none text-neutral-300 transition-colors group-hover:text-primary-600"
                    />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </TyCGate>
  )
}
