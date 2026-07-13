import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/dal'
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
} from '@/components/icons'
import { AppSidebar } from '@/components/shared/app-sidebar'

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: <HomeIcon size={18} />, exactMatch: true },
  { href: '/admin/sectores', label: 'Sectores', icon: <GridIcon size={18} /> },
  { href: '/admin/competencias', label: 'Competencias', icon: <BarChartIcon size={18} /> },
  { href: '/admin/ubicaciones', label: 'Ubicaciones', icon: <MapPinIcon size={18} /> },
  { href: '/admin/carreras', label: 'Carreras', icon: <NotebookIcon size={18} /> },
  { href: '/admin/postulantes', label: 'Postulantes', icon: <UsersIcon size={18} /> },
  { href: '/admin/empresas', label: 'Empresas', icon: <BuildingIcon size={18} /> },
  { href: '/admin/informes', label: 'Informes', icon: <FileIcon size={18} /> },
  { href: '/admin/preguntas', label: 'Preguntas eneagrama', icon: <HelpCircleIcon size={18} /> },
  { href: '/admin/tyc', label: 'Términos y Condiciones', icon: <ShieldIcon size={18} /> },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession()

  if (session.rol !== 'ADMIN') {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen bg-surface-page">
      <AppSidebar
        items={NAV_ITEMS}
        userEmail={session.email}
        rolLabel="Administrador"
        settingsHref="/admin/mi-perfil"
      />

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
