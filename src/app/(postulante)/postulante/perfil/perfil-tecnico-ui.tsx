'use client'

import { useState } from 'react'
import { Tabs } from '@/components/ui'
import { NIVEL_IDIOMA_LABEL } from '@/lib/constants/enums'
import { FilaPerfil } from '@/components/perfil-tecnico/fila-perfil'
import { formatMesAnio } from '@/components/perfil-tecnico/formato-fecha'
import { useFormAccion } from '@/components/perfil-tecnico/use-form-accion'
import { PanelAlta, PanelEdicion } from '@/components/perfil-tecnico/panel-formulario'
import { SeccionCrud } from '@/components/perfil-tecnico/seccion-crud'
import { SeccionCompetencias } from '@/components/perfil-tecnico/seccion-competencias'
import { FormacionCampos } from '@/components/perfil-tecnico/formacion-campos'
import { CursoCampos } from '@/components/perfil-tecnico/curso-campos'
import { ExperienciaCampos } from '@/components/perfil-tecnico/experiencia-campos'
import { IdiomaCampos } from '@/components/perfil-tecnico/idioma-campos'
import {
  agregarFormacion,
  editarFormacion,
  eliminarFormacion,
  agregarCurso,
  editarCurso,
  eliminarCurso,
  agregarExperiencia,
  editarExperiencia,
  eliminarExperiencia,
  agregarIdioma,
  eliminarIdioma,
} from '@/modules/perfil-tecnico/actions'
import type { PerfilTecnicoCompleto, CompetenciaItem, FormacionItem, CursoItem, ExperienciaItem, IdiomaItem } from '@/modules/perfil-tecnico/queries'
import type { CarreraOption } from '@/modules/carreras/queries'

// ─── FORMACIÓN ────────────────────────────────────────────────────────────────

function FormacionForm({
  onSuccess,
  carreras,
}: {
  onSuccess: () => void
  carreras: CarreraOption[]
}) {
  const [state, action, pending] = useFormAccion(agregarFormacion, onSuccess)

  return (
    <PanelAlta titulo="Agregar formación" action={action} state={state} pending={pending}>
      <FormacionCampos state={state} carreras={carreras} />
    </PanelAlta>
  )
}

function FormacionEditForm({
  item,
  onSuccess,
  onCancel,
  carreras,
}: {
  item: FormacionItem
  onSuccess: () => void
  onCancel: () => void
  carreras: CarreraOption[]
}) {
  const [state, action, pending] = useFormAccion(editarFormacion.bind(null, item.id), onSuccess)

  return (
    <PanelEdicion action={action} state={state} pending={pending} onCancel={onCancel}>
      <FormacionCampos item={item} state={state} carreras={carreras} />
    </PanelEdicion>
  )
}

function SeccionFormacion({
  formaciones,
  carreras,
}: {
  formaciones: FormacionItem[]
  carreras: CarreraOption[]
}) {
  return (
    <SeccionCrud
      items={formaciones}
      getId={(f) => f.id}
      textoVacio="Todavía no cargaste formación académica."
      textoAgregar="+ Agregar formación"
      tituloEliminar="¿Eliminar esta formación?"
      eliminar={eliminarFormacion}
      renderFila={(f, acciones) => (
        <FilaPerfil
          titulo={f.titulo}
          subtitulo={f.institucion}
          meta={formatMesAnio(f.fecha_graduacion)}
          {...acciones}
        />
      )}
      renderEdicion={(f, acciones) => (
        <FormacionEditForm item={f} carreras={carreras} {...acciones} />
      )}
      renderAlta={(acciones) => <FormacionForm carreras={carreras} {...acciones} />}
    />
  )
}

// ─── CURSOS ───────────────────────────────────────────────────────────────────

function CursoForm({ onSuccess }: { onSuccess: () => void }) {
  const [state, action, pending] = useFormAccion(agregarCurso, onSuccess)

  return (
    <PanelAlta titulo="Agregar curso" action={action} state={state} pending={pending}>
      <CursoCampos state={state} />
    </PanelAlta>
  )
}

function CursoEditForm({
  item,
  onSuccess,
  onCancel,
}: {
  item: CursoItem
  onSuccess: () => void
  onCancel: () => void
}) {
  const [state, action, pending] = useFormAccion(editarCurso.bind(null, item.id), onSuccess)

  return (
    <PanelEdicion action={action} state={state} pending={pending} onCancel={onCancel}>
      <CursoCampos item={item} state={state} />
    </PanelEdicion>
  )
}

function SeccionCursos({ cursos }: { cursos: CursoItem[] }) {
  return (
    <SeccionCrud
      items={cursos}
      getId={(c) => c.id}
      textoVacio="Todavía no cargaste cursos."
      textoAgregar="+ Agregar curso"
      tituloEliminar="¿Eliminar este curso?"
      eliminar={eliminarCurso}
      renderFila={(c, acciones) => (
        <FilaPerfil
          titulo={c.nombre}
          subtitulo={c.institucion}
          meta={[formatMesAnio(c.fecha_fin), c.duracion_horas ? `${c.duracion_horas} h` : null]
            .filter(Boolean)
            .join(' · ')}
          {...acciones}
        >
          {c.url_credencial && (
            <a
              href={c.url_credencial}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-[12px] font-medium text-primary-600 hover:underline"
            >
              Ver credencial
            </a>
          )}
        </FilaPerfil>
      )}
      renderEdicion={(c, acciones) => <CursoEditForm item={c} {...acciones} />}
      renderAlta={(acciones) => <CursoForm {...acciones} />}
    />
  )
}

