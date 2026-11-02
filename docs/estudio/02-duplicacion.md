# Estudio de Duplicación y Estandarización (Fase 2)

## Resumen Ejecutivo

- **Grupos por eje:** Eje 1 (Acceso a datos): 2 · Eje 2 (Guards y helpers de sesión): 3 · Eje 3 (Resultados de actions): 3 · Eje 4 (Validación): 3 · Eje 5 (Formularios): 2 · Eje 6 (UI): 2 · Eje 7 (Formato): 2 · Eje 8 (Constantes): 1 · Eje 9 (Estilos): 1. Total: 19 grupos relevados.
- **Top 5 de mayor impacto:**
  1. Asimetría RLS vs Admin Client en mutaciones de perfil técnico (altas saltan RLS sin motivo; updates usan RLS).
  2. Deriva y bug en `revalidatePath` para notas privadas (`editarNota` no invalida la lista ni el postulante).
  3. Duplicación masiva de lógica y UI de notas privadas entre modal y panel de postulante.
  4. Disparidad de autenticación y códigos/formatos de error en Route Handlers (401 texto vs 401/403 JSON).
  5. Dispersión de `toLocaleDateString` sin helper canónico de fechas ni gestión de zona horaria.
- **Hallazgos registrados en `hallazgos.md`:** 20 hallazgos en el rango H-100 a H-119 (17 duplicaciones activas, 2 descartados [H-101 y H-106] y 1 bug por deriva en estado plausible [H-102], más H-200 P0 de seguridad detectado por revisor).

---

## 1. Acceso a datos

### Criterio Unificado Propuesto
- **Cuándo usar RLS con `createClient()`:** En todas las mutaciones donde la entidad pertenece al usuario actual (postulante o reclutador) y Postgres posee políticas RLS configuradas para ese rol (`perfil_postulante`, `perfil_reclutador`, `nota_privada`, y tablas técnicas como `formacion_academica`, `curso`, `experiencia_laboral`, `postulante_idioma`, `postulante_competencia`).
- **Cuándo usar `createAdminClient()` con verificación previa:** Exclusivamente en:
  1. Operaciones de catálogo global del sistema (`carrera`, `competencia`, `sector_industrial`) bajo `requireAdmin()`.
  2. Operaciones inter-rol o transiciones complejas con efectos colaterales fuera del alcance de las políticas del rol (`postulacion`, `historial_puesto`, `actividad`, `certificado_pdf`, `sesion_actividad`), precedidas SIEMPRE de verificación explícita de pertenencia (`getPostulacionPropia`, `esPuestoPropio`, `empresaDelReclutador`).

---

### Grupo 1.1: Asimetría RLS vs Admin Client en mutaciones de perfil técnico
- **Variantes:**
  - `src/modules/perfil-tecnico/actions.ts:112` (`agregarFormacion` usa `createAdminClient`)
  - `src/modules/perfil-tecnico/actions.ts:143` (`editarFormacion` usa `createClient` con RLS)
  - `src/modules/perfil-tecnico/actions.ts:159` (`eliminarFormacion` usa `createClient` con RLS)
  - `src/modules/perfil-tecnico/actions.ts:193` (`agregarCurso` usa `createAdminClient`)
  - `src/modules/perfil-tecnico/actions.ts:220` (`editarCurso` usa `createClient` con RLS)
  - `src/modules/perfil-tecnico/actions.ts:238` (`eliminarCurso` usa `createClient` con RLS)
  - `src/modules/perfil-tecnico/actions.ts:266` (`agregarExperiencia` usa `createAdminClient`)
  - `src/modules/perfil-tecnico/actions.ts:299` (`editarExperiencia` usa `createClient` con RLS)
  - `src/modules/perfil-tecnico/actions.ts:317` (`eliminarExperiencia` usa `createClient` con RLS)
  - `src/modules/perfil-tecnico/actions.ts:346` (`agregarIdioma` usa `createAdminClient`)
  - `src/modules/perfil-tecnico/actions.ts:361` (`eliminarIdioma` usa `createClient` con RLS)
  - `src/modules/perfil-tecnico/actions.ts:375` (`guardarCompetencias` usa `createAdminClient`)
