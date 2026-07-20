'use client'

import { usePathname } from 'next/navigation'
import { NavItem } from '@/components/ui'
import {
  HomeIcon,
  BuildingIcon,
  UsersIcon,
  GridIcon,
  BarChartIcon,
  FileIcon,
  HelpCircleIcon,
  ShieldIcon,
  MapPinIcon,
} from '@/components/icons'

const NAV_LINKS = [
  { href: '/admin', label: 'Dashboard', icon: <HomeIcon size={18} /> },
  { href: '/admin/sectores', label: 'Sectores', icon: <GridIcon size={18} /> },
  { href: '/admin/competencias', label: 'Habilidades / Tecnologías', icon: <BarChartIcon size={18} /> },
  { href: '/admin/ubicaciones', label: 'Ubicaciones', icon: <MapPinIcon size={18} /> },
  { href: '/admin/postulantes', label: 'Postulantes', icon: <UsersIcon size={18} /> },
  { href: '/admin/empresas', label: 'Empresas', icon: <BuildingIcon size={18} /> },
  { href: '/admin/informes', label: 'Informes', icon: <FileIcon size={18} /> },
  { href: '/admin/preguntas', label: 'Preguntas eneagrama', icon: <HelpCircleIcon size={18} /> },
  { href: '/admin/tyc', label: 'Términos y Condiciones', icon: <ShieldIcon size={18} /> },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-0.5">
      {NAV_LINKS.map(link => {
        // Active: exact match for /admin, prefix match for sub-routes
        const active =
          link.href === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(link.href)
        return (
          <NavItem
            key={link.href}
            href={link.href}
            icon={link.icon}
            label={link.label}
            active={active}
          />
        )
      })}
    </nav>
  )
}
