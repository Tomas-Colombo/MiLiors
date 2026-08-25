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

export const universidadOptions = UNIVERSIDADES_ARGENTINA.map((u) => ({ value: u, label: u }))

export const idiomaOptions = IDIOMAS_COMUNES.map((i) => ({ value: i, label: i }))

export const nivelCompetenciaOptions: SegmentedOption<NivelCompetencia>[] = NIVEL_COMPETENCIA.map(
  (n) => ({ value: n, label: NIVEL_COMPETENCIA_LABEL[n] }),
)

/** El catálogo ofrece "Otra"/"Otro" para cargar un valor libre. */
export const OTRA_INSTITUCION = 'Otra'
export const OTRO_IDIOMA = 'Otro'

/** Una institución que no está en el catálogo se guardó como texto libre. */
export function esInstitucionLibre(institucion: string): boolean {
  return !universidadOptions.some((o) => o.value === institucion)
}
