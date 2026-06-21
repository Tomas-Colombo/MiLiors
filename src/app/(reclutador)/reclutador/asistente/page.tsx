import { redirect } from 'next/navigation'
import { TyCGate } from '@/components/shared/tyc-gate'
import { Alert } from '@/components/ui'
import { SparklesIcon } from '@/components/icons'
import { getMisPuestos } from '@/modules/puestos/queries'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { AsistenteChat } from './asistente-chat'

export const metadata = { title: 'Asistente IA — TalentID' }

// searchParams is a Promise in Next.js App Router
type SearchParams = Promise<{ postulante?: string; puesto?: string }>

export default async function AsistentePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams

  // postulanteId is required to use the assistant.
  // The expected flow: candidate detail → "Consultar Asistente IA" link → this page.
  // We intentionally do NOT implement a full candidate search picker in MVP.
  if (!sp.postulante) {
    redirect('/reclutador/postulantes')
  }

  const postulanteId = sp.postulante

  // Load recruiter's positions for the selector
  const puestos = await getMisPuestos()
  const puestosOptions = puestos.map((p) => ({
    id: p.id,
    titulo_puesto: p.titulo_puesto,
  }))

  // Load candidate name for display (read-only, informational only)
  const session = await verifySession()
  const supabase = await createClient()

  const { data: postulante } = await supabase
    .from('perfil_postulante')
    .select('nombre_completo')
    .eq('id', postulanteId)
    .eq('perfil_en_busqueda', true)
    .maybeSingle()

  if (!postulante) {
    // Candidate not found or not in active search — redirect gracefully
    redirect('/reclutador/postulantes')
  }

  const nombrePostulante = (postulante as { nombre_completo: string }).nombre_completo

  // Suppress unused variable warning — session is needed for verifySession side-effects (redirect on unauth)
  void session

  return (
    <TyCGate>
      <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary-tint text-primary-600">
            <SparklesIcon size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-ink">Asistente IA</h1>
            <p className="text-[13px] text-muted">
              Consultá la compatibilidad candidato-puesto usando Eneagrama y Human Design.
            </p>
          </div>
        </div>

        {puestosOptions.length === 0 && (
          <Alert tone="warning" title="Sin puestos publicados">
            Publicá al menos un puesto para poder usar el asistente.
          </Alert>
        )}

        <AsistenteChat
          postulanteId={postulanteId}
          nombrePostulante={nombrePostulante}
          puestos={puestosOptions}
          puestoIdInicial={sp.puesto}
        />
      </div>
    </TyCGate>
  )
}
