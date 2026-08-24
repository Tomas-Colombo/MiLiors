import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rolDeUsuario } from '@/lib/rol'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { resetearTestsEnProgreso } from '@/modules/eneagrama/service'

export async function POST(req: NextRequest) {
  // Verificar sesión y rol ADMIN
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  if (rolDeUsuario(user) !== 'ADMIN')
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })

  // Parsear body
  let body: { enunciado?: string; eneatipo_asociado?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 })
  }

  const enunciado = body.enunciado?.toString().trim()
  const eneatipo_asociado = Number(body.eneatipo_asociado)

  if (!enunciado)
    return NextResponse.json({ error: 'El enunciado no puede estar vacío.' }, { status: 422 })
  if (isNaN(eneatipo_asociado) || eneatipo_asociado < 1 || eneatipo_asociado > 9)
    return NextResponse.json({ error: 'Eneatipo debe ser entre 1 y 9.' }, { status: 422 })

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
    codigo_original: '0',
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
