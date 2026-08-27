'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import { ESTADO_POSTULACION } from '@/lib/constants/enums'
import type { ActionResult } from '@/lib/types/domain'
import type { EmpresaOption } from './queries'

const empresaSchema = z.object({
  nombre_empresa: z.string().min(2, { message: 'Ingresá el nombre de la empresa.' }).max(200).trim(),
  descripcion: z.string().max(1000).optional(),
  link_url: z.string().url({ message: 'Ingresá una URL válida.' }).optional().or(z.literal('')),
})

function parseEmpresa(formData: FormData) {
  return empresaSchema.safeParse({
    nombre_empresa: formData.get('nombre_empresa'),
    descripcion: formData.get('descripcion') || undefined,
    link_url: formData.get('link_url') || undefined,
  })
}

type Admin = ReturnType<typeof createAdminClient>

function adminClient(): Admin {
  return createAdminClient()
}

/**
 * perfil_reclutador del usuario actual. Lo crea si todavía no existe (el perfil
 * nace recién cuando el reclutador carga su primera empresa en el onboarding).
 */
async function getOrCreateReclutadorId(admin: Admin, usuarioId: string, email: string): Promise<string | null> {
  const { data: existente } = await admin
    .from('perfil_reclutador')
    .select('id')
    .eq('usuario_id', usuarioId)
    .maybeSingle()

  if (existente) return (existente as { id: string }).id

  const { data: creado, error } = await admin
    .from('perfil_reclutador')
    .insert({ usuario_id: usuarioId, nombre_reclutador: email })
    .select('id')
    .single()

  if (error || !creado) return null
  return (creado as { id: string }).id
}

/** Verifica que la empresa esté vinculada al reclutador actual. */
async function empresaDelReclutador(admin: Admin, reclutadorId: string, empresaId: string): Promise<boolean> {
  const { data } = await admin
    .from('reclutador_empresa')
    .select('id')
    .eq('reclutador_id', reclutadorId)
    .eq('empresa_id', empresaId)
    .maybeSingle()

  return !!data
}

/**
 * Crea la empresa y la vincula al reclutador actual.
 * La primera empresa además queda como "empresa principal" del perfil (la que se
 * muestra en el perfil público del reclutador).
 */
