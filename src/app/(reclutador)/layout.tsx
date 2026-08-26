import { Suspense } from 'react'
import { requireRol } from '@/lib/guards'
import { AppSidebar } from '@/components/shared/app-sidebar'
import { TyCGate } from '@/components/shared/tyc-gate'
import { FilterMemory } from '@/components/shared/filter-memory'
import {
  HomeIcon,
  BuildingIcon,
  GridIcon,
  FileIcon,
  SearchIcon,
  NotebookIcon,
} from '@/components/icons'

const NAV_RECLUTADOR = [
  { href: '/reclutador', label: 'Inicio', icon: <HomeIcon size={18} />, exactMatch: true },
  { href: '/reclutador/empresas', label: 'Mis empresas', icon: <BuildingIcon size={18} /> },
  { href: '/reclutador/puestos', label: 'Mis puestos', icon: <GridIcon size={18} /> },
  { href: '/reclutador/postulaciones', label: 'Postulaciones', icon: <FileIcon size={18} /> },
  { href: '/reclutador/postulantes', label: 'Buscar candidatos', icon: <SearchIcon size={18} /> },
  { href: '/reclutador/notas', label: 'Mis notas', icon: <NotebookIcon size={18} /> },
]

export default async function ReclutadorLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRol('RECLUTADOR')

  return (
    <div className="flex min-h-screen bg-surface-page">
      <AppSidebar
        items={NAV_RECLUTADOR}
        userEmail={session.email}
        rolLabel="Reclutador"
        settingsHref="/reclutador/mi-perfil"
      />
      <main className="flex-1 overflow-auto">
        {/* El gate vive en el layout y no en cada page: así los Términos son lo
            primero que ve la persona al entrar al área, antes del onboarding y
            antes del Eneagrama, sin depender de que cada pantalla nueva se
            acuerde de envolverse. */}
        <TyCGate>{children}</TyCGate>
      </main>
      <Suspense fallback={null}>
        <FilterMemory />
      </Suspense>
    </div>
  )
}