- **Diferencias reales:** Deriva no intencional. Las tablas de formación, cursos, experiencias e idiomas tienen políticas RLS para postulante (`perfil_postulante_id`). Las funciones de alta recurren a `createAdminClient()` sin necesidad técnica, mientras que las de edición y eliminación usan `createClient()`.
- **Pieza canónica propuesta:** `createClient()` de `src/lib/supabase/server.ts:5`. Las funciones de alta deben insertar a través del cliente de usuario respetando RLS, eliminando el bypass de privilegios de servicio.
- **Consumidores a migrar:**
  - `src/modules/perfil-tecnico/actions.ts:112`
  - `src/modules/perfil-tecnico/actions.ts:193`
  - `src/modules/perfil-tecnico/actions.ts:266`
  - `src/modules/perfil-tecnico/actions.ts:346`
  - `src/modules/perfil-tecnico/actions.ts:375`
- **Riesgo:** Bajo. La base de datos ya cuenta con políticas RLS permisivas para postulantes autenticados sobre sus propios registros.
- **Comando de búsqueda:** `git grep -n -E "createAdminClient|createClient" src/modules/perfil-tecnico/actions.ts`

---

### Grupo 1.2: Acceso a datos dispar en notas privadas del reclutador
- **Variantes:**
  - `src/modules/postulantes/actions.ts:29` (`crearNota`: usa `getReclutadorId()` y luego `createAdminClient()` para insertar en `nota_privada`)
  - `src/modules/postulantes/actions.ts:81` (`editarNota`: usa `getReclutadorId()` y `createClient()` con RLS)
  - `src/modules/postulantes/actions.ts:96` (`eliminarNota`: usa `getReclutadorId()` y `createClient()` con RLS)
- **Diferencias reales:** Deriva por mezcla de responsabilidades. `crearNota` usa `createAdminClient()` porque además valida el puesto y llama a `marcarActividadPuesto()`, mientras que la inserción de la nota en sí no requiere service role ya que `nota_privada` posee políticas RLS para el `reclutador_id`.
- **Pieza canónica propuesta:** `createClient()` con RLS para la mutación en `nota_privada`. Mantener service role únicamente para las operaciones internas que trascienden la tabla (registro de actividad de puesto).
- **Consumidores a migrar:**
  - `src/modules/postulantes/actions.ts:29`
- **Riesgo:** Bajo.
- **Comando de búsqueda:** `git grep -n -E "createAdminClient|createClient" src/modules/postulantes/actions.ts`

---

## 2. Guards y helpers de sesión

### Grupo 2.1: Duplicación de `requireAdmin`
> **Nota de revisión:** Este grupo no cumple el criterio de estandarización del plan (requiere 3 o más repeticiones, o 2 si divergieron en comportamiento). Al ser solo 2 copias idénticas, el hallazgo H-106 queda descartado.

- **Variantes:**
  - `src/modules/admin/actions.ts:11`
  - `src/modules/admin/sessions.ts:8`
- **Diferencias reales:** Deriva por copia literal. Ambos archivos implementan exactamente la misma función privada:
  `async function requireAdmin() { const session = await verifySession(); if (session.rol !== 'ADMIN') throw new Error('Acceso denegado.'); return session; }`
- **Pieza canónica propuesta:** Exportar el helper en `src/lib/guards.ts:32` junto a `requireRol`, o unificar con `requireRol('ADMIN')`.
- **Consumidores a migrar:**
  - `src/modules/admin/actions.ts:11`
  - `src/modules/admin/sessions.ts:8`
- **Riesgo:** Bajo.
- **Comando de búsqueda:** `git grep -n "function requireAdmin" src/`

---

### Grupo 2.2: Obtención ad-hoc de `postulanteId` vs `getReclutadorId` memoizado
- **Variantes:**
  - `src/modules/perfil-tecnico/actions.ts:39` (función local privada `getPostulanteId()` sin cache)
  - `src/modules/postulaciones/actions.ts:112` (consulta manual a `perfil_postulante` en `verificarPostulanteConCertificado`)
  - `src/modules/certificado/actions.ts:20` (consulta manual repetida a `perfil_postulante`)
  - `src/modules/informe/actions.ts:25` (consulta manual repetida a `perfil_postulante`)
  - `src/modules/eneagrama/actions.ts:142` (consulta manual repetida a `perfil_postulante`)
  - (En contraste, para reclutadores existe `getReclutadorId` en `src/modules/empresas/queries.ts:49` con `cache()`)