// ─── EXPERIENCIA ──────────────────────────────────────────────────────────────

function ExperienciaForm({ onSuccess }: { onSuccess: () => void }) {
  const [state, action, pending] = useFormAccion(agregarExperiencia, onSuccess)

  return (
    <PanelAlta titulo="Agregar experiencia" action={action} state={state} pending={pending}>
      <ExperienciaCampos state={state} />
    </PanelAlta>
  )
}

function ExperienciaEditForm({
  item,
  onSuccess,
  onCancel,
}: {
  item: ExperienciaItem
  onSuccess: () => void
  onCancel: () => void
}) {
  const [state, action, pending] = useFormAccion(editarExperiencia.bind(null, item.id), onSuccess)

  return (
    <PanelEdicion action={action} state={state} pending={pending} onCancel={onCancel}>
      <ExperienciaCampos item={item} state={state} />
    </PanelEdicion>
  )
}

function SeccionExperiencia({ experiencias }: { experiencias: ExperienciaItem[] }) {
  return (
    <SeccionCrud
      items={experiencias}
      getId={(e) => e.id}
      textoVacio="Todavía no cargaste experiencia laboral."
      textoAgregar="+ Agregar experiencia"
      tituloEliminar="¿Eliminar esta experiencia?"
      eliminar={eliminarExperiencia}
      renderFila={(e, acciones) => (
        <FilaPerfil
          titulo={e.puesto}
          subtitulo={e.empresa}
          meta={`${formatMesAnio(e.fecha_inicio)} – ${formatMesAnio(e.fecha_fin) ?? 'Actualidad'}`}
          {...acciones}
        >
          {e.descripcion && (
            <p className="mt-1 line-clamp-2 text-[12px] text-neutral-500">{e.descripcion}</p>
          )}
        </FilaPerfil>
      )}
      renderEdicion={(e, acciones) => <ExperienciaEditForm item={e} {...acciones} />}
      renderAlta={(acciones) => <ExperienciaForm {...acciones} />}
    />
  )
}

// ─── IDIOMAS ──────────────────────────────────────────────────────────────────

function IdiomaForm({ onSuccess }: { onSuccess: () => void }) {
  const [state, action, pending] = useFormAccion(agregarIdioma, onSuccess)

  return (
    <PanelAlta titulo="Agregar idioma" action={action} state={state} pending={pending}>
      <IdiomaCampos state={state} />
    </PanelAlta>
  )
}

function SeccionIdiomas({ idiomas }: { idiomas: IdiomaItem[] }) {
  return (
    <SeccionCrud
      items={idiomas}
      getId={(i) => i.id}
      textoVacio="Todavía no cargaste idiomas."
      textoAgregar="+ Agregar idioma"
      tituloEliminar="¿Eliminar este idioma?"
      eliminar={eliminarIdioma}
      renderFila={(i, acciones) => (
        <FilaPerfil
          align="center"
          titulo={i.nombre}
          subtitulo={NIVEL_IDIOMA_LABEL[i.nivel_idioma] ?? i.nivel_idioma}
          {...acciones}
        />
      )}
      renderAlta={(acciones) => <IdiomaForm {...acciones} />}
    />
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const TAB_ITEMS = [
  { id: 'formacion', label: 'Formación' },
  { id: 'cursos', label: 'Cursos' },
  { id: 'experiencia', label: 'Experiencia' },
  { id: 'idiomas', label: 'Idiomas' },
  { id: 'competencias', label: 'Habilidades y tecnologías' },
]

export function PerfilTecnicoUI({
  perfil,
  competenciasCatalogo,
  carreras,
}: {
  perfil: PerfilTecnicoCompleto | null
  competenciasCatalogo: CompetenciaItem[]
  carreras: CarreraOption[]
}) {
  const [tab, setTab] = useState('formacion')

  const formaciones = perfil?.formaciones ?? []
  const cursos = perfil?.cursos ?? []
  const experiencias = perfil?.experiencias ?? []
  const idiomas = perfil?.idiomas ?? []
  const competenciasActuales = perfil?.competencias ?? []

  return (
    <div>
      <Tabs items={TAB_ITEMS} value={tab} onChange={setTab} className="mb-6" />

      {tab === 'formacion' && (
        <SeccionFormacion formaciones={formaciones} carreras={carreras} />
      )}
      {tab === 'cursos' && <SeccionCursos cursos={cursos} />}
      {tab === 'experiencia' && <SeccionExperiencia experiencias={experiencias} />}
      {tab === 'idiomas' && <SeccionIdiomas idiomas={idiomas} />}
      {tab === 'competencias' && (
        <SeccionCompetencias catalogo={competenciasCatalogo} actuales={competenciasActuales} />
      )}
    </div>
  )
}
