import Link from 'next/link'
import { ArrowRightIcon } from '@/components/icons'

/**
 * Accesos rápidos del dashboard de admin.
 *
 * Vive en su propio módulo porque no depende de ninguna query: así el
 * `loading.tsx` puede pintarlo REAL (navegable) mientras las métricas están en
 * vuelo, sin duplicar el listado.
 */
const QUICK_LINKS = [
  { href: '/admin/sectores', label: 'Sectores', description: 'Gestionar sectores industriales' },
  { href: '/admin/competencias', label: 'Habilidades/Tecnologías', description: 'Gestionar habilidades y tecnologías' },
  { href: '/admin/idiomas', label: 'Idiomas', description: 'Gestionar catálogo de idiomas' },
  { href: '/admin/ubicaciones', label: 'Ubicaciones', description: 'Gestionar provincias, departamentos y localidades' },
  { href: '/admin/postulantes', label: 'Postulantes', description: 'Moderar perfiles de postulantes' },
  { href: '/admin/empresas', label: 'Empresas', description: 'Ver empresas y reclutadores' },
  { href: '/admin/informes', label: 'Informes', description: 'Monitor de informes de personalidad' },
  { href: '/admin/preguntas', label: 'Preguntas eneagrama', description: 'Gestionar banco de preguntas del test' },
]

export function QuickLinksAdmin() {
  return (
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {QUICK_LINKS.map(link => (
        <Link
          key={link.href}
          href={link.href}
          className="group flex items-center justify-between rounded-xl border border-neutral-200 bg-surface px-5 py-4 shadow-card transition-colors hover:border-primary-200 hover:bg-primary-ghost-hover"
        >
          <div>
            <p className="text-[13.5px] font-semibold text-ink group-hover:text-primary-600">{link.label}</p>
            <p className="text-[12px] text-muted">{link.description}</p>
          </div>
          <ArrowRightIcon size={16} className="text-neutral-400 group-hover:text-primary-600" />
        </Link>
      ))}
    </div>
  )
}
