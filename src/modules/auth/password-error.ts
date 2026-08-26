/**
 * Traduce el error de `supabase.auth.updateUser({ password })` a algo que la
 * persona pueda accionar.
 *
 * Supabase devuelve estos mensajes en inglés y sin código estable, así que no
 * queda otra que mirar el texto. Justamente por eso vive en un solo lugar: lo
 * consultan los dos caminos que escriben una contraseña —el restablecimiento
 * por mail y el cambio desde "mi perfil"— y si la comparación estuviera
 * duplicada, el día que Supabase cambie la redacción se arreglaría uno solo y
 * el otro volvería a mentir en silencio.
 */
export function mensajeErrorPassword(mensaje: string | undefined): string {
  // Lo devuelve Supabase cuando el proyecto tiene activada la política de no
  // reutilizar la contraseña vigente.
  if (mensaje?.toLowerCase().includes('different from the old password')) {
    return 'La contraseña nueva tiene que ser distinta de la anterior.'
  }

  return 'No se pudo guardar la contraseña. Intentá de nuevo.'
}
