import Link from 'next/link'
import { Card } from '@/components/ui'
import {
  BuildingIcon,
  GridIcon,
  FileIcon,
  SearchIcon,
  PlusIcon,
  ArrowRightIcon,
} from '@/components/icons'

/**
 * Accesos rápidos del dashboard de reclutador.
 *
 * Vive en su propio módulo porque no depende de ninguna query: así el
 * `loading.tsx` puede pintarlo REAL (navegable) mientras el perfil y las
 * métricas están en vuelo, sin duplicar el listado.
 */
const QUICK_LINKS = [
  {
    href: '/reclutador/empresas',
    icon: <BuildingIcon size={20} className="text-primary-600" />,
    title: 'Mis empresas',
    desc: 'Administrá las empresas para las que reclutás',
  },
  {
    href: '/reclutador/puestos',
    icon: <GridIcon size={20} className="text-primary-600" />,
    title: 'Mis puestos',
    desc: 'Gestioná tus vacantes activas y pausadas',
  },
  {
    href: '/reclutador/puestos/nuevo',
    icon: <PlusIcon size={20} className="text-primary-600" />,
    title: 'Publicar puesto',
    desc: 'Nueva vacante con notas privadas sobre el puesto',
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

export function QuickLinksReclutador() {
  return (
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
  )
}
