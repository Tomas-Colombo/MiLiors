import { verifySession } from '@/lib/dal'
import { PageHeader } from '@/components/ui'
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
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader title="Perfil Técnico" description="Tu experiencia, formación, cursos, idiomas y habilidades y tecnologías." className="mb-6" />
      <PerfilTecnicoUI
        perfil={perfil}
        competenciasCatalogo={competenciasCatalogo}
        carreras={carreras}
      />
    </div>
  )
}
