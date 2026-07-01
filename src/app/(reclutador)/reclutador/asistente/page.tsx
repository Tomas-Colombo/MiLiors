import { redirect } from 'next/navigation'
import { TyCGate } from '@/components/shared/tyc-gate'
import { Alert } from '@/components/ui'
import { SparklesIcon } from '@/components/icons'
import { getMisPuestos } from '@/modules/puestos/queries'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import { AsistenteChat } from './asistente-chat'

export const metadata = { title: 'Asistente IA — TalentID' }

// searchParams is a Promise in Next.js App Router
type SearchParams = Promise<{ postulante?: string; puesto?: string; postulacion?: string }>

export default async function AsistentePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams

  // postulanteId is required to use the assistant.
  // The expected flow: postulaciones list → "Asistente IA" link → this page.
  // We intentionally do NOT implement a full candidate search picker in MVP.
  if (!sp.postulante) {
    redirect('/reclutador/postulantes')
  }

  const postulanteId = sp.postulante
  const postulacionId = sp.postulacion ?? null

  // Load recruiter's positions for the selector
  const puestos = await getMisPuestos()
  const puestosOptions = puestos.map((p) => ({
    id: p.id,
    titulo_puesto: p.titulo_puesto,
  }))

  // Verify session (redirects to login if unauthenticated)
  const session = await verifySession()
  void session

  const supabase = await createClient()
  const admin = createAdminClient()

  // Verify the recruiter owns at least one job this candidate applied to.
  // Using admin client to bypass RLS — we do our own authorization check below.
  const { data: reclutador } = await supabase
    .from('perfil_reclutador')
    .select('id')
    .eq('usuario_id', session.id)
    .single()

  if (!reclutador) redirect('/reclutador/postulantes')

  const reclutadorId = (reclutador as { id: string }).id

  const { data: puestosRec } = await supabase
    .from('puesto')
    .select('id')
    .eq('reclutador_id', reclutadorId)

  const puestoIds = (puestosRec ?? []).map((r: unknown) => (r as { id: string }).id)

  // Check candidate actually applied to one of this recruiter's jobs
  const { data: postulacionCheck } = await admin
    .from('postulacion')
    .select('id')
    .eq('postulante_id', postulanteId)
    .in('puesto_id', puestoIds.length > 0 ? puestoIds : ['00000000-0000-0000-0000-000000000000'])
    .limit(1)
    .maybeSingle()

  if (!postulacionCheck) redirect('/reclutador/postulantes')

  // Load candidate name — admin bypasses RLS; candidate may have perfil_en_busqueda=false
  const { data: postulante } = await admin
    .from('perfil_postulante')
    .select('nombre_completo')
    .eq('id', postulanteId)
    .maybeSingle()

  if (!postulante) redirect('/reclutador/postulantes')

  const nombrePostulante = (postulante as { nombre_completo: string }).nombre_completo

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
          postulacionId={postulacionId}
        />
      </div>
    </TyCGate>
  )
}
