import type { Database } from './database.types'

// Re-exports de enums de la DB
export type RolUsuario = Database['public']['Enums']['rol_usuario']
export type EstadoInforme = Database['public']['Enums']['estado_informe']
export type EstadoPostulacion = Database['public']['Enums']['estado_postulacion']
export type CargaHoraria = Database['public']['Enums']['carga_horaria']
export type Ubicacion = Database['public']['Enums']['ubicacion']
export type NivelIdioma = Database['public']['Enums']['nivel_idioma']
export type TipoEnergeticoHD = Database['public']['Enums']['tipo_energetico_hd']
export type PerfilHD = Database['public']['Enums']['perfil_hd']
export type AutoridadHD = Database['public']['Enums']['autoridad_hd']
export type EstrategiaHD = Database['public']['Enums']['estrategia_hd']

// Session payload (lo que vive en el token/cookie de Supabase Auth)
export type SessionUser = {
  id: string
  email: string
  rol: RolUsuario
}

// Resultado de Server Action
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }
