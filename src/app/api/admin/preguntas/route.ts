import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { resetearTestsEnProgreso } from '@/modules/eneagrama/service'
import { autorizarAdmin } from '@/lib/api-auth'
import { schemaEnunciadoPregunta, schemaEneatipo } from '@/modules/admin/schema'

export async function POST(req: NextRequest) {
  // Verificar sesión y rol ADMIN
  const auth = await autorizarAdmin()
  if (!auth.ok) {
    if (auth.status === 401) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })
  }

  // Parsear body
  let body: { enunciado?: string; eneatipo_asociado?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 })
  }

  const parsedEnunciado = schemaEnunciadoPregunta.safeParse(body.enunciado?.toString() ?? '')
  if (!parsedEnunciado.success) {
    return NextResponse.json({ error: parsedEnunciado.error.issues[0].message }, { status: 422 })
  }
  const enunciado = parsedEnunciado.data

  const parsedEneatipo = schemaEneatipo.safeParse(Number(body.eneatipo_asociado))
  if (!parsedEneatipo.success) {
    return NextResponse.json({ error: 'Eneatipo debe ser entre 1 y 9.' }, { status: 422 })
  }
  const eneatipo_asociado = parsedEneatipo.data

  const admin = createAdminClient()

  // Calcular siguiente número de pregunta
  const { data: maxRow } = await admin.from('pregunta_eneagrama')
    .select('numero_pregunta')
    .order('numero_pregunta', { ascending: false })
    .limit(1)
    .maybeSingle()

  const numero_pregunta =
    ((maxRow as { numero_pregunta: number } | null)?.numero_pregunta ?? 0) + 1

  const { data, error } = await admin.from('pregunta_eneagrama').insert({
    enunciado,
    eneatipo_asociado,
    numero_pregunta,
    // Una pregunta creada a mano no tiene código del cuestionario original.
    codigo_original: null,
    fecha_baja: null,
    pausada: false,
  }).select('id').single()

  if (error) {
    console.error('[POST /api/admin/preguntas]', error)
    return NextResponse.json({ error: 'No se pudo crear la pregunta.' }, { status: 500 })
  }

  await resetearTestsEnProgreso()
  return NextResponse.json({ id: (data as { id: string }).id }, { status: 201 })
}
