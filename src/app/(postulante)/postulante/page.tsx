import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { requireEneagramaCompleto } from '@/lib/guards'
import { TyCGate } from '@/components/shared/tyc-gate'
import { Card } from '@/components/ui'
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

export const metadata = { title: 'Inicio — TalentID' }

const QUICK_LINKS = [
  {
    href: '/postulante/perfil',
    icon: <UserIcon size={20} className="text-primary-600" />,
    title: 'Perfil técnico',
    desc: 'Formación, experiencia, idiomas y competencias',
  },
  {
    href: '/postulante/human-design',
    icon: <GridIcon size={20} className="text-primary-600" />,
    title: 'Human Design',
    desc: 'Tipo energético, autoridad y estrategia',
  },
  {
    href: '/postulante/informe',
    icon: <FileIcon size={20} className="text-primary-600" />,
    title: 'Informe de personalidad',
    desc: 'Tu perfil generado por IA',
  },
  {
    href: '/postulante/certificado',
    icon: <ShieldIcon size={20} className="text-primary-600" />,
    title: 'Certificado',
    desc: 'PDF verificable con código QR',
  },
  {
    href: '/postulante/puestos',
    icon: <SearchIcon size={20} className="text-primary-600" />,
    title: 'Buscar puestos',
    desc: 'Explorá las oportunidades disponibles',
  },
  {
    href: '/postulante/postulaciones',
    icon: <CheckCircleIcon size={20} className="text-primary-600" />,
    title: 'Mis postulaciones',
    desc: 'Estado de tus aplicaciones',
  },
]

export default async function PostulanteDashboard() {
  const session = await verifySession()
  await requireEneagramaCompleto()

  const supabase = await createClient()
  const { data: perfil } = await supabase
    .from('perfil_postulante')
    .select('nombre_completo, perfil_en_busqueda')
    .eq('usuario_id', session.id)
    .single()

  const nombre =
    (perfil as { nombre_completo: string; perfil_en_busqueda: boolean } | null)?.nombre_completo ??
    session.email
  const perfilEnBusqueda =
    (perfil as { nombre_completo: string; perfil_en_busqueda: boolean } | null)?.perfil_en_busqueda ??
    false

  return (
    <TyCGate>
      <div className="mx-auto max-w-4xl px-6 py-10 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold text-ink">
            ¡Hola, {nombre.split(' ')[0]}!
          </h1>
          <p className="mt-1 text-sm text-muted">Bienvenido a tu espacio en TalentID.</p>
        </div>

        {/* Visibilidad */}
        <Card padding="lg">
          <h2 className="text-[13.5px] font-bold text-ink mb-3">Visibilidad en búsquedas</h2>
          <VisibilityToggle initialValue={perfilEnBusqueda} />
        </Card>

        {/* Accesos rápidos */}
        <div>
          <h2 className="text-[13.5px] font-bold text-ink mb-3">Accesos rápidos</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
