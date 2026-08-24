import { createAdminClient } from '@/lib/supabase/server-admin'

/**
 * Resetea todos los tests de eneagrama que están en progreso
 * (sin dominantes calculados aún, es decir sin filas en test_eneagrama_dominante).
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
 *
 * Los tests que YA tienen un resultado válido (con dominantes calculados)
 * no se tocan: cambiar el set de preguntas no debe borrar resultados que
 * ya fueron entregados al postulante.
 */
export async function resetearTestsEnProgreso(): Promise<void> {
  const admin = createAdminClient()

  // Obtener todos los tests que todavía no tienen dominantes calculados
  const { data: testsEnProgreso } = await admin.from('test_eneagrama')
    .select('id, test_eneagrama_dominante(id)')

  if (!testsEnProgreso || testsEnProgreso.length === 0) return

  const ids = (testsEnProgreso as { id: string; test_eneagrama_dominante: { id: string }[] }[])
    .filter(t => t.test_eneagrama_dominante.length === 0)
    .map(t => t.id)

  if (ids.length === 0) return

  // Borrar respuestas y puntajes de todos los tests en progreso
  await admin.from('respuesta_item_eneagrama')
    .delete()
    .in('test_eneagrama_id', ids)

  await admin.from('resultado_puntaje_eneagrama')
    .delete()
    .in('test_eneagrama_id', ids)

  // Limpiar campos de resultado en los registros (los conservamos para reusar)
  await admin.from('test_eneagrama')
    .update({
      ala: null,
      tiene_empate_dominante: false,
      dominantes_empate: null,
      tiene_empate_ala: false,
      fecha_realizacion: new Date().toISOString(),
    })
    .in('id', ids)
}
