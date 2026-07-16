import { Suspense } from 'react'
import { verifySession } from '@/lib/dal'
import { AppSidebar } from '@/components/shared/app-sidebar'
import { FilterMemory } from '@/components/shared/filter-memory'
import {
  HomeIcon,
  BuildingIcon,
  FileIcon,
  SearchIcon,
  NotebookIcon,
} from '@/components/icons'

const NAV_RECLUTADOR = [
  { href: '/reclutador', label: 'Inicio', icon: <HomeIcon size={18} />, exactMatch: true },
  { href: '/reclutador/puestos', label: 'Mis puestos', icon: <BuildingIcon size={18} /> },
  { href: '/reclutador/postulaciones', label: 'Postulaciones', icon: <FileIcon size={18} /> },
  { href: '/reclutador/postulantes', label: 'Buscar candidatos', icon: <SearchIcon size={18} /> },
  { href: '/reclutador/notas', label: 'Mis notas', icon: <NotebookIcon size={18} /> },
]

export default async function ReclutadorLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession()

  return (
    <div className="flex min-h-screen bg-surface-page">
      <AppSidebar
        items={NAV_RECLUTADOR}
        userEmail={session.email}
        rolLabel="Reclutador"
        settingsHref="/reclutador/mi-perfil"
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
      <Suspense fallback={null}>
        <FilterMemory />
      </Suspense>
    </div>
  )
}
