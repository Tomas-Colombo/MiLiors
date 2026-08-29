import {
  NIVEL_IDIOMA_LABEL,
  UNIVERSIDADES_ARGENTINA,
  IDIOMAS_COMUNES,
  NIVEL_COMPETENCIA,
  NIVEL_COMPETENCIA_LABEL,
  type NivelCompetencia,
} from '@/lib/constants/enums'
import type { SegmentedOption } from '@/components/ui'

/** Opciones de los selects del perfil técnico. Se arman una vez, no por render. */

export const nivelIdiomaOptions = Object.entries(NIVEL_IDIOMA_LABEL).map(([value, label]) => ({
  value,
  label,
}))

/**
 * `alwaysVisible` en el escape: "Otra"/"Otro" no se filtran con la búsqueda.
 * Son las opciones que el usuario necesita justo cuando lo que tipeó no está en
 * la lista — que es exactamente cuando el filtro las escondía y el panel
 * quedaba en "Sin resultados", sin manera de cargar el valor libre.
 */
export const universidadOptions = UNIVERSIDADES_ARGENTINA.map((u) => ({
  value: u,
  label: u,
  alwaysVisible: u === 'Otra',
}))

export const idiomaOptions = IDIOMAS_COMUNES.map((i) => ({
  value: i,
  label: i,
  alwaysVisible: i === 'Otro',
}))

export const nivelCompetenciaOptions: SegmentedOption<NivelCompetencia>[] = NIVEL_COMPETENCIA.map(
  (n) => ({ value: n, label: NIVEL_COMPETENCIA_LABEL[n] }),
)

/** El catálogo ofrece "Otra"/"Otro" para cargar un valor libre. */
export const OTRA_INSTITUCION = 'Otra'
export const OTRO_IDIOMA = 'Otro'

/**
 * Escape del selector de título. Es un centinela y no el texto "Otro" porque el
 * valor del select ES el nombre de la carrera que se guarda: si el catálogo
 * llegara a tener una carrera llamada "Otro", el centinela evita la colisión.
 */
export const OTRO_TITULO = '__OTRO__'

/** Un título que no está en el catálogo de carreras se cargó como texto libre. */
export function esTituloLibre(titulo: string, carreras: { label: string }[]): boolean {
  return !carreras.some((c) => c.label === titulo)
}

/** Una institución que no está en el catálogo se guardó como texto libre. */
export function esInstitucionLibre(institucion: string): boolean {
  return !universidadOptions.some((o) => o.value === institucion)
}

/**
 * Mes actual en `YYYY-MM`, como tope de los campos de fecha del perfil: nada de
 * lo que se carga acá —graduarse, terminar un curso, empezar un trabajo— puede
 * pasar en el futuro. El picker no ofrece los meses posteriores; el rechazo de
 * verdad lo hace el schema del servidor.
 *
 * Es función y no constante de módulo a propósito: el proceso del server
 * cachea los módulos, así que un valor calculado al importar quedaría clavado
 * en el mes en que arrancó el proceso.
 */
export function mesActual(): string {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
}
