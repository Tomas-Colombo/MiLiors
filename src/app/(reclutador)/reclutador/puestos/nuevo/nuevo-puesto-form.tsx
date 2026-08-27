'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useActionState, useState } from 'react'
import { Field, Input, Textarea, FancySelect, SearchableSelect, Button, Alert, Modal } from '@/components/ui'
import { AlertTriangleIcon, PlusIcon } from '@/components/icons'
import { NuevaEmpresaModal } from '@/components/shared/nueva-empresa-modal'
import { UbicacionSelector, type ProvinciaOption } from '@/components/shared/ubicacion-selector'
import { CarrerasMultiSelect } from '@/components/shared/carreras-multi-select'
import { publicarPuesto } from '@/modules/puestos/actions'
import { cn } from '@/lib/utils'
import { DESCRIPCION_MAX } from '@/modules/puestos/schema'
import { CARGA_HORARIA_LABEL, UBICACION_LABEL, UBICACION, IDIOMAS_COMUNES } from '@/lib/constants/enums'
import type { ActionResult } from '@/lib/types/domain'
import type { CarreraOption } from '@/modules/carreras/queries'
import type { EmpresaOption } from '@/modules/empresas/queries'
import { FormularioPreselectorEditor } from '../formulario-preselector-editor'

type Props = {
  /** Empresas activas del reclutador: el puesto se publica para una de ellas. */
  empresas: EmpresaOption[]
  sectores: { id: string; nombre_sector: string }[]
  provincias: ProvinciaOption[]
  carreras: CarreraOption[]
  /** Período de inactividad configurado por el admin (para el copy del modal). */
  diasInactividad: number
}

// publicarPuesto returns ActionResult<{ puestoId: string }> — match the generic
const initialState: ActionResult<{ puestoId: string }> = { success: false, error: '' }