- **Diferencias reales:** Deriva. Para reclutadores se diseñó una función memoizada compartida en más de 20 archivos, mientras que para postulantes cada módulo implementó lecturas directas repetidas sin memoización.
- **Pieza canónica propuesta:** Ya existe `getPerfilPostulanteActual` en `src/modules/perfil/queries.ts:34` memoizado con `cache()`. Se debe exportar en ese mismo módulo un helper análogo `getPostulanteId()` memoizado que reutilice dicha lectura.
- **Consumidores a migrar:**
  - `src/modules/perfil-tecnico/actions.ts:39`
  - `src/modules/postulaciones/actions.ts:112`
  - `src/modules/certificado/actions.ts:20`
  - `src/modules/informe/actions.ts:25`
  - `src/modules/eneagrama/actions.ts:142`
- **Riesgo:** Bajo.
- **Comando de búsqueda:** `git grep -n "from('perfil_postulante')" src/modules/`

---

### Grupo 2.3: Verificación dispar en Route Handlers (`getSessionUser` vs `createClient` + `getUsuarioAutenticado`)
- **Variantes:**
  - `src/app/api/admin/catalogos/export/route.ts:46` (usa `getSessionUser()`, devuelve 401 texto plano)
  - `src/app/api/admin/feedback/export/route.ts:67` (usa `getSessionUser()`, devuelve 401 texto plano)
  - `src/app/api/admin/preguntas/route.ts:10` (usa `createClient()` + `getUsuarioAutenticado(supabase)` + `rolDeUsuario(user)`, devuelve 401/403 JSON)
  - `src/app/api/certificado/descargar/[id]/route.ts:26` (usa `createClient()` + `getUsuarioAutenticado(supabase)`, devuelve 401 texto plano)
  - `src/app/api/informe/descargar/route.ts:14` (usa `createClient()` + `getUsuarioAutenticado(supabase)`, devuelve 401 texto plano)
  - `src/app/api/session/heartbeat/route.ts:9` (usa `createClient()` + `getUsuarioAutenticado(supabase)`, devuelve 401 JSON)
- **Diferencias reales:** Deriva. Unos endpoints usan la abstracción de sesión de alto nivel (`getSessionUser` en `src/lib/dal.ts:36`) y otros reconstruyen manualmente la lectura de claims. Además, divergen entre respuestas JSON (`NextResponse.json`) y respuestas de texto plano (`new Response`).
- **Pieza canónica propuesta:** `getSessionUser()` de `src/lib/dal.ts:36`. Estandarizar las respuestas de error no autenticado / no autorizado con payload JSON uniforme `{ error: string }`.
- **Consumidores a migrar:**
  - `src/app/api/admin/preguntas/route.ts:10`
  - `src/app/api/certificado/descargar/[id]/route.ts:26`
  - `src/app/api/informe/descargar/route.ts:14`
  - `src/app/api/session/heartbeat/route.ts:9`
  - `src/app/api/admin/catalogos/export/route.ts:46`
  - `src/app/api/admin/feedback/export/route.ts:67`
- **Riesgo:** Medio (unifica contrato HTTP de APIs existentes).
- **Comando de búsqueda:** `git grep -n -E "verifySession|getSessionUser|getUsuarioAutenticado" src/app/api/`

---

## 3. Resultados de actions

### Grupo 3.1: Deriva y rutas omitidas en `revalidatePath` para notas privadas (Bug)
- **Variantes:**
  - `src/modules/postulantes/actions.ts:61` (`crearNota`: revalida `/reclutador/postulantes/${postulanteId}` y `/reclutador/postulaciones`, pero omite `/reclutador/notas`)
  - `src/modules/postulantes/actions.ts:88` (`editarNota`: revalida únicamente `/reclutador/postulantes`, omitiendo `/reclutador/notas`, `/reclutador/postulaciones` y el detalle individual `${postulanteId}`)
  - `src/modules/postulantes/actions.ts:103` (`eliminarNota`: revalida `/reclutador/postulantes/${postulanteId}`, `/reclutador/postulaciones` y `/reclutador/notas`)
