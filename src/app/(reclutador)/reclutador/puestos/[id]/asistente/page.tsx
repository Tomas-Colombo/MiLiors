import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TyCGate } from '@/components/shared/tyc-gate'
import { ChevronLeftIcon, SparklesIcon } from '@/components/icons'
import { getPuestoById, getPostulacionesRecibidas } from '@/modules/puestos/queries'
import { AsistenteFavoritos, type FavoritoItem } from './asistente-favoritos'

export const metadata = { title: 'Asistente IA del puesto — TalentID' }

// params in Next.js App Router dynamic routes is a Promise
type Params = Promise<{ id: string }>

export default async function PuestoAsistentePage({ params }: { params: Params }) {
  const { id } = await params

  // getPuestoById enforces ownership (recruiter must own the post) and returns
  // null for foreign or deleted posts.
  const puesto = await getPuestoById(id)
  if (!puesto) notFound()

  // Favorites are derived from the recruiter's received applications, keeping the
  // "favorito" source of truth identical to the Postulaciones view.
  const postulaciones = await getPostulacionesRecibidas()
  const favoritos: FavoritoItem[] = postulaciones
    .filter((p) => p.puesto_id === id && p.is_favorito)
    .map((p) => ({
      postulacionId: p.id,
      postulanteId: p.postulante_id,
      nombre: p.nombre_completo ?? 'Candidato',
      email: p.contacto.email,
      fechaPostulacion: p.fecha_postulacion,
    }))

  return (
    <TyCGate>
      <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
        {/* Back */}
        <Link
          href="/reclutador/puestos"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink transition-colors"
        >
          <ChevronLeftIcon size={16} />
          Volver a mis puestos
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary-tint text-primary-600">
            <SparklesIcon size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-ink">Asistente IA</h1>
            <p className="text-[13px] text-muted">
              Favoritos que se postularon a{' '}
              <span className="font-medium text-ink-soft">{puesto.titulo_puesto}</span>.
            </p>
          </div>
        </div>

        <AsistenteFavoritos puestoId={id} favoritos={favoritos} />
      </div>
    </TyCGate>
  )
}
