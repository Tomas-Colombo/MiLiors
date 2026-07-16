import { Suspense } from 'react'
import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { AppSidebar } from '@/components/shared/app-sidebar'
import { FilterMemory } from '@/components/shared/filter-memory'
import {
  HomeIcon,
  UserIcon,
  FileIcon,
  ShieldIcon,
  SearchIcon,
  GridIcon,
  CheckCircleIcon,
} from '@/components/icons'

async function getDesactualizadoFlags(userId: string) {
  const supabase = await createClient()

  const { data: postulante } = await supabase
    .from('perfil_postulante')
    .select('id')
    .eq('usuario_id', userId)
    .single()

  if (!postulante) return { informeDesactualizado: false, certDesactualizado: false }
  const pid = (postulante as { id: string }).id

  const [{ data: informe }, { data: cert }] = await Promise.all([
    supabase
      .from('informe_personalidad')
      .select('desactualizado')
      .eq('postulante_id', pid)
      .single(),
    supabase
      .from('certificado_pdf')
      .select('desactualizado')
      .eq('postulante_id', pid)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
  ])

  return {
    informeDesactualizado: informe ? !!(informe as { desactualizado: boolean }).desactualizado : false,
    certDesactualizado: cert ? !!(cert as { desactualizado: boolean }).desactualizado : false,
  }
}

export default async function PostulanteLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession()
  const { informeDesactualizado, certDesactualizado } = await getDesactualizadoFlags(session.id)

  const NAV_POSTULANTE = [
    { href: '/postulante', label: 'Inicio', icon: <HomeIcon size={18} />, exactMatch: true },
    { href: '/postulante/perfil', label: 'Mi perfil técnico', icon: <UserIcon size={18} /> },
    { href: '/postulante/human-design', label: 'Perfil de personalidad', icon: <GridIcon size={18} /> },
    { href: '/postulante/informe', label: 'Informe de personalidad', icon: <FileIcon size={18} />, badge: informeDesactualizado },
    { href: '/postulante/certificado', label: 'Certificado', icon: <ShieldIcon size={18} />, badge: certDesactualizado },
    { href: '/postulante/puestos', label: 'Buscar puestos', icon: <SearchIcon size={18} /> },
    { href: '/postulante/postulaciones', label: 'Mis postulaciones', icon: <CheckCircleIcon size={18} /> },
  ]

  return (
    <div className="flex min-h-screen bg-surface-page">
      <AppSidebar
        items={NAV_POSTULANTE}
        userEmail={session.email}
        rolLabel="Postulante"
        settingsHref="/postulante/mi-perfil"
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
