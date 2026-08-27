/**
 * Etiqueta de ubicación a partir de la cadena provincia → departamento →
 * localidad. Ni los puestos ni los perfiles exigen bajar hasta la localidad, así
 * que el nivel más profundo que se haya cargado es el dato más preciso.
 */
export function ubicacionLabel(fuente: {
  nombre_localidad?: string | null
  nombre_departamento?: string | null
  nombre_provincia?: string | null
}): string {
  return [fuente.nombre_localidad || fuente.nombre_departamento, fuente.nombre_provincia]
    .filter(Boolean)
    .join(', ')
}
