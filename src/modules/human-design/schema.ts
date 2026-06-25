import { z } from 'zod'
import { TIPO_ENERGETICO_HD, ENERGY_TYPE_CLASSIFICATION_HD, AUTORIDAD_HD, PERFIL_HD, ESTRATEGIA_HD } from '@/lib/constants/enums'

export const humanDesignSchema = z.object({
  tipo_energetico: z.enum(TIPO_ENERGETICO_HD as unknown as [string, ...string[]], {
    message: 'Seleccioná el tipo energético.',
  }),
  energy_type_classification: z.enum(ENERGY_TYPE_CLASSIFICATION_HD as unknown as [string, ...string[]], {
    message: 'Seleccioná la categoría de energía.',
  }),
  autoridad_hd: z.enum(AUTORIDAD_HD as unknown as [string, ...string[]], {
    message: 'Seleccioná la autoridad.',
  }),
  perfil_hd: z.enum(PERFIL_HD as unknown as [string, ...string[]], {
    message: 'Seleccioná el perfil.',
  }),
  estrategia_hd: z.enum(ESTRATEGIA_HD as unknown as [string, ...string[]], {
    message: 'Seleccioná la estrategia.',
  }),
})

export type HumanDesignInput = z.infer<typeof humanDesignSchema>
