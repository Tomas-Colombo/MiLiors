'use client'

import { useRef, useState, useTransition } from 'react'
import { guardarCompetenciasConCustom } from '@/modules/perfil-tecnico/actions'
import type { CompetenciaItem } from '@/modules/perfil-tecnico/queries'
import type { NivelCompetencia } from '@/lib/constants/enums'
import { coincideBusqueda, mismoTexto } from '@/lib/texto'

export const MAX_COMPETENCIAS = 15

/**
 * Una competencia dentro de la selección en curso.
 *
 * Las del catálogo traen su UUID real. Las que escribe el postulante viven con
 * una clave temporal `custom:<nombre>` hasta que se guardan: recién ahí el
 * server devuelve los UUID definitivos y se reemplaza el array entero.
 */
export type SeleccionItem = {
  id: string
  nombre: string
  nivel: NivelCompetencia
  isCustom?: boolean
}

/**
 * Estado del editor de habilidades y tecnologías.
 *
 * A diferencia del resto del perfil técnico, acá no se guarda fila por fila: se
 * arma una selección completa en el cliente y se envía de una. Por eso tiene
 * estado propio en vez de apoyarse en `useSeccionCrud`.
 */
export function useSeleccionCompetencias(catalogo: CompetenciaItem[], actuales: CompetenciaItem[]) {
  const [seleccionadas, setSeleccionadas] = useState<SeleccionItem[]>(() =>
    actuales.map((c) => ({ id: c.id, nombre: c.nombre, nivel: c.nivel ?? 'BASICO' })),
  )
  const [query, setQuery] = useState('')
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const total = seleccionadas.length
  const lleno = total >= MAX_COMPETENCIAS
  const queryTrimmed = query.trim()

  /** Del catálogo, lo que coincide con la búsqueda y todavía no está elegido. */
  const filtradas = catalogo.filter((c) => {
    if (seleccionadas.some((s) => s.id === c.id)) return false
    if (!queryTrimmed) return true
    return coincideBusqueda(c.nombre, queryTrimmed)
  })

  const coincidenciaExacta = queryTrimmed
    ? catalogo.some((c) => mismoTexto(c.nombre, queryTrimmed))
    : false

  /** Sólo se ofrece crear una propia si no existe ya, en el catálogo o elegida. */
  const canAddCustom =
    queryTrimmed.length >= 2 &&
    !coincidenciaExacta &&
    !seleccionadas.some((s) => mismoTexto(s.nombre, queryTrimmed))

  function addItem(item: Omit<SeleccionItem, 'nivel'>) {
    if (lleno) return
    // Todo item nuevo arranca en BASICO; el postulante lo ajusta en la lista de abajo.
    setSeleccionadas((prev) => [...prev, { ...item, nivel: 'BASICO' }])
    setQuery('')
    setFeedback(null)
    // El foco vuelve al buscador para poder encadenar varias sin usar el mouse.
    inputRef.current?.focus()
  }

  function addFromCatalog(c: CompetenciaItem) {
    addItem({ id: c.id, nombre: c.nombre })
  }

  function addCustom() {
    if (!canAddCustom) return
    addItem({ id: `custom:${queryTrimmed}`, nombre: queryTrimmed, isCustom: true })
  }

  function removeItem(id: string) {
    setSeleccionadas((prev) => prev.filter((s) => s.id !== id))
    setFeedback(null)
  }

  function setNivel(id: string, nivel: NivelCompetencia) {
    setSeleccionadas((prev) => prev.map((s) => (s.id === id ? { ...s, nivel } : s)))
    setFeedback(null)
  }

  function clearAll() {
    setSeleccionadas([])
    setFeedback(null)
  }

  function cambiarQuery(valor: string) {
    setQuery(valor)
    setFeedback(null)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    // Con una sola coincidencia, Enter la elige; si no hay ninguna, la crea.
    if (filtradas.length === 1 && !canAddCustom) addFromCatalog(filtradas[0])
    else if (canAddCustom) addCustom()
  }

  function guardar() {
    const existentes = seleccionadas
      .filter((s) => !s.isCustom)
      .map((s) => ({ id: s.id, nivel: s.nivel }))
    const customs = seleccionadas
      .filter((s) => s.isCustom)
      .map((s) => ({ nombre: s.nombre, nivel: s.nivel }))

    setFeedback(null)
    startTransition(async () => {
      const result = await guardarCompetenciasConCustom(existentes, customs)
      if (result.success) {
        // Reconciliación: las claves `custom:` se reemplazan por los UUID que
        // acaba de crear el server. Sin esto, volver a guardar sin recargar
        // mandaría de nuevo las mismas competencias como si fueran nuevas.
        if (result.items && result.items.length > 0) {
          setSeleccionadas(
            result.items.map((i) => ({ id: i.id, nombre: i.nombre, nivel: i.nivel })),
          )
        }
        setFeedback({ ok: true, msg: 'Competencias guardadas.' })
      } else {
        setFeedback({ ok: false, msg: result.error ?? 'Error al guardar.' })
      }
    })
  }

  return {
    seleccionadas,
    total,
    lleno,
    max: MAX_COMPETENCIAS,

    query,
    queryTrimmed,
    cambiarQuery,
    handleKeyDown,
    inputRef,

    catalogo,
    filtradas,
    canAddCustom,

    addFromCatalog,
    addCustom,
    removeItem,
    setNivel,
    clearAll,

    guardar,
    isPending,
    feedback,
  }
}

export type SeleccionCompetencias = ReturnType<typeof useSeleccionCompetencias>
