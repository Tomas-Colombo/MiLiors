import { notFound } from 'next/navigation'
import { TyCGate } from '@/components/shared/tyc-gate'
import { VolverLink } from '@/components/shared/volver-link'
import { ChevronLeftIcon, SparklesIcon } from '@/components/icons'
import { getPuestoById, getPostulacionesRecibidas } from '@/modules/puestos/queries'
import { AsistenteCandidatos, type CandidatoItem } from './asistente-candidatos'
import { MARCA_POSTULACION } from '@/lib/constants/enums'

export const metadata = { title: 'Asistente IA del puesto — MiLiors' }

// params in Next.js App Router dynamic routes is a Promise
type Params = Promise<{ id: string }>

export default async function PuestoAsistentePage({ params }: { params: Params }) {
  const { id } = await params

  // getPuestoById enforces ownership (recruiter must own the post) and returns
  // null for foreign or deleted posts.
  const puesto = await getPuestoById(id)
  if (!puesto) notFound()

  // La lista sale de las postulaciones recibidas, con la misma marca que muestra
  // la vista de Postulaciones. "En duda" avanza igual que "Avanza": entra a la
  // consulta, sólo que señalada.
  const postulaciones = await getPostulacionesRecibidas()
  const candidatos: CandidatoItem[] = postulaciones
    .filter((p) => p.puesto_id === id && p.marca !== null)
    .map((p) => ({
      postulacionId: p.id,
      postulanteId: p.postulante_id,
      nombre: p.nombre_completo ?? 'Candidato',
      email: p.contacto.email,
      fechaPostulacion: p.fecha_postulacion,
      enDuda: p.marca === MARCA_POSTULACION.DUDA,
    }))

  return (
    <TyCGate>
      <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
        {/* Back */}
        <VolverLink
          href="/reclutador/puestos"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink transition-colors"
        >
          <ChevronLeftIcon size={16} />
          Volver a mis puestos
        </VolverLink>

        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary-tint text-primary-600">
            <SparklesIcon size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-ink">Asistente IA</h1>
            <p className="text-[13px] text-muted">
              Candidatos marcados para avanzar en{' '}
              <span className="font-medium text-ink-soft">{puesto.titulo_puesto}</span>.
            </p>
          </div>
        </div>

        <AsistenteCandidatos puestoId={id} candidatos={candidatos} />
      </div>
    </TyCGate>
  )
}
