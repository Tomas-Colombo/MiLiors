'use client'

/**
 * Reexportación del hook compartido `useFormAccion` desde `@/components/shared/use-form-accion`.
 * Mantiene la compatibilidad con consumidores locales como `perfil-tecnico-ui.tsx`
 * hasta su migración en el bloque respectivo.
 */
export { useFormAccion, type AccionFormulario } from '@/components/shared/use-form-accion'
