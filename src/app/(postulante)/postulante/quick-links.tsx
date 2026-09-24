import Link from 'next/link'
import {
  UserIcon,
  GridIcon,
  FileIcon,
  ShieldIcon,
  SearchIcon,
  CheckCircleIcon,
  ArrowRightIcon,
} from '@/components/icons'

/**
 * Tarjeta de accesos rápidos de la home del postulante.
 *
 * Vive en su propio módulo porque no depende de ninguna query: así el
 * `loading.tsx` puede pintarla REAL (navegable) mientras se resuelven el perfil
 * y el resultado del eneagrama, sin duplicar el listado.
 */
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
    href: '/postulante/personalidad',
    icon: <GridIcon size={17} />,
    title: 'Perfil de personalidad',
    desc: 'Tu resultado del Eneagrama',
  },
]

export function QuickLinksPostulante() {
  return (
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
            <span className="flex-none" style={{ color: 'var(--color-accent-violet)' }}>
              {item.icon}
            </span>
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
  )
}