- **Diferencias reales:** Deriva y bug de sincronización. Si un reclutador edita una nota desde el panel `/reclutador/notas`, la pantalla NO se refresca porque falta `revalidatePath('/reclutador/notas')`. Tampoco se actualiza el modal de postulaciones ni la ficha del candidato.
- **Pieza canónica propuesta:** Centralizar la revalidación de notas en un helper interno que invalide simétricamente `/reclutador/notas`, `/reclutador/postulaciones` y `/reclutador/postulantes/${postulanteId}`.
- **Consumidores a migrar:**
  - `src/modules/postulantes/actions.ts:61`
  - `src/modules/postulantes/actions.ts:88`
  - `src/modules/postulantes/actions.ts:103`
- **Riesgo:** Bajo.
- **Comando de búsqueda:** `git grep -n "revalidatePath" src/modules/postulantes/actions.ts`

---

### Grupo 3.2: Desincronización en `revalidatePath` del ciclo de vida de puestos
- **Variantes:**
  - `src/modules/puestos/actions.ts:462` (`cerrarPuesto`: revalida `/reclutador/puestos` y `/reclutador/puestos/${puestoId}`, pero omite `/reclutador/postulaciones`)
  - `src/modules/puestos/actions.ts:509` (`eliminarPuesto`: revalida `/reclutador/puestos`, `/reclutador/postulaciones` y `/reclutador/puestos/${puestoId}`)
  - `src/modules/puestos/actions.ts:593` (`reactivarPuesto`: revalida `/reclutador/puestos` y `/reclutador/postulaciones`, pero omite `/reclutador/puestos/${puestoId}`)
- **Diferencias reales:** Deriva. Al cerrar un puesto las postulaciones pasan a estado cerrado pero la vista de postulaciones no se invalida. Al reactivar un puesto, la ficha individual del puesto en `/reclutador/puestos/[id]` no se invalida y sigue viéndose como cerrada.
- **Pieza canónica propuesta:** Conjunto canónico de revalidación para cambios de estado de puesto: invalidar `/reclutador/puestos`, `/reclutador/puestos/${puestoId}` y `/reclutador/postulaciones`.
- **Consumidores a migrar:**
  - `src/modules/puestos/actions.ts:462`
  - `src/modules/puestos/actions.ts:593`
- **Riesgo:** Bajo.
- **Comando de búsqueda:** `git grep -n "revalidatePath" src/modules/puestos/actions.ts`

---

### Grupo 3.3: Firmas de retorno adulteradas y queries expuestas como actions
- **Variantes:**
  - `src/modules/perfil-tecnico/actions.ts:412` (`guardarCompetenciasConCustom` retorna `Promise<ActionResult & { items?: ... }>` rompiendo la estructura canónica)
  - `src/modules/puestos/actions.ts:192` (`getPostulantesDePuesto` es una query pura en un archivo `'use server'` que retorna un array crudo)
  - `src/modules/puestos/actions.ts:519` (`contarPostulacionesDelUltimoCiclo` es una query pura que retorna `Promise<number>`)
  - `src/modules/ubicacion/actions.ts:14` y `19` (`cargarDepartamentos` y `cargarLocalidades` son lecturas de catálogo sin `ActionResult`)
- **Diferencias reales:** Deriva. `guardarCompetenciasConCustom` colocó la carga útil al nivel raíz del objeto en lugar de utilizar el genérico `ActionResult<T>` (propiedad `.data`). Además, funciones de solo lectura fueron colocadas en archivos `actions.ts` retornando valores directos sin envoltorio de error.
- **Advertencia crítica sobre cliente:** `cargarDepartamentos` (`src/modules/ubicacion/actions.ts:14`) y `cargarLocalidades` (`src/modules/ubicacion/actions.ts:19`) son consumidas directamente desde el componente cliente `src/components/shared/ubicacion-selector.tsx:85` y `src/components/shared/ubicacion-selector.tsx:92`. Moverlas a un archivo convencional de queries rompería la compilación y la ejecución, dado que los Client Components de Next.js requieren la directiva `'use server'` para invocar código de backend.
- **Pieza canónica propuesta:**
  - `getPostulantesDePuesto` y `contarPostulacionesDelUltimoCiclo`: mover a `src/modules/puestos/queries.ts:1` ya que solo son consumidas en el servidor.
  - `cargarDepartamentos` y `cargarLocalidades`: deben permanecer como Server Actions en `src/modules/ubicacion/actions.ts:1`, pero estandarizando su firma de retorno a `Promise<ActionResult<UbicacionOption[]>>` para respetar el contrato del sistema, adaptando a su consumidor `src/components/shared/ubicacion-selector.tsx:85` y `92` para desempaquetar `.data`.
  - `guardarCompetenciasConCustom`: estandarizar para retornar `Promise<ActionResult<{ items: { id: string; nombre: string; nivel: NivelCompetencia }[] }>>` de `src/lib/types/domain.ts:20`.
