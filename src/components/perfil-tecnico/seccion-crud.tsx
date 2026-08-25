'use client'

import { Fragment, type ReactNode } from 'react'
import { Button, ConfirmDialog } from '@/components/ui'
import { useSeccionCrud } from './use-seccion-crud'
import type { ActionResult } from '@/lib/types/domain'

export interface SeccionCrudProps<T> {
  items: T[]
  getId: (item: T) => string

  /** Qué se lee cuando todavía no hay nada cargado. */
  textoVacio: string
  /** Etiqueta del botón que abre el alta: "+ Agregar formación". */
  textoAgregar: string
  /** Título del diálogo de baja: "¿Eliminar esta formación?". */
  tituloEliminar: string

  eliminar: (id: string) => Promise<ActionResult>

  renderFila: (item: T, acciones: { onEditar?: () => void; onEliminar: () => void }) => ReactNode
  /** Sin esto no se ofrece editar: los idiomas se borran y se vuelven a cargar. */
  renderEdicion?: (
    item: T,
    acciones: { onSuccess: () => void; onCancel: () => void },
  ) => ReactNode
  renderAlta: (acciones: { onSuccess: () => void }) => ReactNode
}

/**
 * Sección de listado con alta, edición en línea y baja confirmada. Es la
 * estructura que compartían formación, cursos, experiencia e idiomas.
 *
 * Lo que cambia entre ellas es sólo qué se dibuja en cada fila y con qué
 * formulario, así que eso llega por render props en vez de por herencia de
 * componentes: no hay estado que compartir hacia abajo.
 */
export function SeccionCrud<T>({
  items,
  getId,
  textoVacio,
  textoAgregar,
  tituloEliminar,
  eliminar,
  renderFila,
  renderEdicion,
  renderAlta,
}: SeccionCrudProps<T>) {
  const crud = useSeccionCrud(eliminar)

  return (
    <>
      <ConfirmDialog
        open={crud.confirmId !== null}
        onClose={crud.cancelarConfirmacion}
        onConfirm={crud.confirmarEliminacion}
        tone="destructive"
        title={tituloEliminar}
        confirmLabel="Eliminar"
        loading={crud.isPending}
        error={crud.errorBaja}
      >
        Esta acción no se puede deshacer.
      </ConfirmDialog>

      <div className="space-y-3">
        {items.length === 0 && <p className="text-sm text-muted">{textoVacio}</p>}

        {/* El swap fila ↔ formulario desmonta el que sale: es lo que hace que
            el formulario de edición arranque limpio en cada fila. */}
        {items.map((item) => {
          const id = getId(item)
          const enEdicion = renderEdicion && crud.editando === id
          return (
            <Fragment key={id}>
              {enEdicion
                ? renderEdicion(item, {
                    onSuccess: crud.cancelarEdicion,
                    onCancel: crud.cancelarEdicion,
                  })
                : renderFila(item, {
                    onEditar: renderEdicion ? () => crud.editar(id) : undefined,
                    onEliminar: () => crud.pedirConfirmacion(id),
                  })}
            </Fragment>
          )
        })}

        {crud.mostrarForm ? (
          renderAlta({ onSuccess: crud.cerrarForm })
        ) : (
          <Button type="button" size="sm" variant="ghost" onClick={crud.abrirForm}>
            {textoAgregar}
          </Button>
        )}
      </div>
    </>
  )
}
