import { verifySession } from '@/lib/dal'
import { requireEneagramaCompleto } from '@/lib/guards'
import { getPerfilTecnicoCompleto, getCompetenciasCatalogo } from '@/modules/perfil-tecnico/queries'
import { getCarreras } from '@/modules/carreras/queries'
import { PerfilTecnicoUI } from './perfil-tecnico-ui'

export const metadata = { title: 'Mi perfil técnico — MiLiors' }

export default async function PerfilPage() {
  await verifySession()
  await requireEneagramaCompleto()

  const [perfil, competenciasCatalogo, carreras] = await Promise.all([
    getPerfilTecnicoCompleto(),
    getCompetenciasCatalogo(),
    getCarreras(),
  ])

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Perfil Técnico</h1>
        <p className="mt-1 text-sm text-muted">Tu experiencia, formación, cursos, idiomas y habilidades y tecnologías.</p>
      </div>
      <PerfilTecnicoUI
        perfil={perfil}
        competenciasCatalogo={competenciasCatalogo}
        carreras={carreras}
      />
    </div>
  )
}
