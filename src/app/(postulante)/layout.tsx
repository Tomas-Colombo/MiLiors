import { verifySession } from '@/lib/dal'
import { AppSidebar } from '@/components/shared/app-sidebar'
import {
  HomeIcon,
  UserIcon,
  FileIcon,
  ShieldIcon,
  SearchIcon,
  GridIcon,
  CheckCircleIcon,
} from '@/components/icons'

const NAV_POSTULANTE = [
  { href: '/postulante', label: 'Inicio', icon: <HomeIcon size={18} />, exactMatch: true },
  { href: '/postulante/perfil', label: 'Mi perfil técnico', icon: <UserIcon size={18} /> },
  { href: '/postulante/human-design', label: 'Perfil de personalidad', icon: <GridIcon size={18} /> },
  { href: '/postulante/informe', label: 'Informe de personalidad', icon: <FileIcon size={18} /> },
  { href: '/postulante/certificado', label: 'Certificado', icon: <ShieldIcon size={18} /> },
  { href: '/postulante/puestos', label: 'Buscar puestos', icon: <SearchIcon size={18} /> },
  { href: '/postulante/postulaciones', label: 'Mis postulaciones', icon: <CheckCircleIcon size={18} /> },
]

export default async function PostulanteLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession()

  return (
    <div className="flex min-h-screen bg-surface-page">
      <AppSidebar
        items={NAV_POSTULANTE}
        userEmail={session.email}
        rolLabel="Postulante"
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
