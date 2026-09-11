/** Violación de clave única de Postgres. */
const UNIQUE_VIOLATION = '23505'

export type ResultadoAltaPerfil = 'creado' | 'ya-existia' | 'fallo'

/**
 * Interpreta el resultado de insertar la fila de `usuario` durante el registro.
 *
 * Cuando un email ya registrado pero SIN confirmar vuelve a pasar por
 * `signUp()`, Supabase no crea otro usuario: devuelve el mismo (mismo id) y
 * reenvía el mail de confirmación. Su perfil ya existe, así que el insert choca
 * contra la clave primaria.
 *
 * Eso no es una falla: la cuenta está sana y solo le falta confirmar. Tratarlo
 * como error disparaba la limpieza del registro, que borraba del Auth una
 * cuenta que este request no había creado (y en cascada su perfil). Cada
 * reintento destruía la cuenta y dejaba muerto el link del mail ya enviado.
 */
export function resultadoAltaPerfil(error: { code?: string } | null): ResultadoAltaPerfil {
  if (!error) return 'creado'
  if (error.code === UNIQUE_VIOLATION) return 'ya-existia'
  return 'fallo'
}
