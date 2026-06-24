import { createAdminClient } from '@/lib/supabase/server-admin'

/**
 * Resetea todos los tests de eneagrama que están en progreso
 * (sin resultado aún, eneatipo_id IS NULL).
 *
 * Se llama cada vez que el conjunto de preguntas activas cambia:
 * al crear, eliminar, pausar o despausar preguntas. Así se garantiza
 * que ningún test parcial quede con respuestas inconsistentes respecto
 * al formulario vigente.
 *
 * El registro en test_eneagrama se conserva (no se elimina), pero sus
 * respuestas y puntajes se borran y los campos de resultado se limpian.
 * Cuando el postulante vuelva a iniciar el test, iniciarTest() lo
 * sobreescribe en el mismo registro.
 */
export async function resetearTestsEnProgreso(): Promise<void> {
  const admin = createAdminClient()

  // Obtener todos los tests sin resultado
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: testsEnProgreso } = await (admin.from('test_eneagrama') as any)
    .select('id')
    .is('eneatipo_id', null)

  if (!testsEnProgreso || testsEnProgreso.length === 0) return

  const ids = (testsEnProgreso as { id: string }[]).map(t => t.id)

  // Borrar respuestas y puntajes de todos los tests en progreso
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from('respuesta_item_eneagrama') as any)
    .delete()
    .in('test_eneagrama_id', ids)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from('resultado_puntaje_eneagrama') as any)
    .delete()
    .in('test_eneagrama_id', ids)

  // Limpiar campos de resultado en los registros (los conservamos para reusar)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from('test_eneagrama') as any)
    .update({
      ala: null,
      tiene_empate_dominante: false,
      dominantes_empate: null,
      tiene_empate_ala: false,
      fecha_realizacion: new Date().toISOString(),
    })
    .in('id', ids)
}
