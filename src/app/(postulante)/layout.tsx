import { Suspense } from 'react'
import { requireRol } from '@/lib/guards'
import { createClient } from '@/lib/supabase/server'
import { getPerfilPostulanteActual } from '@/modules/perfil/queries'
import { getTestEneagramaDePostulante } from '@/modules/eneagrama/queries'
import { getUltimoCertificadoDePostulante } from '@/modules/certificado/queries'
import { AppSidebar } from '@/components/shared/app-sidebar'
import { TyCGate } from '@/components/shared/tyc-gate'
import { FilterMemory } from '@/components/shared/filter-memory'
import { getSidebarColapsada } from '@/lib/sidebar-prefs-server'
import {
  HomeIcon,
  UserIcon,
  FileIcon,
  ShieldIcon,
  SearchIcon,
  GridIcon,
  CheckCircleIcon,
} from '@/components/icons'

// Perfil, test y certificado salen de las lecturas memoizadas que también usan
// requireEneagramaCompleto y las pages: en un mismo render se consultan una vez.
async function getDesactualizadoFlags() {
  const postulante = await getPerfilPostulanteActual()

  if (!postulante) return { informeDesactualizado: false, certDesactualizado: false, onboardingPendiente: true }
  const pid = postulante.id

  const supabase = await createClient()

  // El informe se lee aparte y solo con `desactualizado`: getInformeActual trae
  // contenido_json, que es pesado para pedirlo en cada navegación del área.
  const [{ data: informe }, cert, test] = await Promise.all([
    supabase
      .from('informe_personalidad')
      .select('desactualizado')
      .eq('postulante_id', pid)
      .single(),
    getUltimoCertificadoDePostulante(pid),
    getTestEneagramaDePostulante(pid),
  ])

  // Mismo criterio que requireEneagramaCompleto (guards.ts): sin al menos un
  // dominante, todas las secciones del sidebar redirigen al onboarding/eneagrama.
  return {
    informeDesactualizado: informe ? !!(informe as { desactualizado: boolean }).desactualizado : false,
    certDesactualizado: cert ? !!cert.desactualizado : false,
    onboardingPendiente: !test || test.test_eneagrama_dominante.length === 0,
  }
}

export default async function PostulanteLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRol('POSTULANTE')
  const sidebarColapsada = await getSidebarColapsada()
  const { informeDesactualizado, certDesactualizado, onboardingPendiente } = await getDesactualizadoFlags()

  const NAV_POSTULANTE = [
    // `primary`: los 4 destinos de la barra inferior en mobile; el resto va en "Más".
    { href: '/postulante', label: 'Inicio', icon: <HomeIcon size={18} />, exactMatch: true, primary: true },
    { href: '/postulante/perfil', label: 'Mi perfil técnico', shortLabel: 'Perfil', icon: <UserIcon size={18} />, primary: true },
    { href: '/postulante/personalidad', label: 'Perfil de personalidad', icon: <GridIcon size={18} /> },
    { href: '/postulante/informe', label: 'Informe de personalidad', icon: <FileIcon size={18} />, badge: informeDesactualizado },
    { href: '/postulante/certificado', label: 'Certificado', icon: <ShieldIcon size={18} />, badge: certDesactualizado },
    { href: '/postulante/puestos', label: 'Buscar puestos', shortLabel: 'Puestos', icon: <SearchIcon size={18} />, primary: true },
    { href: '/postulante/postulaciones', label: 'Mis postulaciones', shortLabel: 'Postulaciones', icon: <CheckCircleIcon size={18} />, primary: true },
  ]

  return (
    <div className="flex min-h-screen bg-surface-page">
      <AppSidebar
        items={NAV_POSTULANTE}
        userEmail={session.email}
        rolLabel="Postulante"
        settingsHref="/postulante/mi-perfil"
        defaultCollapsed={sidebarColapsada}
        // Mientras falte el perfil básico o el Eneagrama, cada sección del
        // sidebar renderiza en el servidor solo para redirigir de vuelta (con
        // su loading de por medio). Se bloquean los ítems en el cliente.
        navBloqueado={onboardingPendiente ? 'Completá tu perfil y el Eneagrama para habilitar esta sección' : undefined}
      />
      {/* En mobile el padding inferior deja pasar la barra de navegación fija. */}
      <main className="w-full min-w-0 flex-1 overflow-auto pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
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
