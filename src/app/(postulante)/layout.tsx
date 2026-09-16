import { Suspense } from 'react'
import { requireRol } from '@/lib/guards'
import { createClient } from '@/lib/supabase/server'
import { AppSidebar } from '@/components/shared/app-sidebar'
import { TyCGate } from '@/components/shared/tyc-gate'
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

  if (!postulante) return { informeDesactualizado: false, certDesactualizado: false, onboardingPendiente: true }
  const pid = (postulante as { id: string }).id

  const [{ data: informe }, { data: cert }, { data: test }] = await Promise.all([
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
    supabase
      .from('test_eneagrama')
      .select('id, test_eneagrama_dominante(id)')
      .eq('postulante_id', pid)
      .single(),
  ])

  // Mismo criterio que requireEneagramaCompleto (guards.ts): sin al menos un
  // dominante, todas las secciones del sidebar redirigen al onboarding/eneagrama.
  const testTyped = test as { test_eneagrama_dominante: { id: string }[] } | null

  return {
    informeDesactualizado: informe ? !!(informe as { desactualizado: boolean }).desactualizado : false,
    certDesactualizado: cert ? !!(cert as { desactualizado: boolean }).desactualizado : false,
    onboardingPendiente: !testTyped || testTyped.test_eneagrama_dominante.length === 0,
  }
}

export default async function PostulanteLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRol('POSTULANTE')
  const { informeDesactualizado, certDesactualizado, onboardingPendiente } = await getDesactualizadoFlags(session.id)

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
        // Mientras falte el perfil básico o el Eneagrama, cada sección del
        // sidebar renderiza en el servidor solo para redirigir de vuelta (con
        // su loading de por medio). Se bloquean los ítems en el cliente.
        navBloqueado={onboardingPendiente ? 'Completá tu perfil y el Eneagrama para habilitar esta sección' : undefined}
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
