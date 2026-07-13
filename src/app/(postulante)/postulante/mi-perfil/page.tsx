import { verifySession, getTyCVigente } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui'
import { TyCLector } from '@/components/shared/tyc-lector'
import { PerfilPostulanteForm } from './form'
import { CambiarPasswordForm } from '@/components/shared/cambiar-password-form'
import { getProvincias, getLocalidadesPorProvincia } from '@/modules/ubicacion/queries'
import { getCarreras } from '@/modules/carreras/queries'

export const metadata = { title: 'Mi perfil — TalentID' }

async function getPerfilPostulante(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('perfil_postulante')
    .select('id, nombre_completo, telefono, carrera_id, carrera_otra, enlace_linkedin, portfolio, provincia_id, localidad_id')
    .eq('usuario_id', userId)
    .single()

  return data as {
    id: string
    nombre_completo: string
    telefono: string | null
    carrera_id: string | null
    carrera_otra: string | null
    enlace_linkedin: string | null
    portfolio: string | null
    provincia_id: string | null
    localidad_id: string | null
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
  const localidadesIniciales = perfil?.provincia_id
    ? await getLocalidadesPorProvincia(perfil.provincia_id)
    : []

  return (
    <div className="mx-auto max-w-xl px-6 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Mi perfil</h1>
        <p className="mt-1 text-sm text-muted">Actualizá tus datos básicos de contacto.</p>
      </div>

      <Card padding="lg">
        <PerfilPostulanteForm
          perfil={perfil}
          email={session.email}
          provincias={provincias}
          carreras={carreras}
          localidadesIniciales={localidadesIniciales}
        />
      </Card>

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
