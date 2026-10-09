import { verifySession, getTyCVigente } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, Card } from '@/components/ui'
import { TyCLector } from '@/components/shared/tyc-lector'
import { PerfilPostulanteForm } from './form'
import { PrivacidadPersonalidad } from './privacidad'
import { CambiarPasswordForm } from '@/components/shared/cambiar-password-form'
import { getProvincias, getUbicacionInicial } from '@/modules/ubicacion/queries'
import { getCarreras } from '@/modules/carreras/queries'

export const metadata = { title: 'Mi perfil — MiLiors' }

async function getPerfilPostulante(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('perfil_postulante')
    .select(
      'id, nombre_completo, nombre_preferido, fecha_nacimiento, telefono, carrera_id, carrera_otra, enlace_linkedin, portfolio, localidad_id, provincia_id, mostrar_personalidad_publico'
    )
    .eq('usuario_id', userId)
    .single()

  return data as {
    id: string
    nombre_completo: string
    nombre_preferido: string | null
    fecha_nacimiento: string | null
    telefono: string | null
    carrera_id: string | null
    carrera_otra: string | null
    enlace_linkedin: string | null
    portfolio: string | null
    localidad_id: string | null
    provincia_id: string | null
    mostrar_personalidad_publico: boolean
  } | null
}

export default async function MiPerfilPostulantePage() {
  const session = await verifySession()
  const [perfil, tyc, provincias, carreras] = await Promise.all([
    getPerfilPostulante(session.id),
    getTyCVigente(),
    getProvincias(),
    getCarreras(),
  ])
  const ubicacionInicial = await getUbicacionInicial(perfil?.localidad_id, perfil?.provincia_id)

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10 space-y-8">
      <PageHeader title="Mi perfil" description="Actualizá tus datos básicos de contacto." />

      <Card padding="lg">
        <PerfilPostulanteForm
          perfil={perfil}
          email={session.email}
          provincias={provincias}
          carreras={carreras}
          ubicacionInicial={ubicacionInicial}
        />
      </Card>

      <div>
        <h2 className="text-lg font-bold tracking-tight text-ink mb-1">Privacidad</h2>
        <p className="text-sm text-muted mb-4">Qué se ve de vos cuando alguien verifica tu certificado.</p>
        <Card padding="lg">
          <PrivacidadPersonalidad inicial={perfil?.mostrar_personalidad_publico ?? true} />
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-bold tracking-tight text-ink mb-1">Seguridad</h2>
        <p className="text-sm text-muted mb-4">Cambiá tu contraseña de acceso.</p>
        <Card padding="lg">
          <CambiarPasswordForm />
        </Card>
      </div>

      {tyc && (
        <div>
          <h2 className="text-lg font-bold tracking-tight text-ink mb-4">Legal</h2>
          <TyCLector tyc={tyc} />
        </div>
      )}
    </div>
  )
}