- **Consumidores a migrar:**
  - `src/modules/perfil-tecnico/actions.ts:409`
  - `src/modules/puestos/actions.ts:192`
  - `src/modules/puestos/actions.ts:519`
  - `src/modules/ubicacion/actions.ts:14`
  - `src/modules/ubicacion/actions.ts:19`
  - `src/components/shared/ubicacion-selector.tsx:85`
  - `src/components/shared/ubicacion-selector.tsx:92`
- **Riesgo:** Medio (requiere adaptar el componente cliente consumidor `UbicacionSelector`).
- **Comando de búsqueda:** `git grep -n "export async function" src/modules/*/actions.ts`

---

## 4. Validación

### Grupo 4.1: Expresión regular de UUID repetida
- **Variantes:**
  - `src/app/(acceso)/verificar/verify-form.tsx:8`
  - `src/modules/postulantes/queries.ts:10`
  - `src/modules/puestos/actions.ts:24`
- **Diferencias reales:** Copia textual idéntica:
  `const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
- **Pieza canónica propuesta:** Centralizar en `src/lib/utils.ts:6` o importar `z.string().uuid()` donde aplique Zod.
- **Consumidores a migrar:**
  - `src/app/(acceso)/verificar/verify-form.tsx:8`
  - `src/modules/postulantes/queries.ts:10`
  - `src/modules/puestos/actions.ts:24`
- **Riesgo:** Muy bajo.
- **Comando de búsqueda:** `git grep -n -E "\[0-9a-f\]\{8\}" src/`

---

### Grupo 4.2: Schemas de confirmación de contraseñas duplicados
- **Variantes:**
  - `src/modules/auth/schema.ts:44` (`nuevaPasswordSchema`: campos `password` y `confirmPassword`)
  - `src/modules/perfil/actions.ts:152` (`cambiarPasswordSchema`: campos `nueva_password` y `confirmar_password`)
  - `src/modules/auth/schema.ts:18` (`registroSchema`: refinamiento de coincidencia idéntico)
- **Diferencias reales:** Deriva en nombres de campos. Validan exactamente lo mismo (`passwordSchema` más igualdad de ambos valores), pero con nombres de atributos distintos.
- **Pieza canónica propuesta:** `nuevaPasswordSchema` en `src/modules/auth/schema.ts:44`.
- **Consumidores a migrar:**
  - `src/modules/perfil/actions.ts:152`
  - `src/components/shared/cambiar-password-form.tsx:12`
- **Riesgo:** Bajo.
- **Comando de búsqueda:** `git grep -n "passwordSchema" src/`

---

### Grupo 4.3: Validaciones manuales de catálogo vs Zod schemas
- **Variantes:**
  - `src/modules/admin/actions.ts:24` (`crearSector`: `formData.get('nombre_sector')?.toString().trim()`)
  - `src/modules/admin/actions.ts:65` (`crearCompetencia`: `formData.get('nombre')?.toString().trim()`)
  - `src/modules/admin/actions.ts:106` (`crearIdioma`: `formData.get('nombre')?.toString().trim()`)
  - `src/modules/admin/actions.ts:177` (`crearCarrera`: `formData.get('nombre')?.toString().trim()`)
  - `src/modules/admin/actions.ts:296` (`crearProvincia`: `formData.get('nombre')?.toString().trim()`)
- **Diferencias reales:** Deriva. Las acciones de administración no utilizan Zod y validan strings a mano de forma heterogénea (algunas limitan largo y otras no).
- **Pieza canónica propuesta:** Schema reutilizable Zod para nombres de catálogo (`catalogo_item_schema` a definir en el módulo admin).
- **Consumidores a migrar:**
  - `src/modules/admin/actions.ts:24`
  - `src/modules/admin/actions.ts:65`
  - `src/modules/admin/actions.ts:106`
  - `src/modules/admin/actions.ts:177`
  - `src/modules/admin/actions.ts:296`
- **Riesgo:** Bajo.
- **Comando de búsqueda:** `git grep -n "formData\.get" src/modules/admin/actions.ts`

---

## 5. Formularios

### Grupo 5.1: Reset de formulario mediante `useEffect` secundario
- **Variantes:**
  - `src/app/(admin)/admin/carreras/carreras-ui.tsx:24`
  - `src/app/(admin)/admin/competencias/competencias-ui.tsx:17`
  - `src/app/(admin)/admin/idiomas/idiomas-ui.tsx:17`
  - `src/app/(admin)/admin/sectores/sectores-ui.tsx:17`
  - `src/app/(admin)/admin/ubicaciones/ubicaciones-ui.tsx:32`
  - `src/components/shared/nueva-empresa-modal.tsx:90`
- **Diferencias reales:** Copia idéntica en 6 componentes:
  `useEffect(() => { if (state.success) formRef.current?.reset() }, [state])`
- **Pieza canónica propuesta:** `useFormAccion` de `src/components/perfil-tecnico/use-form-accion.ts:20`. Mover dicho hook a `src/components/shared/` para coordinar `useActionState` con callback `onSuccess` limpio sin efectos secundarios en el cliente.
- **Consumidores a migrar:**
  - `src/app/(admin)/admin/carreras/carreras-ui.tsx:21`
  - `src/app/(admin)/admin/competencias/competencias-ui.tsx:14`
  - `src/app/(admin)/admin/idiomas/idiomas-ui.tsx:14`
  - `src/app/(admin)/admin/sectores/sectores-ui.tsx:14`
  - `src/app/(admin)/admin/ubicaciones/ubicaciones-ui.tsx:28`
  - `src/components/shared/nueva-empresa-modal.tsx:87`
- **Riesgo:** Bajo.
- **Comando de búsqueda:** `git grep -n "formRef.current?.reset()" src/`

---

### Grupo 5.2: Redefinición constante de `initialState` para `ActionResult`
- **Variantes:**
  - `src/app/(admin)/admin/carreras/carreras-ui.tsx:16`
  - `src/app/(admin)/admin/competencias/competencias-ui.tsx:11`
  - `src/app/(admin)/admin/idiomas/idiomas-ui.tsx:11`
  - `src/app/(admin)/admin/sectores/sectores-ui.tsx:11`
  - `src/components/perfil-tecnico/form-estado.ts:3`
  - `src/components/shared/cambiar-password-form.tsx:10`
  - `src/app/(postulante)/postulante/mi-perfil/form.tsx:42`
- **Diferencias reales:** Copia literal de `const initialState: ActionResult = { success: false, error: '' }` en más de diez archivos.
- **Pieza canónica propuesta:** Exportar `INITIAL_ACTION_STATE` como constante estándar en `src/lib/types/domain.ts:20` junto a la definición de `ActionResult`.
- **Consumidores a migrar:**
  - `src/app/(admin)/admin/carreras/carreras-ui.tsx:16`
  - `src/app/(admin)/admin/competencias/competencias-ui.tsx:11`
  - `src/app/(admin)/admin/idiomas/idiomas-ui.tsx:11`
  - `src/app/(admin)/admin/sectores/sectores-ui.tsx:11`
  - `src/components/perfil-tecnico/form-estado.ts:3`
  - `src/components/shared/cambiar-password-form.tsx:10`
  - `src/app/(postulante)/postulante/mi-perfil/form.tsx:42`
- **Riesgo:** Muy bajo.
- **Comando de búsqueda:** `git grep -n "initialState.*success: false" src/`

---

## 6. UI

### Grupo 6.1: Títulos de página `<h1>` hardcodeados vs `<PageHeader>`
- **Variantes:**
  - `src/app/(reclutador)/reclutador/asistente/page.tsx:88`
  - `src/app/(reclutador)/reclutador/onboarding/page.tsx:15`
  - `src/app/(reclutador)/reclutador/puestos/[id]/asistente/page.tsx:59`
  - `src/app/(reclutador)/reclutador/asistente/loading.tsx:20`
  - `src/app/(reclutador)/reclutador/onboarding/loading.tsx:20`
  - `src/app/(reclutador)/reclutador/puestos/[id]/asistente/loading.tsx:29`
- **Diferencias reales:** En estas vistas se escribe `<h1 className="text-balance text-2xl font-extrabold leading-tight tracking-tight text-ink">` inline en vez de utilizar el componente estándar del design system `<PageHeader>`.
- **Pieza canónica propuesta:** `PageHeader` de `src/components/ui/page-header.tsx:21`.
- **Consumidores a migrar:**
  - `src/app/(reclutador)/reclutador/asistente/page.tsx:88`
  - `src/app/(reclutador)/reclutador/onboarding/page.tsx:15`
  - `src/app/(reclutador)/reclutador/puestos/[id]/asistente/page.tsx:59`
  - `src/app/(reclutador)/reclutador/asistente/loading.tsx:20`
  - `src/app/(reclutador)/reclutador/onboarding/loading.tsx:20`
  - `src/app/(reclutador)/reclutador/puestos/[id]/asistente/loading.tsx:29`
- **Riesgo:** Muy bajo.
- **Comando de búsqueda:** `git grep -n "<h1" src/app/`

---

### Grupo 6.2: Duplicación de lógica y vistas en gestión de notas privadas
- **Variantes:**
  - `src/app/(reclutador)/reclutador/postulaciones/notas-modal-btn.tsx:140`
  - `src/app/(reclutador)/reclutador/postulantes/[id]/notas-panel.tsx:120`
- **Diferencias reales:** Copia de ~80 líneas de código: manejo de estado de carga, edición en vuelo, listado de notas, confirmación de borrado y estados de guardado idénticos.
- **Pieza canónica propuesta:** Extraer un componente compartido de notas en `src/components/shared/` que acepte `postulanteId` y opcional `puestoId`.
- **Consumidores a migrar:**
  - `src/app/(reclutador)/reclutador/postulaciones/notas-modal-btn.tsx:140`
  - `src/app/(reclutador)/reclutador/postulantes/[id]/notas-panel.tsx:120`
- **Riesgo:** Medio.
- **Comando de búsqueda:** `git grep -n "getNotasDePostulante" src/app/`

---

## 7. Formato

### Grupo 7.1: Dispersión de `toLocaleDateString` sin helper canónico
- **Variantes:**
  - `src/app/(reclutador)/reclutador/notas/page.tsx:49` (`formatFecha` local con `month: 'short'`)
  - `src/app/(admin)/admin/tyc/tyc-ui.tsx:23` (`formatFecha` local con `month: '2-digit'`)
  - `src/app/(postulante)/postulante/certificado/certificado-ui.tsx:36` (`formatFecha` local con `month: 'long'`)
  - `src/app/(postulante)/postulante/informe/informe-feedback.tsx:81` (`formatFecha` local con `month: 'long'`)
  - `src/app/(postulante)/postulante/informe/informe-visor.tsx:46` (`formatFecha` local con `month: 'long'`)
  - Más de 30 invocaciones directas a `new Date(iso).toLocaleDateString('es-AR', ...)` en tablas y fichas.
- **Diferencias reales:** Deriva en presentación y riesgo de discrepancia de zona horaria entre servidor y cliente. Cada pantalla reimplementó un formateador de fechas ad-hoc.
- **Pieza canónica propuesta:** Helper canónico de formateo de fechas en `src/lib/` que soporte variantes (`corta`, `larga`, `mes_ano`) y fije la zona horaria en `es-AR`.
- **Consumidores a migrar:**
  - `src/app/(reclutador)/reclutador/notas/page.tsx:49`
  - `src/app/(admin)/admin/tyc/tyc-ui.tsx:23`
  - `src/app/(postulante)/postulante/certificado/certificado-ui.tsx:36`
  - `src/app/(postulante)/postulante/informe/informe-feedback.tsx:81`
  - `src/app/(postulante)/postulante/informe/informe-visor.tsx:46`
  - `src/app/(admin)/admin/carreras/page.tsx:71`
  - `src/app/(postulante)/postulante/postulaciones/page.tsx:86`
  - `src/app/(reclutador)/reclutador/puestos/page.tsx:156`
- **Riesgo:** Bajo.
- **Comando de búsqueda:** `git grep -n "toLocaleDateString" src/`

---

### Grupo 7.2: Construcción manual de etiquetas de ubicación vs `ubicacionLabel`
- **Variantes:**
  - `src/app/(admin)/admin/postulantes/page.tsx:188`
  - `src/app/(reclutador)/reclutador/postulantes/page.tsx:96`
  - (En contraste con `src/lib/ubicacion.ts:6` donde existe `ubicacionLabel`)
- **Diferencias reales:** Ambas páginas hacen manualmente `[localidad, provincia].filter(Boolean).join(', ')`, omitiendo el departamento si la localidad está vacía. `ubicacionLabel` ya resuelve esto con fallback al departamento.
- **Pieza canónica propuesta:** `ubicacionLabel` de `src/lib/ubicacion.ts:6`.
- **Consumidores a migrar:**
  - `src/app/(admin)/admin/postulantes/page.tsx:188`
  - `src/app/(reclutador)/reclutador/postulantes/page.tsx:96`
- **Riesgo:** Muy bajo.
- **Comando de búsqueda:** `git grep -n "nombre_provincia" src/app/`

---

## 8. Constantes

### Grupo 8.1: Redefinición y divergencia de labels y tonos de estado de postulación
- **Variantes:**
  - `src/lib/constants/enums.ts:20` (`ESTADO_POSTULACION_LABEL` contiene descripciones largas para emails)
  - `src/app/(postulante)/postulante/postulaciones/page.tsx:15` y `22` (define mapas locales `ESTADO_TONE` y `ESTADO_LABEL` con 'Enviada', 'Vista', etc.)
  - `src/app/(postulante)/postulante/postulaciones/filtros-postulaciones.tsx:16` (redefine array local de opciones)
  - `src/app/(reclutador)/reclutador/postulaciones/page.tsx:28` y `35` (redefine mapas locales `ESTADO_TONE` y `ESTADO_LABEL` con 'Sin evaluar', 'Evaluada', etc.)
  - `src/app/(reclutador)/reclutador/postulaciones/filtros-postulaciones.tsx:76` (redefine array local de opciones con etiquetas en plural)
- **Diferencias reales:** Deriva funcional y de presentación. Los tonos de badge se duplicaron idénticos en dos archivos, y las etiquetas para postulante vs reclutador se redefinen en cuatro componentes separados en lugar de importar una constante del dominio.
- **Pieza canónica propuesta:** Exportar en `src/lib/constants/enums.ts` los mapas canónicos de UI: `ESTADO_POSTULACION_LABEL_POSTULANTE`, `ESTADO_POSTULACION_LABEL_RECLUTADOR` y `ESTADO_POSTULACION_TONE`.
- **Consumidores a migrar:**
  - `src/app/(postulante)/postulante/postulaciones/page.tsx:15`
  - `src/app/(postulante)/postulante/postulaciones/filtros-postulaciones.tsx:16`
  - `src/app/(reclutador)/reclutador/postulaciones/page.tsx:28`
  - `src/app/(reclutador)/reclutador/postulaciones/filtros-postulaciones.tsx:76`
- **Riesgo:** Bajo.
- **Comando de búsqueda:** `git grep -n "ESTADO_POSTULACION\." src/app/`

---

## 9. Estilos

### Grupo 9.1: Clases inline repetidas para botones de acción en filas de datos
- **Variantes:**
  - `src/app/(reclutador)/reclutador/postulaciones/notas-modal-btn.tsx:204` (`p-1.5 rounded-md text-muted hover:text-ink hover:bg-neutral-200 transition-colors`)
  - `src/app/(reclutador)/reclutador/postulantes/[id]/notas-panel.tsx:182` (idéntico)
  - `src/app/(reclutador)/reclutador/notas/eliminar-nota-btn.tsx:38` (`p-1.5 rounded-md text-muted hover:text-error-ink hover:bg-error-bg transition-colors disabled:opacity-50`)
  - `src/app/(reclutador)/reclutador/postulaciones/notas-modal-btn.tsx:212` (idéntico)
  - `src/app/(reclutador)/reclutador/postulantes/[id]/notas-panel.tsx:190` (idéntico)
- **Diferencias reales:** En lugar de usar `Button` con variante `ghost` o `buttonClassName`, se repiten cadenas de clases manuales de Tailwind para acciones de edición y eliminación.
- **Pieza canónica propuesta:** `Button` de `src/components/ui/button.tsx:69` con `variant="ghost"` y tamaño compacto.
- **Consumidores a migrar:**
  - `src/app/(reclutador)/reclutador/postulaciones/notas-modal-btn.tsx:204`
  - `src/app/(reclutador)/reclutador/postulantes/[id]/notas-panel.tsx:182`
  - `src/app/(reclutador)/reclutador/notas/eliminar-nota-btn.tsx:38`
- **Riesgo:** Bajo.
- **Comando de búsqueda:** `git grep -n "p-1.5 rounded-md" src/`
