import { Suspense } from 'react'
import { requireRol } from '@/lib/guards'
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
  NotebookIcon,
  GlobeIcon,
  FileTextIcon,
} from '@/components/icons'
import { AppSidebar } from '@/components/shared/app-sidebar'
import { FilterMemory } from '@/components/shared/filter-memory'
import { InactivityWatcher } from '@/components/admin/inactivity-watcher'
import { getSidebarColapsada } from '@/lib/sidebar-prefs-server'

// `primary`: los 4 destinos de la barra inferior en mobile; el resto va en "Más".
const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: <HomeIcon size={18} />, exactMatch: true, primary: true },
  { href: '/admin/sectores', label: 'Sectores', icon: <GridIcon size={18} /> },
  { href: '/admin/competencias', label: 'Hab./Tec.', icon: <BarChartIcon size={18} /> },
  { href: '/admin/idiomas', label: 'Idiomas', icon: <GlobeIcon size={18} /> },
  { href: '/admin/ubicaciones', label: 'Ubicaciones', icon: <MapPinIcon size={18} /> },
  { href: '/admin/carreras', label: 'Carreras', icon: <NotebookIcon size={18} /> },
  { href: '/admin/postulantes', label: 'Postulantes', icon: <UsersIcon size={18} />, primary: true },
  { href: '/admin/empresas', label: 'Empresas', icon: <BuildingIcon size={18} />, primary: true },
  { href: '/admin/informes', label: 'Informes', icon: <FileIcon size={18} />, primary: true },
  { href: '/admin/feedback', label: 'Feedback del informe', icon: <FileTextIcon size={18} /> },
  { href: '/admin/preguntas', label: 'Preguntas eneagrama', icon: <HelpCircleIcon size={18} /> },
  { href: '/admin/tyc', label: 'Términos y Condiciones', icon: <ShieldIcon size={18} /> },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRol('ADMIN')
  const sidebarColapsada = await getSidebarColapsada()

  return (
    <div className="flex min-h-screen bg-surface-page">
      <AppSidebar
        items={NAV_ITEMS}
        userEmail={session.email}
        rolLabel="Administrador"
        settingsHref="/admin/mi-perfil"
        defaultCollapsed={sidebarColapsada}
      />

      {/* En mobile el padding inferior deja pasar la barra de navegación fija. */}
      <main className="w-full min-w-0 flex-1 overflow-auto pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </main>

      <Suspense fallback={null}>
        <FilterMemory />
      </Suspense>

      <InactivityWatcher />
    </div>
  )
}