async function crear(formData: FormData): Promise<ActionResult<EmpresaOption>> {
  const session = await verifySession()
  const parsed = parseEmpresa(formData)

  if (!parsed.success) {
    return {
      success: false,
      error: 'Revisá los campos del formulario.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const admin = adminClient()
  const reclutadorId = await getOrCreateReclutadorId(admin, session.id, session.email)
  if (!reclutadorId) return { success: false, error: 'No se pudo preparar el perfil del reclutador.' }

  const empresaId = crypto.randomUUID()
  const { error: empresaError } = await admin.from('empresa').insert({
    id: empresaId,
    nombre_empresa: parsed.data.nombre_empresa,
    descripcion: parsed.data.descripcion ?? null,
    link_url: parsed.data.link_url || null,
  })

  if (empresaError) {
    console.error('[crearEmpresa] empresa insert error:', empresaError)
    return { success: false, error: 'No se pudo crear la empresa.' }
  }

  const { error: vinculoError } = await admin
    .from('reclutador_empresa')
    .insert({ reclutador_id: reclutadorId, empresa_id: empresaId })

  if (vinculoError) {
    console.error('[crearEmpresa] vínculo error:', vinculoError)
    return { success: false, error: 'No se pudo asociar la empresa al perfil.' }
  }

  const { data: perfil } = await admin
    .from('perfil_reclutador')
    .select('empresa_id')
    .eq('id', reclutadorId)
    .maybeSingle()

  if (perfil && !(perfil as { empresa_id: string | null }).empresa_id) {
    await admin.from('perfil_reclutador').update({ empresa_id: empresaId }).eq('id', reclutadorId)
  }

  // Se devuelve la empresa completa —y no sólo el id— para que quien la creó
  // desde otro formulario pueda agregarla a su select sin recargar la página.
  return {
    success: true,
    data: { id: empresaId, nombre_empresa: parsed.data.nombre_empresa, activa: true },
  }
}

/** Onboarding: primera empresa del reclutador. Al terminar va a sus puestos. */
export async function crearEmpresaYAsociar(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const resultado = await crear(formData)
  if (!resultado.success) return resultado

  revalidatePath('/reclutador')
  redirect('/reclutador/puestos')
}

/** Alta desde "Mis empresas" y desde el modal del formulario de puesto. */
export async function crearEmpresa(
  _prevState: ActionResult<EmpresaOption>,
  formData: FormData
): Promise<ActionResult<EmpresaOption>> {
  const resultado = await crear(formData)
  if (!resultado.success) return resultado

  revalidatePath('/reclutador/empresas')
  // El alta también se ofrece dentro del formulario de puesto: el select de
  // empresas de esa página tiene que ver la recién creada.
  revalidatePath('/reclutador/puestos/nuevo')
  return resultado
}

export async function actualizarEmpresa(
  empresaId: string,
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await verifySession()
  const parsed = parseEmpresa(formData)

  if (!parsed.success) {
    return {
      success: false,
      error: 'Revisá los campos del formulario.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const admin = adminClient()
  const { data: perfil } = await admin
    .from('perfil_reclutador')
    .select('id')
    .eq('usuario_id', session.id)
    .maybeSingle()

  if (!perfil) return { success: false, error: 'No autorizado.' }
  const reclutadorId = (perfil as { id: string }).id

  if (!(await empresaDelReclutador(admin, reclutadorId, empresaId))) {
    return { success: false, error: 'No autorizado.' }
  }

  const { error } = await admin
    .from('empresa')
    .update({
      nombre_empresa: parsed.data.nombre_empresa,
      descripcion: parsed.data.descripcion ?? null,
      link_url: parsed.data.link_url || null,
    })
    .eq('id', empresaId)

  if (error) return { success: false, error: 'No se pudo actualizar la empresa.' }

  revalidatePath('/reclutador/empresas')
  revalidatePath('/reclutador/puestos')
  return { success: true, data: undefined }
}

/**
 * Baja lógica de la empresa. Sus puestos activos se cierran en cascada (mismo
 * cierre que hace el reclutador a mano: se desactiva el puesto, se cierra el
 * ciclo abierto y las postulaciones en juego pasan a CERRADA).
 */
export async function darDeBajaEmpresa(empresaId: string): Promise<ActionResult> {
  const session = await verifySession()
  const admin = adminClient()

  const { data: perfil } = await admin
    .from('perfil_reclutador')
    .select('id, empresa_id')
    .eq('usuario_id', session.id)
    .maybeSingle()

  if (!perfil) return { success: false, error: 'No autorizado.' }
  const { id: reclutadorId, empresa_id: empresaPrincipal } = perfil as {
    id: string
    empresa_id: string | null
  }

  if (!(await empresaDelReclutador(admin, reclutadorId, empresaId))) {
    return { success: false, error: 'No autorizado.' }
  }

  const { error: bajaError } = await admin
    .from('empresa')
    .update({ fecha_baja: new Date().toISOString() })
    .eq('id', empresaId)

  if (bajaError) return { success: false, error: 'No se pudo dar de baja la empresa.' }

  // Cascada de cierre sobre los puestos abiertos de esa empresa.
  const { data: puestos } = await admin
    .from('puesto')
    .select('id')
    .eq('reclutador_id', reclutadorId)
    .eq('empresa_id', empresaId)
    .eq('activo', true)
    .is('fecha_baja_puesto', null)

  const puestoIds = ((puestos ?? []) as { id: string }[]).map((p) => p.id)

  if (puestoIds.length > 0) {
    await admin.from('puesto').update({ activo: false }).in('id', puestoIds)

    await admin
      .from('historial_puesto')
      .update({ fecha_fin: new Date().toISOString() })
      .in('puesto_id', puestoIds)
      .is('fecha_fin', null)

    await admin
      .from('postulacion')
      .update({ estado: ESTADO_POSTULACION.CERRADA })
      .in('puesto_id', puestoIds)
      .in('estado', [ESTADO_POSTULACION.ENVIADA, ESTADO_POSTULACION.VISTO])
  }

  // La empresa principal no puede quedar apuntando a una empresa de baja.
  if (empresaPrincipal === empresaId) {
    const { data: vinculos } = await admin
      .from('reclutador_empresa')
      .select('empresa(id, fecha_baja)')
      .eq('reclutador_id', reclutadorId)

    const reemplazo = ((vinculos ?? []) as unknown[])
      .map((v) => (v as { empresa: { id: string; fecha_baja: string | null } | null }).empresa)
      .find((e) => e && !e.fecha_baja && e.id !== empresaId)

    await admin
      .from('perfil_reclutador')
      .update({ empresa_id: reemplazo?.id ?? null })
      .eq('id', reclutadorId)
  }

  revalidatePath('/reclutador/empresas')
  revalidatePath('/reclutador/puestos')
  revalidatePath('/reclutador/postulaciones')
  return { success: true, data: undefined }
}