export function NuevoPuestoForm({ empresas, sectores, provincias, carreras, diasInactividad }: Props) {
  const router = useRouter()
  const [state, action, isPending] = useActionState(publicarPuesto, initialState)
  const [modalidad, setModalidad] = useState('')
  const [empresaModalAbierto, setEmpresaModalAbierto] = useState(false)
  // Empresas dadas de alta desde el modal. Se suman al select en el acto para
  // no depender de que la revalidación del server llegue antes de elegirlas.
  const [empresasNuevas, setEmpresasNuevas] = useState<EmpresaOption[]>([])
  // Campos controlados: al fallar la publicación, React 19 resetea los <input>
  // no controlados del form. Mantenerlos en estado preserva lo ya cargado para
  // que el reclutador solo corrija el campo con error. Los SearchableSelect
  // (carrera, idioma, ubicación) conservan su valor por su propio estado interno.
  const [values, setValues] = useState({
    // Con una sola empresa no hay nada que elegir: queda seleccionada de entrada.
    empresa_id: empresas.length === 1 ? empresas[0].id : '',
    titulo_puesto: '',
    descripcion_texto: '',
    sector_id: '',
    carga_horaria: '',
    nivel_experiencia: '',
    perfil_psicologico_deseado: '',
  })
  const setField =
    (campo: keyof typeof values) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValues((v) => ({ ...v, [campo]: e.target.value }))
  const setValor = (campo: keyof typeof values) => (val: string) =>
    setValues((v) => ({ ...v, [campo]: val }))

  // Tras publicar con éxito mostramos un modal de advertencia (no toast: requiere
  // acción del usuario). El botón —y cualquier cierre— navega al puesto creado.
  const puestoId = state.success ? state.data?.puestoId : undefined
  const irAlPuesto = () => {
    if (puestoId) router.push(`/reclutador/puestos/${puestoId}`)
  }

  const fieldErrors = !state.success && state.fieldErrors ? state.fieldErrors : {}
  // La ubicación se pide siempre salvo que la modalidad sea remota.
  const ubicacionAplica = modalidad !== UBICACION.REMOTO

  // La revalidación puede traer la recién creada también por props: se dedupe
  // por id para no listarla dos veces.
  const idsDePropo = new Set(empresas.map((e) => e.id))
  const empresaOptions = [
    ...empresas,
    ...empresasNuevas.filter((e) => !idsDePropo.has(e.id)),
  ].map((e) => ({ value: e.id, label: e.nombre_empresa }))

  function handleEmpresaCreada(empresa: EmpresaOption) {
    setEmpresasNuevas((lista) => [...lista, empresa])
    setValues((v) => ({ ...v, empresa_id: empresa.id }))
  }

  const sectorOptions = [
    { value: '', label: 'Sin sector' },
    ...sectores.map((s) => ({ value: s.id, label: s.nombre_sector })),
  ]

  const cargaOptions = Object.entries(CARGA_HORARIA_LABEL).map(([v, l]) => ({ value: v, label: l }))
  const ubicacionOptions = Object.entries(UBICACION_LABEL).map(([v, l]) => ({ value: v, label: l }))
  const idiomaOptions = IDIOMAS_COMUNES.filter((i) => i !== 'Otro').map((i) => ({ value: i, label: i }))

  return (
    <>
    <form action={action} className="space-y-5">
      {!state.success && state.error && (
        <Alert tone="error" title={state.error} />
      )}

      <Field
        label="Empresa"
        htmlFor="empresa_id"
        required
        error={fieldErrors.empresa_id?.[0]}
        hint="Para qué empresa se publica este puesto."
      >
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <FancySelect
              id="empresa_id"
              name="empresa_id"
              options={empresaOptions}
              value={values.empresa_id}
              onChange={setValor('empresa_id')}
              placeholder="Elegí la empresa"
            />
          </div>
          {/* Alta en modal: registrar una empresa nueva no debería costar perder
              lo ya cargado del puesto. */}
          <Button
            type="button"
            variant="secondary"
            leftIcon={<PlusIcon size={16} />}
            className="shrink-0"
            onClick={() => setEmpresaModalAbierto(true)}
          >
            Nueva
          </Button>
        </div>
      </Field>

      <Field
        label="Título del puesto"
        htmlFor="titulo_puesto"
        required
        error={fieldErrors.titulo_puesto?.[0]}
      >
        <Input
          id="titulo_puesto"
          name="titulo_puesto"
          value={values.titulo_puesto}
          onChange={setField('titulo_puesto')}
          placeholder="Ej: Desarrollador Frontend Senior"
          status={fieldErrors.titulo_puesto ? 'error' : 'default'}
        />
      </Field>

      <Field
        label="Descripción"
        htmlFor="descripcion_texto"
        error={fieldErrors.descripcion_texto?.[0]}
        hint={
          <span className="flex items-baseline justify-between gap-3">
            <span>Describí las responsabilidades y requisitos.</span>
            <span
              className={cn(
                'shrink-0 tabular-nums',
                values.descripcion_texto.length >= DESCRIPCION_MAX && 'text-error',
              )}
            >
              {values.descripcion_texto.length} / {DESCRIPCION_MAX}
            </span>
          </span>
        }
      >
        <Textarea
          id="descripcion_texto"
          name="descripcion_texto"
          value={values.descripcion_texto}
          onChange={setField('descripcion_texto')}
          placeholder="Describí el puesto, responsabilidades y perfil buscado…"
          rows={12}
          maxLength={DESCRIPCION_MAX}
          className="min-h-[180px] resize-y"
          status={fieldErrors.descripcion_texto ? 'error' : 'default'}
        />
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field
          label="Sector"
          htmlFor="sector_id"
          error={fieldErrors.sector_id?.[0]}
        >
          <FancySelect
            id="sector_id"
            name="sector_id"
            options={sectorOptions}
            value={values.sector_id}
            onChange={setValor('sector_id')}
          />
        </Field>

        <Field
          label="Carreras (opcional)"
          hint="Elegí una o varias. Ayuda a que los postulantes encuentren tu puesto al filtrar por carrera."
        >
          <CarrerasMultiSelect
            name="carrera_ids"
            options={carreras}
            placeholder="Agregá una o más carreras…"
          />
        </Field>

        <Field
          label="Idioma (opcional)"
          error={fieldErrors.idioma?.[0]}
        >
          <SearchableSelect
            name="idioma"
            options={idiomaOptions}
            placeholder="Elegí un idioma…"
          />
        </Field>

        <Field
          label="Carga horaria"
          htmlFor="carga_horaria"
          required
          error={fieldErrors.carga_horaria?.[0]}
        >
          <FancySelect
            id="carga_horaria"
            name="carga_horaria"
            options={cargaOptions}
            placeholder="Seleccioná la carga horaria"
            value={values.carga_horaria}
            onChange={setValor('carga_horaria')}
          />
        </Field>

        <Field
          label="Modalidad"
          htmlFor="ubicacion"
          required
          error={fieldErrors.ubicacion?.[0]}
        >
          <FancySelect
            id="ubicacion"
            name="ubicacion"
            options={ubicacionOptions}
            placeholder="Seleccioná la modalidad"
            value={modalidad}
            onChange={setModalidad}
          />
        </Field>

        <Field
          label="Nivel de experiencia"
          htmlFor="nivel_experiencia"
          error={fieldErrors.nivel_experiencia?.[0]}
        >
          <Input
            id="nivel_experiencia"
            name="nivel_experiencia"
            value={values.nivel_experiencia}
            onChange={setField('nivel_experiencia')}
            placeholder="Ej: 3+ años, Junior, Senior"
            status={fieldErrors.nivel_experiencia ? 'error' : 'default'}
          />
        </Field>
      </div>

      {/* Ubicación geográfica: solo si la modalidad no es remota */}
      {ubicacionAplica && (
        <UbicacionSelector
          provincias={provincias}
          required
          nivelRequerido="departamento"
          error={fieldErrors.departamento_id?.[0]}
        />
      )}

      <Field
        label="Notas privadas sobre el puesto"
        htmlFor="perfil_psicologico_deseado"
        error={fieldErrors.perfil_psicologico_deseado?.[0]}
        hint="Solo visible para vos. Los postulantes nunca verán este campo."
      >
        <Textarea
          id="perfil_psicologico_deseado"
          name="perfil_psicologico_deseado"
          value={values.perfil_psicologico_deseado}
          onChange={setField('perfil_psicologico_deseado')}
          rows={3}
          status={fieldErrors.perfil_psicologico_deseado ? 'error' : 'default'}
        />
      </Field>

      <div className="border-t border-neutral-100 pt-5">
        <FormularioPreselectorEditor fieldErrors={fieldErrors} />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Link
          href="/reclutador/puestos"
          className="inline-flex h-10 items-center rounded-md border border-neutral-300 bg-surface px-[18px] text-sm font-semibold text-ink-soft hover:bg-neutral-50"
        >
          Cancelar
        </Link>
        <Button type="submit" loading={isPending}>
          Publicar puesto
        </Button>
      </div>
    </form>

    <NuevaEmpresaModal
      open={empresaModalAbierto}
      onClose={() => setEmpresaModalAbierto(false)}
      onCreada={handleEmpresaCreada}
    />

    <Modal
      open={!!puestoId}
      onClose={irAlPuesto}
      icon={
        <span
          className="flex h-11 w-11 items-center justify-center rounded-full"
          style={{ backgroundColor: '#FEF3C7' }}
        >
          <AlertTriangleIcon size={22} strokeWidth={2} style={{ color: '#F59E0B' }} />
        </span>
      }
      title="Tu puesto fue publicado"
      footer={
        <Button className="flex-1" onClick={irAlPuesto}>
          Entendido, ir al puesto
        </Button>
      }
    >
      <p>Los postulantes ya pueden encontrar esta búsqueda.</p>
      <p className="mt-3">
        ⚠️ Tené en cuenta que si no registramos actividad tuya en este puesto durante{' '}
        <strong>{diasInactividad} días</strong> (revisar postulaciones, cambiar estados o
        editar el puesto), lo pausaremos automáticamente para no mantener búsquedas sin
        atención activa.
      </p>
    </Modal>
    </>
  )
}
